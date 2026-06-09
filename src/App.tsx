import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Layout } from './components/layout/Layout'

// Pages
import { Login } from './pages/Login'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Profile } from './pages/Profile'
import { Accounts } from './pages/Accounts'
import { Revenues } from './pages/Revenues'
import { Expenses } from './pages/Expenses'
import { Debts } from './pages/Debts'
import { FixedTransactions } from './pages/FixedTransactions'
import { Planning } from './pages/Planning'
import { CashFlow } from './pages/CashFlow'
import { Calendar } from './pages/Calendar'
import { Goals } from './pages/Goals'
import { Categories } from './pages/Categories'
import { People } from './pages/People'
import { Reports } from './pages/Reports'
import { Reconciliation } from './pages/Reconciliation'
import { Settings } from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/meu-perfil" element={<Profile />} />
                <Route path="/contas" element={<Accounts />} />
                <Route path="/receitas" element={<Revenues />} />
                <Route path="/despesas" element={<Expenses />} />
                <Route path="/dividas" element={<Debts />} />
                <Route path="/fixos" element={<FixedTransactions />} />
                <Route path="/planejamento" element={<Planning />} />
                <Route path="/fluxo-caixa" element={<CashFlow />} />
                <Route path="/calendario" element={<Calendar />} />
                <Route path="/metas" element={<Goals />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/pessoas" element={<People />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/conciliacao" element={<Reconciliation />} />
                <Route path="/configuracoes" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
