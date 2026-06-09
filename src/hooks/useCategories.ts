import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type InsertCategory = Database['public']['Tables']['categories']['Insert']
type UpdateCategory = Database['public']['Tables']['categories']['Update']

export function useCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Category[]
    },
    enabled: !!user,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (category: Omit<InsertCategory, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('categories')
        .insert([{ ...category, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Categoria criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
    onError: (error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`)
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCategory & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Categoria atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      invalidateFinanceData(queryClient) // Invalidates transactions as well
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are transactions linked
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
        
      if (countError) throw countError
      
      if (count && count > 0) {
        throw new Error('Não é possível excluir uma categoria que possui lançamentos vinculados. Inative-a em vez disso.')
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Categoria excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
