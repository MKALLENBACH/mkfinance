import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Debt = Database['public']['Tables']['debts']['Row']
type InsertDebt = Database['public']['Tables']['debts']['Insert']
type UpdateDebt = Database['public']['Tables']['debts']['Update']

export function useDebts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.debts,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('debts')
        .select(`
          *,
          creditor:people(name)
        `)
        .order('priority', { ascending: false })
        .order('current_amount', { ascending: false })

      if (error) throw error
      return data as (Debt & { creditor: { name: string } | null })[]
    },
    enabled: !!user,
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (debt: Omit<InsertDebt, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Create the debt
      const { data, error } = await supabase
        .from('debts')
        .insert([{ ...debt, user_id: user.id }])
        .select()
        .single()

      if (error) throw error

      // 2. If a monthly payment is set, auto-create all upcoming expense transactions
      if (data && data.monthly_payment && data.monthly_payment > 0) {
        const today = new Date()
        const dueDay = data.due_day || today.getDate()

        let currentAmount = data.current_amount
        let monthlyPayment = data.monthly_payment
        let numInstallments = Math.ceil(currentAmount / monthlyPayment)
        if (numInstallments > 360) numInstallments = 360

        const transactionsToInsert = []
        let currentMonthOffset = 0
        
        // Initial check: if due day this month already passed, start from next month
        const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
        if (thisMonthDate < today) {
           currentMonthOffset = 1
        }

        for (let i = 1; i <= numInstallments; i++) {
          let amount = monthlyPayment
          if (i === numInstallments) {
              const remainder = currentAmount - (monthlyPayment * (numInstallments - 1))
              if (remainder > 0 && remainder <= monthlyPayment) {
                  amount = remainder
              }
          }

          // Calculate date
          const targetMonth = today.getMonth() + currentMonthOffset + (i - 1)
          let date = new Date(today.getFullYear(), targetMonth, dueDay)
          // Handle day overflow (e.g., Feb 31 -> Mar 3 -> fix to Feb 28/29)
          if (date.getDate() !== dueDay) {
             date = new Date(today.getFullYear(), targetMonth + 1, 0)
          }

          const dueDateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')

          transactionsToInsert.push({
            user_id: user.id,
            type: 'despesa' as const,
            description: `Parcela ${i}/${numInstallments}: ${data.name}`,
            amount: amount,
            due_date: dueDateStr,
            status: 'em_aberto' as const,
            is_fixed: true,
            person_id: data.creditor_id || null,
            notes: `Gerado automaticamente pela dívida: ${data.name}`,
            installment_group_id: data.id,
            installment_number: i,
            installment_total: numInstallments
          })
        }

        if (transactionsToInsert.length > 0) {
          await supabase.from('transactions').insert(transactionsToInsert)
        }
      }

      return data
    },
    onSuccess: () => {
      toast.success('Dívida registrada! Lançamento de despesa criado automaticamente.')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao registrar dívida: ${error.message}`)
    },
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateDebt & { id: string }) => {
      const { data, error } = await supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Dívida atualizada com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar dívida: ${error.message}`)
    },
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete pending transactions related to this debt
      await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', id)
        .eq('status', 'em_aberto')

      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Dívida excluída com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useRegisterDebtPayment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ 
      debtId, 
      accountId, 
      amount, 
      description,
      currentDebtAmount
    }: { 
      debtId: string, 
      accountId: string, 
      amount: number,
      description: string,
      currentDebtAmount: number
    }) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Find the oldest pending installment for this debt
      const { data: pendingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('installment_group_id', debtId)
        .eq('status', 'em_aberto')
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (pendingTx) {
        // Update the existing pending transaction
        const { error: txError } = await supabase
          .from('transactions')
          .update({
            amount,
            paid_at: new Date().toISOString().split('T')[0],
            status: 'paga',
            account_id: accountId,
          })
          .eq('id', pendingTx.id)
        if (txError) throw txError
      } else {
        // Create a new paid expense transaction if no pending installment is found
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{
            user_id: user.id,
            type: 'despesa',
            description,
            amount,
            due_date: new Date().toISOString().split('T')[0],
            paid_at: new Date().toISOString().split('T')[0],
            status: 'paga',
            account_id: accountId,
            installment_group_id: debtId,
          }])
        if (txError) throw txError
      }

      // 2. Reduce the debt amount
      const newAmount = Math.max(0, currentDebtAmount - amount)
      
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .update({ 
          current_amount: newAmount,
          status: newAmount <= 0 ? 'quitada' : undefined 
        })
        .eq('id', debtId)
        .select()
        .single()

      if (debtError) throw debtError

      return { debt: debtData, isPaidOff: newAmount <= 0 }
    },
    onSuccess: (data) => {
      if (data.isPaidOff) {
        toast.success('Dívida quitada com sucesso! Parabéns!')
      } else {
        toast.success('Pagamento registrado com sucesso!')
      }
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao registrar pagamento: ${error.message}`)
    },
  })
}
