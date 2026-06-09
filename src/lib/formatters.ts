export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '0%'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100) // Assuming value is passed as e.g. 50 for 50%
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0
  
  // Remove tudo que não for dígito
  const digitsOnly = value.replace(/\D/g, '')
  if (!digitsOnly) return 0
  
  // Converte para número e divide por 100 para ter as casas decimais corretas
  return parseInt(digitsOnly, 10) / 100
}

export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    // Para datas YYYY-MM-DD, evita problemas de timezone adicionando meio-dia ou tratando como UTC
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`)
    return new Intl.DateTimeFormat('pt-BR').format(date)
  } catch (e) {
    return '-'
  }
}
