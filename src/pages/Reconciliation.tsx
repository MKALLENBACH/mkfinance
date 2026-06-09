import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { parseOFX, ParsedTransaction } from '@/lib/ofxParser'
import { invalidateFinanceData } from '@/lib/queryInvalidation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, Trash2, Save, ArrowRight } from 'lucide-react'

type ImportableTransaction = ParsedTransaction & {
  selected: boolean
  account_id: string
  category_id: string
  status: 'em_aberto' | 'paga' | 'recebida' | 'prevista'
}

export function Reconciliation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importableTxs, setImportableTxs] = useState<ImportableTransaction[]>([])
  
  const [globalAccountId, setGlobalAccountId] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = parseOFX(content)
        
        // Auto-categorize heuristics could go here
        const defaultAccountId = accounts?.find(a => a.is_active)?.id || ''
        
        const mapped: ImportableTransaction[] = parsed.map(tx => ({
          ...tx,
          selected: true,
          account_id: defaultAccountId,
          category_id: '',
          // Assuming bank transactions are already cleared
          status: tx.type === 'receita' ? 'recebida' : 'paga'
        }))
        
        setImportableTxs(mapped)
        setGlobalAccountId(defaultAccountId)
        
        if (mapped.length === 0) {
          toast.error('Nenhuma transação encontrada no arquivo OFX.')
        } else {
          toast.success(`${mapped.length} transações lidas com sucesso!`)
        }
      } catch (error) {
        toast.error('Erro ao processar o arquivo OFX.')
        console.error(error)
      } finally {
        setIsProcessing(false)
      }
    }
    
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo.')
      setIsProcessing(false)
    }
    
    reader.readAsText(file)
  }

  const applyGlobalAccount = (accountId: string) => {
    setGlobalAccountId(accountId)
    setImportableTxs(prev => prev.map(tx => ({ ...tx, account_id: accountId })))
  }

  const toggleSelection = (index: number) => {
    const newTxs = [...importableTxs]
    newTxs[index].selected = !newTxs[index].selected
    setImportableTxs(newTxs)
  }

  const updateTxField = (index: number, field: keyof ImportableTransaction, value: any) => {
    const newTxs = [...importableTxs]
    newTxs[index] = { ...newTxs[index], [field]: value }
    setImportableTxs(newTxs)
  }

  const importMutation = useMutation({
    mutationFn: async (txsToImport: ImportableTransaction[]) => {
      if (!user) throw new Error('Not authenticated')

      const payload = txsToImport.map(tx => ({
        user_id: user.id,
        type: tx.type,
        description: tx.description,
        amount: tx.amount,
        due_date: tx.date,
        paid_at: tx.date,
        status: tx.status,
        account_id: tx.account_id || null,
        category_id: tx.category_id || null,
      }))

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.length} transações importadas com sucesso!`)
      setImportableTxs([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`)
    }
  })

  const handleImport = () => {
    const toImport = importableTxs.filter(tx => tx.selected)
    
    if (toImport.length === 0) {
      toast.error('Selecione pelo menos uma transação para importar.')
      return
    }

    const missingAccounts = toImport.filter(tx => !tx.account_id)
    if (missingAccounts.length > 0) {
      toast.error('Todas as transações selecionadas precisam estar vinculadas a uma conta.')
      return
    }

    importMutation.mutate(toImport)
  }

  const selectedCount = importableTxs.filter(tx => tx.selected).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Conciliação OFX</h2>
        <p className="text-muted-foreground text-sm mt-1">Importe extratos bancários para acelerar o lançamento</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Importar Arquivo
          </CardTitle>
          <CardDescription>Faça o upload de um arquivo .ofx gerado pelo seu banco.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button 
              variant="secondary" 
              className="w-full sm:w-auto relative overflow-hidden"
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Selecionar Arquivo OFX'}
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".ofx, application/x-ofx"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
            </Button>
            
            {importableTxs.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0 ml-auto border p-2 rounded-md bg-muted/30">
                <span className="text-sm font-medium whitespace-nowrap">Conta Padrão:</span>
                <select 
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={globalAccountId}
                  onChange={(e) => applyGlobalAccount(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {accounts?.filter(a => a.is_active).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {importableTxs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Revisar Transações</CardTitle>
              <CardDescription>Selecione a categoria e a conta antes de salvar.</CardDescription>
            </div>
            <Button onClick={handleImport} disabled={importMutation.isPending || selectedCount === 0}>
              <Save className="mr-2 h-4 w-4" /> Salvar {selectedCount} selecionadas
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedCount === importableTxs.length}
                    onChange={(e) => {
                      const val = e.target.checked
                      setImportableTxs(prev => prev.map(tx => ({ ...tx, selected: val })))
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição (Banco)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importableTxs.map((tx, index) => (
                <TableRow key={index} className={!tx.selected ? 'opacity-50 bg-muted/20' : ''}>
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      checked={tx.selected}
                      onChange={() => toggleSelection(index)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableCell>
                  <TableCell>{formatDateBR(tx.date)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={tx.description}>
                    {tx.description}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      tx.type === 'receita' ? 'bg-finance-income/10 text-finance-income' : 'bg-finance-expense/10 text-finance-expense'
                    }`}>
                      {tx.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-8 w-full max-w-[150px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={tx.account_id}
                      onChange={(e) => updateTxField(index, 'account_id', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {accounts?.filter(a => a.is_active).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select 
                      className="flex h-8 w-full max-w-[150px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={tx.category_id}
                      onChange={(e) => updateTxField(index, 'category_id', e.target.value)}
                    >
                      <option value="">Sem categoria</option>
                      {categories?.filter(c => c.type === tx.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'receita' ? 'text-finance-income' : 'text-finance-expense'}`}>
                    {formatCurrencyBRL(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
