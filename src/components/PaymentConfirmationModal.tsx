import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useAccounts, useDefaultAccount } from '@/hooks/useAccounts'

export interface PaymentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { realAmount: number; accountId: string; paidAt: string }) => void
  transaction: any | null
  type: 'despesa' | 'receita'
}

export function PaymentConfirmationModal({ isOpen, onClose, onConfirm, transaction, type }: PaymentConfirmationModalProps) {
  const { data: accounts } = useAccounts()
  const [defaultAccountId] = useDefaultAccount()
  
  const [realAmount, setRealAmount] = useState<number>(0)
  const [accountId, setAccountId] = useState<string>('')
  const [paidAt, setPaidAt] = useState<string>('')

  useEffect(() => {
    if (isOpen && transaction) {
      setRealAmount(transaction.amount || 0)
      setAccountId(transaction.account_id || defaultAccountId || '')
      setPaidAt(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, transaction, defaultAccountId])

  const handleConfirm = () => {
    if (!accountId) {
      alert('Por favor, selecione uma conta financeira.')
      return
    }
    if (realAmount < 0) {
      alert('O valor não pode ser negativo.')
      return
    }
    onConfirm({
      realAmount,
      accountId,
      paidAt
    })
  }

  if (!transaction) return null

  const isDebt = !!transaction.installment_group_id && transaction.is_fixed

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirmar {type === 'despesa' ? 'Pagamento' : 'Recebimento'}</DialogTitle>
          <DialogDescription>
            {type === 'despesa' 
              ? 'Confirme o valor real pago. Ele pode ser diferente do planejado.'
              : 'Confirme o valor real recebido. Ele pode ser diferente do planejado.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Valor Real {type === 'despesa' ? 'Pago' : 'Recebido'}
            </label>
            <Input 
              type="number" step="0.01" 
              value={realAmount || ''}
              onChange={(e) => setRealAmount(parseFloat(e.target.value) || 0)}
              className="font-bold text-lg"
            />
            {isDebt && realAmount !== transaction.amount && (
              <p className="text-xs text-finance-overdue mt-1">
                Aviso: Como esta é uma dívida, a diferença recalculará automaticamente as próximas parcelas.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Conta Financeira</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Selecione uma conta...</option>
              {accounts?.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data do {type === 'despesa' ? 'Pagamento' : 'Recebimento'}</label>
            <Input 
              type="date" 
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            Confirmar {type === 'despesa' ? 'Pagamento' : 'Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
