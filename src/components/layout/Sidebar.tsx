import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingDown,
  CalendarDays,
  Target,
  Tags,
  Users,
  BarChart3,
  RefreshCcw,
  Settings,
  ListTodo
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contas', href: '/contas', icon: Wallet },
  { name: 'Receitas', href: '/receitas', icon: ArrowDownToLine },
  { name: 'Despesas', href: '/despesas', icon: ArrowUpFromLine },
  { name: 'Dívidas', href: '/dividas', icon: TrendingDown },
  { name: 'Planejamento', href: '/planejamento', icon: ListTodo },
  { name: 'Fluxo de Caixa', href: '/fluxo-caixa', icon: BarChart3 },
  { name: 'Calendário', href: '/calendario', icon: CalendarDays },
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Categorias', href: '/categorias', icon: Tags },
  { name: 'Pessoas', href: '/pessoas', icon: Users },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Conciliação', href: '/conciliacao', icon: RefreshCcw },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <Wallet className="h-6 w-6" />
          <span>MK Finance</span>
        </Link>
      </div>

      <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
