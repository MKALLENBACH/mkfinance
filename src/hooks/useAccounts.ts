import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Account = Database['public']['Tables']['financial_accounts']['Row']
type InsertAccount = Database['public']['Tables']['financial_accounts']['Insert']
type UpdateAccount = Database['public']['Tables']['financial_accounts']['Update']

export function useAccounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Account[]
    },
    enabled: !!user,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (account: Omit<InsertAccount, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('financial_accounts')
        .insert([{ ...account, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Conta criada com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao criar conta: ${error.message}`)
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAccount & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Conta atualizada com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar conta: ${error.message}`)
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are transactions linked
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)
        
      if (countError) throw countError
      
      if (count && count > 0) {
        throw new Error('Não é possível excluir uma conta que possui lançamentos vinculados. Inative-a em vez disso.')
      }

      const { error } = await supabase
        .from('financial_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Conta excluída com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
