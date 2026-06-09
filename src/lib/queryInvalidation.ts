import { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  people: ['people'] as const,
  transactions: ['transactions'] as const,
  debts: ['debts'] as const,
  goals: ['goals'] as const,
  monthlyPlan: ['monthlyPlan'] as const,
  dashboard: ['dashboard'] as const,
  cashFlow: ['cashFlow'] as const,
  reports: ['reports'] as const,
}

export function invalidateFinanceData(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
  queryClient.invalidateQueries({ queryKey: queryKeys.debts })
  queryClient.invalidateQueries({ queryKey: queryKeys.goals })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  queryClient.invalidateQueries({ queryKey: queryKeys.cashFlow })
  queryClient.invalidateQueries({ queryKey: queryKeys.reports })
  queryClient.invalidateQueries({ queryKey: queryKeys.monthlyPlan })
}
