import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Goal = Database['public']['Tables']['goals']['Row']
type InsertGoal = Database['public']['Tables']['goals']['Insert']
type UpdateGoal = Database['public']['Tables']['goals']['Update']

export function useGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('target_date', { ascending: true })

      if (error) throw error
      return data as Goal[]
    },
    enabled: !!user,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (goal: Omit<InsertGoal, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Meta criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
    onError: (error) => {
      toast.error(`Erro ao criar meta: ${error.message}`)
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateGoal & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Meta atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`)
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Meta excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
