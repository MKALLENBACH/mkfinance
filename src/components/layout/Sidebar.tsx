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
  ListTodo,
  Receipt,
  ChevronRight
} from 'lucide-react'

type NavSection = {
  label: string
  items: { name: string; href: string; icon: any }[]
}

const navSections: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Contas Bancárias', href: '/contas', icon: Wallet },
    ]
  },
  {
    label: 'Movimentações',
    items: [
      { name: 'Receitas', href: '/receitas', icon: ArrowDownToLine },
      { name: 'Despesas', href: '/despesas', icon: ArrowUpFromLine },
      { name: 'Dívidas', href: '/dividas', icon: TrendingDown },
      { name: 'Lançamentos Fixos', href: '/fixos', icon: RefreshCcw },
    ]
  },
  {
    label: 'Análise',
    items: [
      { name: 'Fluxo de Caixa', href: '/fluxo-caixa', icon: BarChart3 },
      { name: 'Planejamento', href: '/planejamento', icon: ListTodo },
      { name: 'Relatórios', href: '/relatorios', icon: Receipt },
      { name: 'Calendário', href: '/calendario', icon: CalendarDays },
    ]
  },
  {
    label: 'Cadastros',
    items: [
      { name: 'Metas', href: '/metas', icon: Target },
      { name: 'Categorias', href: '/categorias', icon: Tags },
      { name: 'Pessoas', href: '/pessoas', icon: Users },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Importar OFX', href: '/conciliacao', icon: RefreshCcw },
      { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ]
  }
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <Wallet className="h-6 w-6" />
          <span>MK Finance</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, sectionIdx) => (
          <div key={section.label} className={cn(sectionIdx > 0 && "mt-6")}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{item.name}</span>
                    {isActive && <ChevronRight className="ml-auto h-3 w-3 text-primary/50" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 shrink-0">
        <p className="text-[10px] text-muted-foreground/40 text-center">MK Finance © 2026</p>
      </div>
    </aside>
  )
}
