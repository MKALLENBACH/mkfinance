import { useState, useMemo } from 'react'
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useAccounts, useDefaultAccount } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { usePeople } from '@/hooks/usePeople'
import { useRegisterDebtPayment } from '@/hooks/useDebts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { Plus, Pencil, Trash2, CheckCircle2, Search, Filter, ArrowUpDown, TrendingUp, Clock, DollarSign, X } from 'lucide-react'
import { PaymentConfirmationModal } from '@/components/PaymentConfirmationModal'

export function Revenues() {
  const { data: transactions, isLoading } = useTransactions('receita')
  const { data: accounts } = useAccounts()
  const [defaultAccountId] = useDefaultAccount()
  const { data: categories } = useCategories()
  const { data: people } = usePeople()
  
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const registerDebtPayment = useRegisterDebtPayment()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [txToConfirmPayment, setTxToConfirmPayment] = useState<any | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterCategory, setFilterCategory] = useState<string>('todos')
  const [filterAccount, setFilterAccount] = useState<string>('todos')
  const todayStr = new Date().toISOString().split('T')[0]
  const [filterDateFrom, setFilterDateFrom] = useState(todayStr)
  const [filterDateTo, setFilterDateTo] = useState(todayStr)
  const [sortField, setSortField] = useState<'due_date' | 'amount' | 'description'>('due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    let result = [...transactions]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category?.name?.toLowerCase().includes(term) ||
        t.account?.name?.toLowerCase().includes(term) ||
        t.person?.name?.toLowerCase().includes(term)
      )
    }
    if (filterStatus !== 'todos') {
      result = result.filter(t => t.status === filterStatus)
    }
    if (filterCategory !== 'todos') {
      result = result.filter(t => t.category_id === filterCategory)
    }
    if (filterAccount !== 'todos') {
      result = result.filter(t => t.account_id === filterAccount)
    }
    if (filterDateFrom) {
      result = result.filter(t => t.due_date >= filterDateFrom)
    }
    if (filterDateTo) {
      result = result.filter(t => t.due_date <= filterDateTo)
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'due_date') cmp = a.due_date.localeCompare(b.due_date)
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [transactions, searchTerm, filterStatus, filterCategory, filterAccount, filterDateFrom, filterDateTo, sortField, sortDir])

  const toggleSort = (field: 'due_date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('todos')
    setFilterCategory('todos')
    setFilterAccount('todos')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const hasActiveFilters = searchTerm || filterStatus !== 'todos' || filterCategory !== 'todos' || filterAccount !== 'todos' || filterDateFrom || filterDateTo

  // Summary calculations
  const totalRecebidas = useMemo(() => filteredTransactions.filter(t => t.status === 'recebida').reduce((s, t) => s + t.amount, 0), [filteredTransactions])
  const totalPrevistas = useMemo(() => filteredTransactions.filter(t => t.status === 'prevista').reduce((s, t) => s + t.amount, 0), [filteredTransactions])
  const totalGeral = useMemo(() => filteredTransactions.reduce((s, t) => s + t.amount, 0), [filteredTransactions])

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      type: 'receita',
      description: '',
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: 'prevista',
      account_id: defaultAccountId || accounts?.[0]?.id || null,
      category_id: categories?.find(c => c.type === 'receita')?.id || null,
      person_id: null
    })
  }

  const handleEdit = (tx: any) => {
    setIsEditing(tx.id)
    setFormData({
      ...tx,
      account_id: tx.account_id || '',
      category_id: tx.category_id || '',
      person_id: tx.person_id || ''
    })
  }

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0 || !formData.due_date) return

    const payload = {
      type: 'receita' as const,
      description: formData.description,
      amount: formData.amount,
      due_date: formData.due_date,
      status: formData.status as any,
      account_id: formData.account_id || null,
      category_id: formData.category_id || null,
      person_id: formData.person_id || null,
      paid_at: formData.status === 'recebida' ? (formData.paid_at || formData.due_date) : null
    }

    if (isEditing === 'new') {
      createTx.mutate(payload, { onSuccess: () => setIsEditing(null) })
    } else if (isEditing) {
      updateTx.mutate({ id: isEditing, ...payload }, { onSuccess: () => setIsEditing(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta receita? Se ela já foi recebida, o saldo da conta será revertido.')) {
      deleteTx.mutate(id)
    }
  }

  const markAsReceived = (tx: any) => {
    setTxToConfirmPayment(tx)
  }

  const handleConfirmPayment = (data: { realAmount: number; accountId: string; paidAt: string }) => {
    if (!txToConfirmPayment) return

    const isDebt = !!txToConfirmPayment.installment_group_id && txToConfirmPayment.is_fixed
    if (isDebt) {
      registerDebtPayment.mutate({
        debtId: txToConfirmPayment.installment_group_id,
        transactionId: txToConfirmPayment.id,
        accountId: data.accountId,
        amount: data.realAmount,
        description: txToConfirmPayment.description,
        paidAt: data.paidAt,
        currentDebtAmount: 0 // Será calculado no hook buscando do banco
      }, {
        onSuccess: () => setTxToConfirmPayment(null)
      })
    } else {
      updateTx.mutate({
        id: txToConfirmPayment.id,
        status: 'recebida',
        paid_at: data.paidAt,
        amount: data.realAmount,
        account_id: data.accountId
      }, {
        onSuccess: () => setTxToConfirmPayment(null)
      })
    }
  }

  if (isLoading) {
    return <div className="p-6">Carregando receitas...</div>
  }

  const revenueCategories = categories?.filter(c => c.type === 'receita') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Receitas</h2>
          <p className="text-muted-foreground text-sm mt-1">Controle de entradas financeiras</p>
        </div>
        
        <Button onClick={handleCreate} disabled={isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-finance-income/30 bg-finance-income/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-income">Total Recebido</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-finance-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-income">{formatCurrencyBRL(totalRecebidas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(totalPrevistas)}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrencyBRL(totalGeral)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descrição, categoria, conta..." 
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showFilters ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {hasActiveFilters && <span className="ml-2 rounded-full bg-primary-foreground text-primary w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="prevista">Prevista</option>
                <option value="recebida">Recebida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="todos">Todas</option>
                {revenueCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input type="date" className="h-9" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input type="date" className="h-9" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </Card>

      {/* Form (create/edit) */}
      {isEditing && (
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle>{isEditing === 'new' ? 'Nova Receita' : 'Editar Receita'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input 
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Salário, Freelance..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor</label>
              <Input 
                type="number" step="0.01"
                value={formData.amount || ''} 
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Prevista</label>
              <Input 
                type="date"
                value={formData.due_date || ''} 
                onChange={e => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category_id || ''}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Selecione...</option>
                {revenueCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.account_id || ''}
                onChange={e => setFormData({...formData, account_id: e.target.value})}
              >
                <option value="">Nenhuma...</option>
                {accounts?.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status || 'prevista'}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="prevista">Prevista</option>
                <option value="recebida">Recebida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pessoa</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.person_id || ''}
                onChange={e => setFormData({...formData, person_id: e.target.value})}
              >
                <option value="">Nenhuma...</option>
                {people?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 p-6 pt-0">
            <Button variant="outline" onClick={() => setIsEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTx.isPending || updateTx.isPending}>
              Salvar
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredTransactions.length} resultado{filteredTransactions.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtrado)' : ''}
          </span>
          <span className="text-sm font-medium">
            Total exibido: <span className="text-finance-income">{formatCurrencyBRL(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</span>
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium" onClick={() => toggleSort('due_date')}>
                  Data {sortField === 'due_date' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium" onClick={() => toggleSort('description')}>
                  Descrição {sortField === 'description' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                </Button>
              </TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="h-8 -mr-3 font-medium" onClick={() => toggleSort('amount')}>
                  Valor {sortField === 'amount' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                </Button>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => (
              <TableRow key={tx.id} className={tx.status === 'cancelada' ? 'opacity-50' : ''}>
                <TableCell>{formatDateBR(tx.due_date)}</TableCell>
                <TableCell className="font-medium">
                  {tx.description}
                  {tx.person && <span className="ml-2 text-xs text-muted-foreground">({tx.person.name})</span>}
                </TableCell>
                <TableCell>
                  {tx.category ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.category.color || '#ccc' }} />
                      {tx.category.name}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell>{tx.account?.name || '-'}</TableCell>
                <TableCell className="text-right font-medium text-finance-income">
                  {formatCurrencyBRL(tx.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tx.status === 'recebida' ? 'bg-finance-income/10 text-finance-income' :
                    tx.status === 'prevista' ? 'bg-finance-balance/10 text-finance-balance' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {tx.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {tx.status === 'prevista' && (
                    <Button variant="ghost" size="icon" onClick={() => markAsReceived(tx)} className="text-finance-income hover:bg-finance-income/10 hover:text-finance-income" title="Marcar como recebida">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(tx)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {hasActiveFilters ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Nenhuma receita encontrada.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <PaymentConfirmationModal 
        isOpen={txToConfirmPayment !== null}
        onClose={() => setTxToConfirmPayment(null)}
        onConfirm={handleConfirmPayment}
        transaction={txToConfirmPayment}
        type="receita"
      />
    </div>
  )
}
