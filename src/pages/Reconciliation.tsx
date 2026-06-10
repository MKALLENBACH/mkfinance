import { useState, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAccounts, useDefaultAccount } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { parseOFX, ParsedTransaction } from '@/lib/ofxParser'
import { invalidateFinanceData } from '@/lib/queryInvalidation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { toast } from 'sonner'
import { Upload, FileText, Save, Link as LinkIcon, Plus, XCircle, Info } from 'lucide-react'

type ImportAction = 'novo' | 'vincular' | 'ignorar'

type ImportableTransaction = ParsedTransaction & {
  selected: boolean
  account_id: string
  category_id: string
  status: 'em_aberto' | 'paga' | 'recebida' | 'prevista'
  action: ImportAction
  target_transaction_id: string | null
  is_duplicate: boolean
}

function diffDays(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.ceil(Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
}

export function Reconciliation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const [userDefaultAccountId] = useDefaultAccount()
  const { data: categories } = useCategories()
  const { data: allTransactions } = useTransactions()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importableTxs, setImportableTxs] = useState<ImportableTransaction[]>([])
  
  const [globalAccountId, setGlobalAccountId] = useState('')

  // Lógica de importação
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !allTransactions) return

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = parseOFX(content)
        
        const defaultAccountId = userDefaultAccountId || accounts?.find(a => a.is_active)?.id || ''
        
        const mapped: ImportableTransaction[] = parsed.map(tx => {
          // 1. Check for duplicates using notes
          const ofxIdMarker = `OFX_FITID:${tx.id}`
          const isDuplicate = allTransactions.some(dbTx => dbTx.notes?.includes(ofxIdMarker))
          
          let action: ImportAction = isDuplicate ? 'ignorar' : 'novo'
          let targetId = null

          // 2. Auto-match with pending transactions
          if (!isDuplicate) {
            const possibleMatches = allTransactions.filter(dbTx => {
              const isSameType = dbTx.type === tx.type
              const isPending = dbTx.status === 'em_aberto' || dbTx.status === 'prevista'
              const isSameAmount = dbTx.amount === tx.amount
              const isDateClose = diffDays(dbTx.due_date, tx.date) <= 3 // tolerância de 3 dias
              
              return isSameType && isPending && isSameAmount && isDateClose
            })

            if (possibleMatches.length > 0) {
              action = 'vincular'
              targetId = possibleMatches[0].id
            }
          }

          return {
            ...tx,
            selected: !isDuplicate, // desmarca os que já foram importados
            account_id: defaultAccountId,
            category_id: '',
            status: tx.type === 'receita' ? 'recebida' : 'paga',
            action,
            target_transaction_id: targetId,
            is_duplicate: isDuplicate
          }
        })
        
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
    setImportableTxs(prev => prev.map(tx => tx.is_duplicate ? tx : { ...tx, account_id: accountId }))
  }

  const toggleSelection = (index: number) => {
    setImportableTxs(prev => {
      const newTxs = [...prev]
      newTxs[index] = { ...newTxs[index], selected: !newTxs[index].selected }
      return newTxs
    })
  }

  const updateTxField = (index: number, field: keyof ImportableTransaction, value: any) => {
    setImportableTxs(prev => {
      const newTxs = [...prev]
      newTxs[index] = { ...newTxs[index], [field]: value }
      return newTxs
    })
  }

  const importMutation = useMutation({
    mutationFn: async (txsToImport: ImportableTransaction[]) => {
      if (!user) throw new Error('Not authenticated')

      const novosParaInserir = []
      
      for (const tx of txsToImport) {
        const ofxMarker = `OFX_FITID:${tx.id}`
        
        if (tx.action === 'vincular' && tx.target_transaction_id) {
          // Busca a transação existente para manter as notas anteriores (se houver)
          const target = allTransactions?.find(t => t.id === tx.target_transaction_id)
          const newNotes = target?.notes ? `${target.notes}\n${ofxMarker}` : ofxMarker

          await supabase
            .from('transactions')
            .update({
              status: tx.type === 'receita' ? 'recebida' : 'paga',
              paid_at: tx.date,
              notes: newNotes,
              // Opcional: Atualizar conta se o usuário mudou no combobox
              account_id: tx.account_id || target?.account_id
            })
            .eq('id', tx.target_transaction_id)
        } else if (tx.action === 'novo') {
          novosParaInserir.push({
            user_id: user.id,
            type: tx.type,
            description: tx.description,
            amount: tx.amount,
            due_date: tx.date,
            paid_at: tx.date,
            status: tx.type === 'receita' ? 'recebida' : 'paga',
            account_id: tx.account_id || null,
            category_id: tx.category_id || null,
            notes: ofxMarker
          })
        }
      }

      if (novosParaInserir.length > 0) {
        const { error } = await supabase.from('transactions').insert(novosParaInserir)
        if (error) throw error
      }
      
      return true
    },
    onSuccess: () => {
      toast.success(`Conciliação concluída com sucesso!`)
      setImportableTxs([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`)
    }
  })

  const handleImport = () => {
    // Filtramos apenas os que estão selecionados E que a ação não é ignorar
    const toImport = importableTxs.filter(tx => tx.selected && tx.action !== 'ignorar')
    
    if (toImport.length === 0) {
      toast.error('Nenhuma transação válida selecionada para importar/vincular.')
      return
    }

    const missingAccounts = toImport.filter(tx => tx.action === 'novo' && !tx.account_id)
    if (missingAccounts.length > 0) {
      toast.error('Transações marcadas como "Novo" precisam estar vinculadas a uma conta bancária.')
      return
    }

    const missingTargets = toImport.filter(tx => tx.action === 'vincular' && !tx.target_transaction_id)
    if (missingTargets.length > 0) {
      toast.error('Transações marcadas como "Vincular" precisam ter um lançamento de destino selecionado.')
      return
    }

    importMutation.mutate(toImport)
  }

  const selectedCount = importableTxs.filter(tx => tx.selected && tx.action !== 'ignorar').length
  
  // Opções para vincular
  const pendingTransactions = useMemo(() => {
    return allTransactions?.filter(t => t.status === 'em_aberto' || t.status === 'prevista') || []
  }, [allTransactions])

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
                <TableHead>Ação</TableHead>
                <TableHead>Conta / Destino</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importableTxs.map((tx, index) => (
                <TableRow key={index} className={!tx.selected || tx.action === 'ignorar' ? 'opacity-50 bg-muted/20' : ''}>
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      checked={tx.selected}
                      onChange={() => toggleSelection(index)}
                      disabled={tx.action === 'ignorar' || tx.is_duplicate}
                      className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                  </TableCell>
                  <TableCell>{formatDateBR(tx.date)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={tx.description}>
                    <div className="flex items-center gap-2">
                      {tx.is_duplicate && <Info className="h-3 w-3 text-muted-foreground" title="Transação já importada anteriormente" />}
                      {tx.description}
                    </div>
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
                      className="flex h-8 w-[110px] rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                      value={tx.action}
                      disabled={tx.is_duplicate}
                      onChange={(e) => {
                        const newAction = e.target.value as ImportAction
                        updateTxField(index, 'action', newAction)
                        if (newAction === 'ignorar') {
                          updateTxField(index, 'selected', false)
                        } else {
                          updateTxField(index, 'selected', true)
                        }
                      }}
                    >
                      <option value="novo">Novo Lanç.</option>
                      <option value="vincular">Vincular</option>
                      <option value="ignorar">Ignorar</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    {tx.action === 'novo' && (
                      <select 
                        className="flex h-8 w-full max-w-[150px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                        value={tx.account_id}
                        onChange={(e) => updateTxField(index, 'account_id', e.target.value)}
                      >
                        <option value="">Conta...</option>
                        {accounts?.filter(a => a.is_active).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
                    {tx.action === 'vincular' && (
                      <select 
                        className="flex h-8 w-full max-w-[200px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                        value={tx.target_transaction_id || ''}
                        onChange={(e) => updateTxField(index, 'target_transaction_id', e.target.value)}
                      >
                        <option value="">Selecione para vincular...</option>
                        {pendingTransactions
                          .filter(pt => pt.type === tx.type)
                          .map(pt => (
                            <option key={pt.id} value={pt.id}>
                              {formatDateBR(pt.due_date)} - {pt.description} ({formatCurrencyBRL(pt.amount)})
                            </option>
                          ))
                        }
                      </select>
                    )}
                    {tx.action === 'ignorar' && (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.action === 'novo' ? (
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
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
