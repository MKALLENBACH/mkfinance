import { useState } from 'react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { calcularPercentualQuitado } from '@/lib/financeMath'
import { Plus, Pencil, Trash2, Target, TrendingUp } from 'lucide-react'

export function Goals() {
  const { data: goals, isLoading } = useGoals()
  
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      name: '',
      target_amount: 0,
      current_amount: 0,
      status: 'em_andamento',
    })
  }

  const handleEdit = (goal: any) => {
    setIsEditing(goal.id)
    setFormData(goal)
  }

  const handleSave = () => {
    if (!formData.name || formData.target_amount <= 0 || formData.current_amount < 0) return

    const payload = {
      name: formData.name,
      target_amount: formData.target_amount,
      current_amount: formData.current_amount,
      status: formData.status as any,
      target_date: formData.target_date || null
    }

    if (isEditing === 'new') {
      createGoal.mutate(payload, { onSuccess: () => setIsEditing(null) })
    } else if (isEditing) {
      updateGoal.mutate({ id: isEditing, ...payload }, { onSuccess: () => setIsEditing(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      deleteGoal.mutate(id)
    }
  }

  const handleAddFunds = (goal: any, amount: number) => {
    const newAmount = goal.current_amount + amount
    const newStatus = newAmount >= goal.target_amount ? 'concluida' : goal.status
    
    updateGoal.mutate({
      id: goal.id,
      current_amount: newAmount,
      status: newStatus
    })
  }

  if (isLoading) {
    return <div className="p-6">Carregando metas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas Financeiras</h2>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe seus objetivos e sonhos</p>
        </div>
        
        <Button onClick={handleCreate} disabled={isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {isEditing && (
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle>{isEditing === 'new' ? 'Nova Meta' : 'Editar Meta'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Objetivo</label>
              <Input 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Viagem, Carro Novo, Reserva..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Alvo (Opcional)</label>
              <Input 
                type="date"
                value={formData.target_date || ''} 
                onChange={e => setFormData({...formData, target_date: e.target.value || null})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Necessário (Meta)</label>
              <Input 
                type="number" step="0.01"
                value={formData.target_amount || ''} 
                onChange={e => setFormData({...formData, target_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Já Guardado</label>
              <Input 
                type="number" step="0.01"
                value={formData.current_amount || ''} 
                onChange={e => setFormData({...formData, current_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status || 'em_andamento'}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="em_andamento">Em Andamento</option>
                <option value="pausada">Pausada</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createGoal.isPending || updateGoal.isPending}>Salvar</Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => {
          const perc = calcularPercentualQuitado(goal.target_amount, goal.current_amount)
          const isCompleted = goal.status === 'concluida' || perc >= 100
          
          return (
            <Card key={goal.id} className={`flex flex-col transition-all ${isCompleted ? 'border-finance-income/50 bg-finance-income/5' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className={`h-5 w-5 ${isCompleted ? 'text-finance-income' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(goal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Guardado</p>
                    <p className={`text-2xl font-bold ${isCompleted ? 'text-finance-income' : ''}`}>
                      {formatCurrencyBRL(goal.current_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Meta</p>
                    <p className="font-medium text-muted-foreground">{formatCurrencyBRL(goal.target_amount)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={isCompleted ? 'text-finance-income' : 'text-muted-foreground'}>
                      {isCompleted ? 'Concluída!' : 'Progresso'}
                    </span>
                    <span className={isCompleted ? 'text-finance-income' : ''}>{perc.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isCompleted ? 'bg-finance-income' : 'bg-finance-balance'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, perc))}%` }}
                    />
                  </div>
                  {!isCompleted && goal.target_amount > goal.current_amount && (
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Falta {formatCurrencyBRL(goal.target_amount - goal.current_amount)}
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    goal.status === 'concluida' ? 'bg-finance-income/10 text-finance-income' :
                    goal.status === 'pausada' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-finance-balance/10 text-finance-balance'
                  }`}>
                    {goal.status.replace('_', ' ')}
                  </span>
                  
                  {goal.target_date && (
                    <div className="text-right text-muted-foreground text-xs">
                      Alvo: {formatDateBR(goal.target_date)}
                    </div>
                  )}
                </div>
              </CardContent>

              {!isCompleted && (
                <CardFooter className="pt-0">
                  <div className="flex w-full gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-finance-income border-finance-income/20 hover:bg-finance-income/10"
                      onClick={() => {
                        const val = prompt('Quanto você quer adicionar a esta meta?')
                        if (val && !isNaN(Number(val))) handleAddFunds(goal, Number(val))
                      }}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>

      {goals?.length === 0 && !isEditing && (
        <Card className="p-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma meta cadastrada. Sonhe grande e comece a poupar!</p>
        </Card>
      )}
    </div>
  )
}
