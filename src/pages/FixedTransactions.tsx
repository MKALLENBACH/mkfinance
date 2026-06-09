import { useState } from 'react'
import { 
  useFixedTransactions, 
  useCreateFixedTransaction, 
  useUpdateFixedTransaction, 
  useDeleteFixedTransaction 
} from '@/hooks/useFixedTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { Plus, Pencil, Trash2, Repeat, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export function FixedTransactions() {
  const { data: fixedGroups, isLoading } = useFixedTransactions()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  
  const createFixed = useCreateFixedTransaction()
  const updateFixed = useUpdateFixedTransaction()
  const deleteFixed = useDeleteFixedTransaction()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})

  const handleCreate = () => {
    setIsEditing('new')
    const today = new Date()
    setFormData({
      type: 'despesa',
      description: '',
      amount: 0,
      account_id: '',
      category_id: '',
      due_day: today.getDate(),
      start_date: today.toISOString().split('T')[0],
      end_date: null
    })
  }

  const handleEdit = (group: any) => {
    setIsEditing(group.id)
    setFormData({
      ...group,
      account_id: group.account_id || '',
      category_id: group.category_id || '',
      start_date: group.start_date || '',
      end_date: group.end_date || ''
    })
  }

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0 || !formData.start_date) return

    const payload = {
      type: formData.type as 'receita' | 'despesa',
      description: formData.description,
      amount: formData.amount,
      account_id: formData.account_id || null,
      category_id: formData.category_id || null,
      due_day: parseInt(formData.due_day),
      start_date: formData.start_date,
      end_date: formData.end_date || null
    }

    if (isEditing === 'new') {
      createFixed.mutate(payload, { onSuccess: () => setIsEditing(null) })
    } else if (isEditing) {
      updateFixed.mutate({ id: isEditing, ...payload }, { onSuccess: () => setIsEditing(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir as ocorrências futuras deste lançamento fixo?')) {
      deleteFixed.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="p-6">Carregando lançamentos fixos...</div>
  }

  const totalDespesas = fixedGroups?.filter(g => g.type === 'despesa').reduce((acc, g) => acc + g.amount, 0) || 0
  const totalReceitas = fixedGroups?.filter(g => g.type === 'receita').reduce((acc, g) => acc + g.amount, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lançamentos Fixos</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie receitas e despesas recorrentes</p>
        </div>
        
        <Button onClick={handleCreate} disabled={isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Novo Fixo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-finance-expense/30 bg-finance-expense/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-expense">Total de Despesas Fixas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-finance-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-expense">{formatCurrencyBRL(totalDespesas)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-finance-income/30 bg-finance-income/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-income">Total de Receitas Fixas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-finance-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-income">{formatCurrencyBRL(totalReceitas)}</div>
          </CardContent>
        </Card>
      </div>

      {isEditing && (
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle>{isEditing === 'new' ? 'Novo Lançamento Fixo' : 'Editar Lançamento Fixo'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="despesa">Despesa (Sai todo mês)</option>
                <option value="receita">Receita (Entra todo mês)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome / Descrição</label>
              <Input 
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor</label>
              <Input 
                type="number" step="0.01"
                value={formData.amount || ''} 
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dia de Vencimento</label>
              <Input 
                type="number" min={1} max={31}
                value={formData.due_day || ''} 
                onChange={e => setFormData({...formData, due_day: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Início (1ª parcela)</label>
              <Input 
                type="date"
                value={formData.start_date || ''} 
                onChange={e => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim (Opcional)</label>
              <Input 
                type="date"
                value={formData.end_date || ''} 
                onChange={e => setFormData({...formData, end_date: e.target.value || null})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta Padrão</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.account_id || ''}
                onChange={e => setFormData({...formData, account_id: e.target.value})}
              >
                <option value="">Nenhuma...</option>
                {accounts?.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category_id || ''}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Nenhuma...</option>
                {categories?.filter(c => c.type === formData.type).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 p-6 pt-0">
            <Button variant="outline" onClick={() => setIsEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createFixed.isPending || updateFixed.isPending}>
              Salvar
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fixedGroups?.map(group => (
          <Card key={group.id} className="flex flex-col relative overflow-hidden transition-all hover:shadow-md">
            <div className={`absolute top-0 left-0 w-1 h-full ${group.type === 'receita' ? 'bg-finance-income' : 'bg-finance-expense'}`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{group.description}</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    {group.category && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold">
                        {group.category.name}
                      </span>
                    )}
                    <span className="flex items-center text-xs">
                      <Repeat className="mr-1 h-3 w-3" />
                      Dia {group.due_day}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className={`text-xl font-bold ${group.type === 'receita' ? 'text-finance-income' : 'text-finance-expense'}`}>
                {group.type === 'receita' ? '+' : '-'}{formatCurrencyBRL(group.amount)}
              </div>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <div><strong>Início:</strong> {formatDateBR(group.start_date)}</div>
                {group.end_date && <div><strong>Fim:</strong> {formatDateBR(group.end_date)}</div>}
                {!group.end_date && <div><strong>Fim:</strong> Indeterminado</div>}
                <div><strong>Conta:</strong> {group.account?.name || 'Não definida'}</div>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </div>
          </Card>
        ))}

        {fixedGroups?.length === 0 && !isEditing && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <Repeat className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>Nenhum lançamento fixo cadastrado.</p>
            <Button variant="link" onClick={handleCreate} className="mt-2">
              Criar o primeiro
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
