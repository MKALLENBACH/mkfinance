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

      const { data, error } = await supabase
        .from('debts')
        .insert([{ ...debt, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Dívida registrada com sucesso!')
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

      // 1. Create a paid expense transaction
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
        }])

      if (txError) throw txError

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
