import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDateBR(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
  
  if (!isValid(date)) return '-'
  
  return format(date, 'dd/MM/yyyy')
}

export function formatMonthYear(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
  
  if (!isValid(date)) return '-'
  
  const formatted = format(date, 'MMMM/yyyy', { locale: ptBR })
  // Capitalize first letter of month
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function getMonthYearString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}
