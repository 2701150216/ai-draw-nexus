import { Sparkles } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAuthToken, clearAuthToken } from '@/services/authService'

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const authed = !!getAuthToken()

  const handleLogin = () => {
    navigate('/login', { state: { from: location.pathname } })
  }

  const handleLogout = () => {
    clearAuthToken()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-surface" />
        </div>
        <span className="text-lg font-semibold text-primary">AI Draw Nexus</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted">简体中文</span>
        {!authed ? (
          <button
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary/90"
            onClick={handleLogin}
          >
            登录
          </button>
        ) : (
          <button
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            onClick={handleLogout}
          >
            退出登录
          </button>
        )}
      </div>
    </header>
  )
}
