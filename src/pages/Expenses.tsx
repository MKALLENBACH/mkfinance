import { useState } from 'react'
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { usePeople } from '@/hooks/usePeople'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { Plus, Pencil, Trash2, CheckCircle2, ArrowUpFromLine, AlertCircle } from 'lucide-react'
import { isBefore, startOfDay, parseISO } from 'date-fns'

export function Expenses() {
  const { data: transactions, isLoading } = useTransactions('despesa')
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const { data: people } = usePeople()
  
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})

  const today = startOfDay(new Date())

  // Dynamic status logic for UI
  const getDisplayStatus = (tx: any) => {
    if (tx.status === 'paga' || tx.status === 'cancelada') return tx.status
    const dueDate = parseISO(tx.due_date)
    return isBefore(dueDate, today) ? 'atrasada' : tx.status
  }

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      type: 'despesa',
      description: '',
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      status: 'em_aberto',
      account_id: accounts?.[0]?.id || null,
      category_id: categories?.find(c => c.type === 'despesa')?.id || null,
      person_id: null,
      priority: 'media'
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
      type: 'despesa' as const,
      description: formData.description,
      amount: formData.amount,
      due_date: formData.due_date,
      status: formData.status as any,
      account_id: formData.account_id || null,
      category_id: formData.category_id || null,
      person_id: formData.person_id || null,
      priority: formData.priority || 'media',
      paid_at: formData.status === 'paga' ? (formData.paid_at || formData.due_date) : null
    }

    if (isEditing === 'new') {
      createTx.mutate(payload, { onSuccess: () => setIsEditing(null) })
    } else if (isEditing) {
      updateTx.mutate({ id: isEditing, ...payload }, { onSuccess: () => setIsEditing(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa? Se ela já foi paga, o saldo da conta será revertido.')) {
      deleteTx.mutate(id)
    }
  }

  const markAsPaid = (tx: any) => {
    if (!tx.account_id) {
      alert('Para marcar como paga, é necessário vincular uma conta financeira na edição.')
      return
    }
    
    updateTx.mutate({
      id: tx.id,
      status: 'paga',
      paid_at: new Date().toISOString().split('T')[0]
    })
  }

  if (isLoading) {
    return <div className="p-6">Carregando despesas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Despesas</h2>
          <p className="text-muted-foreground text-sm mt-1">Controle de gastos e pagamentos</p>
        </div>
        
        <Button onClick={handleCreate} disabled={isEditing !== null} variant="destructive">
          <Plus className="mr-2 h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEditing === 'new' && (
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input 
                    type="date"
                    value={formData.due_date || ''} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.category_id || ''}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {categories?.filter(c => c.type === 'despesa').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.account_id || ''}
                    onChange={e => setFormData({...formData, account_id: e.target.value})}
                  >
                    <option value="">Nenhuma conta...</option>
                    {accounts?.filter(a => a.is_active).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="text-right"
                    value={formData.amount || ''} 
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status || 'em_aberto'}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="em_aberto">Em Aberto</option>
                    <option value="paga">Paga</option>
                    <option value="atrasada">Atrasada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={createTx.isPending}>Salvar</Button>
                </TableCell>
              </TableRow>
            )}

            {transactions?.map((tx) => {
              const displayStatus = getDisplayStatus(tx)
              
              return isEditing === tx.id ? (
                <TableRow key={tx.id} className="bg-muted/30">
                  <TableCell>
                    <Input 
                      type="date"
                      value={formData.due_date || ''} 
                      onChange={e => setFormData({...formData, due_date: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={formData.description || ''} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.category_id || ''}
                      onChange={e => setFormData({...formData, category_id: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {categories?.filter(c => c.type === 'despesa').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.account_id || ''}
                      onChange={e => setFormData({...formData, account_id: e.target.value})}
                    >
                      <option value="">Nenhuma conta...</option>
                      {accounts?.filter(a => a.is_active).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      step="0.01"
                      className="text-right"
                      value={formData.amount || ''} 
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.status || 'em_aberto'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="em_aberto">Em Aberto</option>
                      <option value="paga">Paga</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateTx.isPending}>Salvar</Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={tx.id} className={tx.status === 'cancelada' ? 'opacity-50' : ''}>
                  <TableCell className={displayStatus === 'atrasada' ? 'text-finance-overdue font-medium' : ''}>
                    {formatDateBR(tx.due_date)}
                  </TableCell>
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
                  <TableCell className="text-right font-medium text-finance-expense">
                    {formatCurrencyBRL(tx.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      displayStatus === 'paga' ? 'bg-finance-income/10 text-finance-income' :
                      displayStatus === 'atrasada' ? 'bg-finance-overdue/10 text-finance-overdue border border-finance-overdue/20' :
                      displayStatus === 'em_aberto' ? 'bg-finance-expense/10 text-finance-expense' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {displayStatus === 'atrasada' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {displayStatus.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {(displayStatus === 'em_aberto' || displayStatus === 'atrasada') && (
                      <Button variant="ghost" size="icon" onClick={() => markAsPaid(tx)} className="text-finance-income hover:bg-finance-income/10 hover:text-finance-income" title="Marcar como paga">
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
              )
            })}

            {transactions?.length === 0 && isEditing !== 'new' && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
