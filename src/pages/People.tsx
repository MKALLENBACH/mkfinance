import { useState } from 'react'
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from '@/hooks/usePeople'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Database } from '@/integrations/supabase/types'

type Person = Database['public']['Tables']['people']['Row']

export function People() {
  const { data: people, isLoading } = usePeople()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const deletePerson = useDeletePerson()

  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Person>>({})
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPeople = people?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreate = () => {
    setIsEditing('new')
    setFormData({
      name: '',
      type: 'pessoa',
      phone: '',
      notes: ''
    })
  }

  const handleEdit = (person: Person) => {
    setIsEditing(person.id)
    setFormData(person)
  }

  const handleSave = () => {
    if (!formData.name || !formData.type) return

    if (isEditing === 'new') {
      createPerson.mutate({
        name: formData.name,
        type: formData.type as any,
        phone: formData.phone || null,
        notes: formData.notes || null,
      }, {
        onSuccess: () => setIsEditing(null)
      })
    } else if (isEditing) {
      updatePerson.mutate({
        id: isEditing,
        name: formData.name,
        type: formData.type as any,
        phone: formData.phone || null,
        notes: formData.notes || null,
      }, {
        onSuccess: () => setIsEditing(null)
      })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro? Isso só será possível se não houver lançamentos ou dívidas vinculadas a ele.')) {
      deletePerson.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="p-6">Carregando pessoas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pessoas e Empresas</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie credores, fontes de renda e pessoas</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={isEditing !== null}>
            <Plus className="mr-2 h-4 w-4" /> Novo Registro
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Observações</TableHead>
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
                    placeholder="Nome"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.type || 'pessoa'}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="pessoa">Pessoa</option>
                    <option value="empresa">Empresa</option>
                    <option value="credor">Credor</option>
                    <option value="fonte_renda">Fonte de Renda</option>
                    <option value="outro">Outro</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input 
                    value={formData.phone || ''} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notas..."
                  />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={createPerson.isPending}>Salvar</Button>
                </TableCell>
              </TableRow>
            )}

            {filteredPeople?.map((person) => (
              isEditing === person.id ? (
                <TableRow key={person.id}>
                  <TableCell>
                    <Input 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.type || 'pessoa'}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="pessoa">Pessoa</option>
                      <option value="empresa">Empresa</option>
                      <option value="credor">Credor</option>
                      <option value="fonte_renda">Fonte de Renda</option>
                      <option value="outro">Outro</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={formData.notes || ''} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} disabled={updatePerson.isPending}>Salvar</Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                      {person.type.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>{person.phone || '-'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {person.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(person)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(person.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            ))}

            {filteredPeople?.length === 0 && isEditing !== 'new' && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
