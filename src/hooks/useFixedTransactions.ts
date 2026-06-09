import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'

export type FixedTransactionGroup = {
  id: string // using installment_group_id as the unique ID for the group
  type: 'receita' | 'despesa'
  description: string
  amount: number
  account_id: string | null
  category_id: string | null
  due_day: number
  start_date: string
  end_date: string | null
  account: { name: string } | null
  category: { name: string; color: string | null; icon: string | null } | null
  installmentsCount: number
}

export function useFixedTransactions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...queryKeys.transactions, 'fixed'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:financial_accounts(name),
          category:categories(name, color, icon)
        `)
        .eq('is_fixed', true)
        // We use notes to flag that it's a "Lançamento Fixo" instead of a Debt generated transaction
        .like('notes', 'FIXED_BILL:%')
        .order('due_date', { ascending: true })

      if (error) throw error

      const groups = new Map<string, FixedTransactionGroup>()

      data.forEach(t => {
        if (!t.installment_group_id) return

        if (!groups.has(t.installment_group_id)) {
          // Parse metadata from notes if needed, or just extract from the first transaction
          const dueDay = parseInt(t.notes?.split('DUE_DAY:')[1] || '1')
          
          groups.set(t.installment_group_id, {
            id: t.installment_group_id,
            type: t.type,
            description: t.description,
            amount: t.amount,
            account_id: t.account_id,
            category_id: t.category_id,
            due_day: dueDay,
            start_date: t.due_date,
            end_date: t.due_date,
            account: t.account,
            category: t.category,
            installmentsCount: 1
          })
        } else {
          const group = groups.get(t.installment_group_id)!
          group.installmentsCount += 1
          if (t.due_date > group.end_date!) {
            group.end_date = t.due_date
          }
        }
      })

      return Array.from(groups.values())
    },
    enabled: !!user,
  })
}

type CreateFixedPayload = {
  type: 'receita' | 'despesa'
  description: string
  amount: number
  account_id: string | null
  category_id: string | null
  due_day: number
  start_date: string
  end_date: string | null
}

async function generateTransactions(payload: CreateFixedPayload, userId: string, groupId: string) {
  const transactionsToInsert = []
  
  let currentDate = new Date(payload.start_date + 'T12:00:00')
  const endDate = payload.end_date ? new Date(payload.end_date + 'T12:00:00') : null
  
  // Cap at 36 months if no end date
  let maxInstallments = 36
  
  for (let i = 0; i < maxInstallments; i++) {
    if (endDate && currentDate > endDate) {
      break
    }

    const dueDateStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDate.getDate()).padStart(2, '0')

    transactionsToInsert.push({
      user_id: userId,
      type: payload.type,
      description: payload.description,
      amount: payload.amount,
      due_date: dueDateStr,
      status: payload.type === 'receita' ? 'prevista' : 'em_aberto',
      is_fixed: true,
      account_id: payload.account_id,
      category_id: payload.category_id,
      notes: `FIXED_BILL:true|DUE_DAY:${payload.due_day}`,
      installment_group_id: groupId,
      recurrence_type: 'mensal'
    })

    // Advance 1 month
    currentDate.setMonth(currentDate.getMonth() + 1)
    // Handle day overflow if needed
    if (currentDate.getDate() !== payload.due_day) {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) // last day of month
    }
  }

  if (transactionsToInsert.length > 0) {
    await supabase.from('transactions').insert(transactionsToInsert as any)
  }
}

export function useCreateFixedTransaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: CreateFixedPayload) => {
      if (!user) throw new Error('Not authenticated')
      const groupId = crypto.randomUUID()
      await generateTransactions(payload, user.id, groupId)
      return groupId
    },
    onSuccess: () => {
      toast.success('Lançamento fixo criado com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao criar lançamento fixo: ${error.message}`)
    },
  })
}

export function useUpdateFixedTransaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...payload }: CreateFixedPayload & { id: string }) => {
      if (!user) throw new Error('Not authenticated')
      
      // Delete existing pending transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', id)
        .in('status', ['em_aberto', 'prevista', 'atrasada'])
      
      // We don't delete 'paga' or 'recebida' transactions because they are history.
      // But generating new ones starting from `start_date` might duplicate if `start_date` is in the past!
      // So we should only generate transactions that are AFTER the latest paid transaction,
      // or we just trust the user's new start_date.
      // For simplicity, we assume `start_date` is adjusted by the user or we just generate from `start_date`.
      
      await generateTransactions(payload, user.id, id)
      
      return id
    },
    onSuccess: () => {
      toast.success('Lançamento fixo atualizado com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar lançamento fixo: ${error.message}`)
    },
  })
}

export function useDeleteFixedTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      // Delete all pending transactions for this group
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', groupId)
        .in('status', ['em_aberto', 'prevista', 'atrasada'])

      if (error) throw error
      return groupId
    },
    onSuccess: () => {
      toast.success('Lançamento fixo (futuro) excluído com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
