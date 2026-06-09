import { useState } from 'react'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL } from '@/lib/formatters'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { Database } from '@/integrations/supabase/types'

type Account = Database['public']['Tables']['financial_accounts']['Row']

export function Accounts() {
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Account>>({})

  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.is_active ? acc.current_balance : 0), 0) || 0

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      name: '',
      type: 'corrente',
      initial_balance: 0,
      is_active: true
    })
  }

  const handleEdit = (account: Account) => {
    setIsEditing(account.id)
    setFormData(account)
  }

  const handleSave = () => {
    if (!formData.name || !formData.type) return

    if (isEditing === 'new') {
      createAccount.mutate({
        name: formData.name,
        type: formData.type as any,
        initial_balance: formData.initial_balance || 0,
        current_balance: formData.initial_balance || 0,
        is_active: formData.is_active ?? true
      }, {
        onSuccess: () => setIsEditing(null)
      })
    } else if (isEditing) {
      updateAccount.mutate({
        id: isEditing,
        name: formData.name,
        type: formData.type as any,
        is_active: formData.is_active
      }, {
        onSuccess: () => setIsEditing(null)
      })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta? Isso só será possível se não houver lançamentos vinculados a ela.')) {
      deleteAccount.mutate(id)
    }
  }

  const handleToggleActive = (account: Account) => {
    updateAccount.mutate({
      id: account.id,
      is_active: !account.is_active
    })
  }

  if (isLoading) {
    return <div className="p-6">Carregando contas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total (Contas Ativas)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-balance">{formatCurrencyBRL(totalBalance)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Cadastradas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Minhas Contas</h2>
        <Button onClick={handleCreate} disabled={isEditing !== null}>
          <Plus className="mr-2 h-4 w-4" /> Nova Conta
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEditing === 'new' && (
              <TableRow>
                <TableCell>
                  <Input 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Nome da conta"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.type || 'corrente'}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="corrente">Conta Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="digital">Digital</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="investimento">Investimento</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.initial_balance || ''} 
                    onChange={e => setFormData({...formData, initial_balance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center rounded-full bg-finance-income/10 px-2.5 py-0.5 text-xs font-medium text-finance-income">
                    Ativa
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={createAccount.isPending}>Salvar</Button>
                </TableCell>
              </TableRow>
            )}

            {accounts?.map((account) => (
              isEditing === account.id ? (
                <TableRow key={account.id}>
                  <TableCell>
                    <Input 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.type || 'corrente'}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Poupança</option>
                      <option value="digital">Digital</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao">Cartão de Crédito</option>
                      <option value="investimento">Investimento</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {/* Saldo atual não pode ser editado diretamente aqui, pois depende de transações */}
                    {formatCurrencyBRL(account.current_balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button 
                      onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        formData.is_active 
                          ? 'bg-finance-income/10 text-finance-income hover:bg-finance-income/20' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {formData.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateAccount.isPending}>Salvar</Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="capitalize">{account.type}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    account.current_balance >= 0 ? 'text-finance-balance' : 'text-finance-expense'
                  }`}>
                    {formatCurrencyBRL(account.current_balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button 
                      onClick={() => handleToggleActive(account)}
                      title="Clique para alternar o status"
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer ${
                        account.is_active 
                          ? 'bg-finance-income/10 text-finance-income hover:bg-finance-income/20' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {account.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            ))}

            {accounts?.length === 0 && isEditing !== 'new' && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma conta cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
