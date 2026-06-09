import { useState } from 'react'
import { 
  useDebts, 
  useCreateDebt, 
  useUpdateDebt, 
  useDeleteDebt, 
  useRegisterDebtPayment 
} from '@/hooks/useDebts'
import { useAccounts } from '@/hooks/useAccounts'
import { usePeople } from '@/hooks/usePeople'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { calcularPercentualQuitado } from '@/lib/financeMath'
import { Plus, Pencil, Trash2, Banknote, AlertTriangle } from 'lucide-react'

export function Debts() {
  const { data: debts, isLoading } = useDebts()
  const { data: accounts } = useAccounts()
  const { data: people } = usePeople()
  
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()
  const deleteDebt = useDeleteDebt()
  const registerPayment = useRegisterDebtPayment()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState({ amount: 0, accountId: '' })

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      name: '',
      original_amount: 0,
      current_amount: 0,
      status: 'ativa',
      priority: 'media',
      creditor_id: null,
      monthly_payment: null,
      due_day: null,
      start_date: null,
      target_payoff_date: null
    })
  }

  const handleEdit = (debt: any) => {
    setIsEditing(debt.id)
    setFormData(debt)
  }

  const handleSave = () => {
    if (!formData.name || formData.original_amount <= 0 || formData.current_amount < 0) return

    const payload = {
      name: formData.name,
      original_amount: formData.original_amount,
      current_amount: formData.current_amount,
      status: formData.status as any,
      priority: formData.priority as any,
      creditor_id: formData.creditor_id || null,
      monthly_payment: formData.monthly_payment || null,
      due_day: formData.due_day ? parseInt(formData.due_day) : null,
      start_date: formData.start_date || null,
      target_payoff_date: formData.target_payoff_date || null
    }

    if (isEditing === 'new') {
      createDebt.mutate(payload, { onSuccess: () => setIsEditing(null) })
    } else if (isEditing) {
      updateDebt.mutate({ id: isEditing, ...payload }, { onSuccess: () => setIsEditing(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida? Isso não excluirá os pagamentos já registrados (que são despesas normais).')) {
      deleteDebt.mutate(id)
    }
  }

  const handleRegisterPayment = (debt: any) => {
    if (!paymentData.accountId || paymentData.amount <= 0) {
      alert('Selecione uma conta e informe um valor maior que zero.')
      return
    }

    registerPayment.mutate({
      debtId: debt.id,
      accountId: paymentData.accountId,
      amount: paymentData.amount,
      description: `Pagamento Dívida: ${debt.name}`,
      currentDebtAmount: debt.current_amount
    }, {
      onSuccess: () => {
        setPaymentDebtId(null)
        setPaymentData({ amount: 0, accountId: '' })
      }
    })
  }

  if (isLoading) {
    return <div className="p-6">Carregando dívidas...</div>
  }

  const totalAtivo = debts?.filter(d => d.status !== 'quitada').reduce((acc, d) => acc + d.current_amount, 0) || 0
  const parcelasMensais = debts?.filter(d => d.status !== 'quitada').reduce((acc, d) => acc + (d.monthly_payment || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dívidas e Empréstimos</h2>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe e quite suas obrigações</p>
        </div>
        
        <Button onClick={handleCreate} disabled={isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Nova Dívida
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-finance-overdue/30 bg-finance-overdue/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-overdue">Total Pendente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-finance-overdue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-overdue">{formatCurrencyBRL(totalAtivo)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carga Mensal (Parcelas)</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBRL(parcelasMensais)}</div>
          </CardContent>
        </Card>
      </div>

      {isEditing && (
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle>{isEditing === 'new' ? 'Nova Dívida' : 'Editar Dívida'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Credor</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.creditor_id || ''}
                onChange={e => setFormData({...formData, creditor_id: e.target.value})}
              >
                <option value="">Nenhum credor...</option>
                {people?.filter(p => p.type === 'credor' || p.type === 'empresa').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Original</label>
              <Input 
                type="number" step="0.01"
                value={formData.original_amount || ''} 
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0
                  setFormData(prev => ({
                    ...prev, 
                    original_amount: val,
                    current_amount: isEditing === 'new' ? val : prev.current_amount
                  }))
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Restante Atual</label>
              <Input 
                type="number" step="0.01"
                value={formData.current_amount || ''} 
                onChange={e => setFormData({...formData, current_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da Parcela (Mensal/Semanal)</label>
              <Input 
                type="number" step="0.01"
                placeholder="Valor da parcela"
                value={formData.monthly_payment || ''} 
                onChange={e => setFormData({...formData, monthly_payment: parseFloat(e.target.value) || null})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequência / Vencimento</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.due_day || ''} 
                onChange={e => setFormData({...formData, due_day: e.target.value})}
              >
                <option value="">Selecione...</option>
                <optgroup label="Mensal">
                  {[...Array(31)].map((_, i) => (
                    <option key={`m-${i+1}`} value={i+1}>Todo dia {i+1} do mês</option>
                  ))}
                </optgroup>
                <optgroup label="Semanal">
                  <option value="101">Toda Segunda-feira</option>
                  <option value="102">Toda Terça-feira</option>
                  <option value="103">Toda Quarta-feira</option>
                  <option value="104">Toda Quinta-feira</option>
                  <option value="105">Toda Sexta-feira</option>
                  <option value="106">Todo Sábado</option>
                  <option value="100">Todo Domingo</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da 1ª Parcela (opcional)</label>
              <Input 
                type="date"
                value={formData.start_date || ''} 
                onChange={e => setFormData({...formData, start_date: e.target.value || null})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Alvo para Quitação (opcional)</label>
              <Input 
                type="date"
                value={formData.target_payoff_date || ''} 
                onChange={e => setFormData({...formData, target_payoff_date: e.target.value || null})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status || 'ativa'}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="ativa">Ativa</option>
                <option value="atrasada">Atrasada</option>
                <option value="pausada">Pausada</option>
                <option value="quitada">Quitada</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.priority || 'media'}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createDebt.isPending || updateDebt.isPending}>Salvar</Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {debts?.map((debt) => {
          const perc = calcularPercentualQuitado(debt.original_amount, debt.current_amount)
          
          return (
            <Card key={debt.id} className={`flex flex-col ${debt.status === 'quitada' ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{debt.name}</CardTitle>
                    {debt.creditor && <p className="text-sm text-muted-foreground mt-1">Credor: {debt.creditor.name}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(debt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(debt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Restante</p>
                    <p className="text-2xl font-bold text-finance-overdue">{formatCurrencyBRL(debt.current_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Original</p>
                    <p className="font-medium text-muted-foreground">{formatCurrencyBRL(debt.original_amount)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{perc.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-finance-income transition-all" 
                      style={{ width: `${Math.min(100, Math.max(0, perc))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                  {debt.monthly_payment && (
                    <div>
                      <p className="text-muted-foreground text-xs">Parcela Mensal</p>
                      <p className="font-medium">{formatCurrencyBRL(debt.monthly_payment)}</p>
                    </div>
                  )}
                  {debt.target_payoff_date && (
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Previsão</p>
                      <p className="font-medium">{formatDateBR(debt.target_payoff_date)}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    debt.status === 'quitada' ? 'bg-finance-income/10 text-finance-income' :
                    debt.status === 'atrasada' ? 'bg-finance-overdue/10 text-finance-overdue border border-finance-overdue/20' :
                    'bg-muted text-foreground'
                  }`}>
                    {debt.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    debt.priority === 'critica' ? 'bg-destructive/10 text-destructive' :
                    debt.priority === 'alta' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {debt.priority}
                  </span>
                </div>
              </CardContent>

              {debt.status !== 'quitada' && (
                <CardFooter className="pt-0 flex-col gap-3">
                  {paymentDebtId === debt.id ? (
                    <div className="w-full space-y-3 bg-muted/50 p-3 rounded-lg border">
                      <p className="text-sm font-medium">Registrar Pagamento</p>
                      <div className="space-y-2">
                        <Input 
                          type="number" step="0.01" placeholder="Valor pago"
                          value={paymentData.amount || ''}
                          onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                        />
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={paymentData.accountId}
                          onChange={e => setPaymentData({...paymentData, accountId: e.target.value})}
                        >
                          <option value="">Selecione a conta paga...</option>
                          {accounts?.filter(a => a.is_active).map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setPaymentDebtId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => handleRegisterPayment(debt)} disabled={registerPayment.isPending}>
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="w-full" variant="secondary" onClick={() => {
                      setPaymentDebtId(debt.id)
                      setPaymentData({ amount: debt.monthly_payment || 0, accountId: accounts?.[0]?.id || '' })
                    }}>
                      Registrar Pagamento Parcial
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>

      {debts?.length === 0 && !isEditing && (
        <Card className="p-12 text-center text-muted-foreground">
          <Banknote className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma dívida cadastrada.</p>
        </Card>
      )}
    </div>
  )
}
