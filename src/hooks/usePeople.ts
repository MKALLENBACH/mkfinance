import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Person = Database['public']['Tables']['people']['Row']
type InsertPerson = Database['public']['Tables']['people']['Insert']
type UpdatePerson = Database['public']['Tables']['people']['Update']

export function usePeople() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.people,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Person[]
    },
    enabled: !!user,
  })
}

export function useCreatePerson() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (person: Omit<InsertPerson, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('people')
        .insert([{ ...person, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Pessoa/Empresa criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.people })
    },
    onError: (error) => {
      toast.error(`Erro ao criar pessoa/empresa: ${error.message}`)
    },
  })
}

export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePerson & { id: string }) => {
      const { data, error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Pessoa/Empresa atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.people })
      invalidateFinanceData(queryClient) // Invalidates transactions as well
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar pessoa/empresa: ${error.message}`)
    },
  })
}

export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are transactions linked
      const { count: txCount, error: txError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('person_id', id)
        
      if (txError) throw txError
      
      if (txCount && txCount > 0) {
        throw new Error('Não é possível excluir uma pessoa que possui lançamentos vinculados.')
      }
      
      // Also check if there are debts linked
      const { count: debtCount, error: debtError } = await supabase
        .from('debts')
        .select('*', { count: 'exact', head: true })
        .eq('creditor_id', id)
        
      if (debtError) throw debtError
      
      if (debtCount && debtCount > 0) {
        throw new Error('Não é possível excluir uma pessoa que possui dívidas vinculadas.')
      }

      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Pessoa/Empresa excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.people })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
