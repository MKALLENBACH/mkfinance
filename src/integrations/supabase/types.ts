export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone: string | null
          monthly_income: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone?: string | null
          monthly_income?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone?: string | null
          monthly_income?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      financial_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'corrente' | 'poupanca' | 'digital' | 'dinheiro' | 'cartao' | 'investimento'
          initial_balance: number
          current_balance: number
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'corrente' | 'poupanca' | 'digital' | 'dinheiro' | 'cartao' | 'investimento'
          initial_balance?: number
          current_balance?: number
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'corrente' | 'poupanca' | 'digital' | 'dinheiro' | 'cartao' | 'investimento'
          initial_balance?: number
          current_balance?: number
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'receita' | 'despesa'
          color: string | null
          icon: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'receita' | 'despesa'
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'receita' | 'despesa'
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      people: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'credor' | 'fonte_renda' | 'pessoa' | 'empresa' | 'outro'
          phone: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'credor' | 'fonte_renda' | 'pessoa' | 'empresa' | 'outro'
          phone?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'credor' | 'fonte_renda' | 'pessoa' | 'empresa' | 'outro'
          phone?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'receita' | 'despesa'
          description: string
          amount: number
          due_date: string
          paid_at: string | null
          account_id: string | null
          category_id: string | null
          person_id: string | null
          status: 'prevista' | 'recebida' | 'em_aberto' | 'paga' | 'atrasada' | 'cancelada'
          recurrence_type: 'nenhuma' | 'mensal' | 'semanal' | 'anual' | null
          installment_group_id: string | null
          installment_number: number | null
          installment_total: number | null
          is_fixed: boolean | null
          priority: 'baixa' | 'media' | 'alta' | 'critica' | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: 'receita' | 'despesa'
          description: string
          amount: number
          due_date: string
          paid_at?: string | null
          account_id?: string | null
          category_id?: string | null
          person_id?: string | null
          status: 'prevista' | 'recebida' | 'em_aberto' | 'paga' | 'atrasada' | 'cancelada'
          recurrence_type?: 'nenhuma' | 'mensal' | 'semanal' | 'anual' | null
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          is_fixed?: boolean | null
          priority?: 'baixa' | 'media' | 'alta' | 'critica' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'receita' | 'despesa'
          description?: string
          amount?: number
          due_date?: string
          paid_at?: string | null
          account_id?: string | null
          category_id?: string | null
          person_id?: string | null
          status?: 'prevista' | 'recebida' | 'em_aberto' | 'paga' | 'atrasada' | 'cancelada'
          recurrence_type?: 'nenhuma' | 'mensal' | 'semanal' | 'anual' | null
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          is_fixed?: boolean | null
          priority?: 'baixa' | 'media' | 'alta' | 'critica' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      monthly_plans: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          expected_income: number
          planned_fixed_expenses: number
          planned_variable_expenses: number
          planned_debt_payments: number
          planned_savings: number
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          expected_income?: number
          planned_fixed_expenses?: number
          planned_variable_expenses?: number
          planned_debt_payments?: number
          planned_savings?: number
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          month?: number
          expected_income?: number
          planned_fixed_expenses?: number
          planned_variable_expenses?: number
          planned_debt_payments?: number
          planned_savings?: number
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          creditor_id: string | null
          category_id: string | null
          original_amount: number
          current_amount: number
          monthly_payment: number | null
          interest_rate: number | null
          due_day: number | null
          start_date: string | null
          target_payoff_date: string | null
          status: 'ativa' | 'atrasada' | 'quitada' | 'pausada'
          priority: 'baixa' | 'media' | 'alta' | 'critica'
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          creditor_id?: string | null
          category_id?: string | null
          original_amount: number
          current_amount: number
          monthly_payment?: number | null
          interest_rate?: number | null
          due_day?: number | null
          start_date?: string | null
          target_payoff_date?: string | null
          status: 'ativa' | 'atrasada' | 'quitada' | 'pausada'
          priority: 'baixa' | 'media' | 'alta' | 'critica'
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          creditor_id?: string | null
          category_id?: string | null
          original_amount?: number
          current_amount?: number
          monthly_payment?: number | null
          interest_rate?: number | null
          due_day?: number | null
          start_date?: string | null
          target_payoff_date?: string | null
          status?: 'ativa' | 'atrasada' | 'quitada' | 'pausada'
          priority?: 'baixa' | 'media' | 'alta' | 'critica'
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string | null
          monthly_contribution: number | null
          priority: 'baixa' | 'media' | 'alta' | 'critica' | null
          status: 'ativa' | 'concluida' | 'pausada' | 'cancelada' | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          monthly_contribution?: number | null
          priority?: 'baixa' | 'media' | 'alta' | 'critica' | null
          status?: 'ativa' | 'concluida' | 'pausada' | 'cancelada' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          monthly_contribution?: number | null
          priority?: 'baixa' | 'media' | 'alta' | 'critica' | null
          status?: 'ativa' | 'concluida' | 'pausada' | 'cancelada' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      monthly_plans: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          expected_income: number | null
          planned_fixed_expenses: number | null
          planned_variable_expenses: number | null
          planned_debt_payments: number | null
          planned_savings: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          expected_income?: number | null
          planned_fixed_expenses?: number | null
          planned_variable_expenses?: number | null
          planned_debt_payments?: number | null
          planned_savings?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          expected_income?: number | null
          planned_fixed_expenses?: number | null
          planned_variable_expenses?: number | null
          planned_debt_payments?: number | null
          planned_savings?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      reconciliation_batches: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          file_name: string
          period_start: string | null
          period_end: string | null
          total_count: number | null
          reconciled_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          file_name: string
          period_start?: string | null
          period_end?: string | null
          total_count?: number | null
          reconciled_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          file_name?: string
          period_start?: string | null
          period_end?: string | null
          total_count?: number | null
          reconciled_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bank_transactions: {
        Row: {
          id: string
          user_id: string
          batch_id: string | null
          account_id: string | null
          fitid: string | null
          date: string
          description: string
          amount: number
          type: 'credit' | 'debit'
          status: 'pendente' | 'conciliada' | 'ignorada'
          reconciled_transaction_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          batch_id?: string | null
          account_id?: string | null
          fitid?: string | null
          date: string
          description: string
          amount: number
          type: 'credit' | 'debit'
          status: 'pendente' | 'conciliada' | 'ignorada'
          reconciled_transaction_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          batch_id?: string | null
          account_id?: string | null
          fitid?: string | null
          date?: string
          description?: string
          amount?: number
          type?: 'credit' | 'debit'
          status?: 'pendente' | 'conciliada' | 'ignorada'
          reconciled_transaction_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
