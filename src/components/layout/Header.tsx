import { useAuth } from '@/hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'

// Simple map to get page title from pathname
const getPageTitle = (pathname: string) => {
  if (pathname === '/') return 'Dashboard'
  
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return 'Dashboard'
  
  const mainSegment = segments[0]
  const words = mainSegment.split('-')
  
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  
  const title = getPageTitle(location.pathname)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      
      <div className="flex items-center gap-4">
        <Link 
          to="/meu-perfil" 
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-block">
            {user?.email?.split('@')[0] || 'Usuário'}
          </span>
        </Link>
        
        <div className="h-4 w-px bg-border" />
        
        <button
          onClick={signOut}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
