import { useState } from 'react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { Database } from '@/integrations/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']

export function Categories() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Category>>({})
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all')

  const filteredCategories = categories?.filter(c => 
    filterType === 'all' ? true : c.type === filterType
  )

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      name: '',
      type: 'despesa',
      color: '#ef4444',
      is_active: true,
      ignore_in_totals: false
    })
  }

  const handleEdit = (category: Category) => {
    setIsEditing(category.id)
    setFormData(category)
  }

  const handleSave = () => {
    if (!formData.name || !formData.type) return

    const categoryColor = formData.type === 'receita' ? '#22c55e' : '#ef4444'

    if (isEditing === 'new') {
      createCategory.mutate({
        name: formData.name,
        type: formData.type as any,
        color: categoryColor,
        icon: formData.icon || null,
        is_active: formData.is_active ?? true,
        ignore_in_totals: formData.ignore_in_totals ?? false
      }, {
        onSuccess: () => setIsEditing(null)
      })
    } else if (isEditing) {
      updateCategory.mutate({
        id: isEditing,
        name: formData.name,
        type: formData.type as any,
        color: categoryColor,
        icon: formData.icon || null,
        is_active: formData.is_active,
        ignore_in_totals: formData.ignore_in_totals
      }, {
        onSuccess: () => setIsEditing(null)
      })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria? Isso só será possível se não houver lançamentos vinculados a ela.')) {
      deleteCategory.mutate(id)
    }
  }

  const handleToggleActive = (category: Category) => {
    updateCategory.mutate({
      id: category.id,
      is_active: !category.is_active
    })
  }

  if (isLoading) {
    return <div className="p-6">Carregando categorias...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as categorias de receitas e despesas</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">Todas</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <Button onClick={handleCreate} disabled={isEditing !== null}>
            <Plus className="mr-2 h-4 w-4" /> Nova Categoria
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Reflete Saldo?</TableHead>
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
                    placeholder="Nome da categoria"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.type || 'despesa'}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center rounded-full bg-finance-income/10 px-2.5 py-0.5 text-xs font-medium text-finance-income">
                    Ativa
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <input 
                    type="checkbox" 
                    checked={!formData.ignore_in_totals} 
                    onChange={e => setFormData({...formData, ignore_in_totals: !e.target.checked})}
                    className="w-4 h-4 cursor-pointer"
                    title="Se marcado, reflete nos saldos"
                  />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={createCategory.isPending}>Salvar</Button>
                </TableCell>
              </TableRow>
            )}

            {filteredCategories?.map((category) => (
              isEditing === category.id ? (
                <TableRow key={category.id}>
                  <TableCell>
                    <Input 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.type || 'despesa'}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
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
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      checked={!formData.ignore_in_totals} 
                      onChange={e => setFormData({...formData, ignore_in_totals: !e.target.checked})}
                      className="w-4 h-4 cursor-pointer"
                      title="Se marcado, reflete nos saldos"
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateCategory.isPending}>Salvar</Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={category.id} className={!category.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      category.type === 'receita' 
                        ? 'bg-finance-income/10 text-finance-income' 
                        : 'bg-finance-expense/10 text-finance-expense'
                    }`}>
                      {category.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <button 
                      onClick={() => handleToggleActive(category)}
                      title="Clique para alternar o status"
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer ${
                        category.is_active 
                          ? 'bg-finance-income/10 text-finance-income hover:bg-finance-income/20' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {category.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center text-xs font-medium ${!category.ignore_in_totals ? 'text-finance-income' : 'text-muted-foreground'}`}>
                      {!category.ignore_in_totals ? 'Sim' : 'Não'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            ))}

            {filteredCategories?.length === 0 && isEditing !== 'new' && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma categoria cadastrada com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
