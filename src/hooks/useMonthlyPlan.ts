import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type MonthlyPlan = Database['public']['Tables']['monthly_plans']['Row']
type InsertMonthlyPlan = Database['public']['Tables']['monthly_plans']['Insert']

export function useMonthlyPlan(year: number, month: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...queryKeys.monthlyPlan, year, month],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('monthly_plans')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()

      if (error) throw error
      return data as MonthlyPlan | null
    },
    enabled: !!user,
  })
}

export function useSaveMonthlyPlan() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (plan: Omit<InsertMonthlyPlan, 'user_id' | 'id'> & { id?: string }) => {
      if (!user) throw new Error('Not authenticated')

      if (plan.id) {
        // Update
        const { data, error } = await supabase
          .from('monthly_plans')
          .update(plan)
          .eq('id', plan.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Insert
        const { data, error } = await supabase
          .from('monthly_plans')
          .insert([{ ...plan, user_id: user.id }])
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: (data) => {
      toast.success('Planejamento salvo com sucesso!')
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyPlan })
    },
    onError: (error) => {
      toast.error(`Erro ao salvar planejamento: ${error.message}`)
    },
  })
}
