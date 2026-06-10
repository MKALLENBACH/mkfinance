import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type InsertTransaction = Database['public']['Tables']['transactions']['Insert']
type UpdateTransaction = Database['public']['Tables']['transactions']['Update']

export function useTransactions(type?: 'receita' | 'despesa') {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...queryKeys.transactions, type],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('transactions')
        .select(`
          *,
          account:financial_accounts(name),
          category:categories(name, color, icon, ignore_in_totals),
          person:people(name)
        `)
        .order('due_date', { ascending: false })

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) throw error
      return data as (Transaction & {
        account: { name: string } | null,
        category: { name: string, color: string | null, icon: string | null, ignore_in_totals: boolean | null } | null,
        person: { name: string } | null
      })[]
    },
    enabled: !!user,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (transaction: Omit<InsertTransaction, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      toast.success(variables.type === 'receita' ? 'Receita criada com sucesso!' : 'Despesa criada com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao criar lançamento: ${error.message}`)
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTransaction & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Lançamento atualizado com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar lançamento: ${error.message}`)
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Lançamento excluído com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
