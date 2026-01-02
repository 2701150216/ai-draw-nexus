import { Sparkles, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAuthToken, clearAuthToken, getAuthUsername, subscribeAuthChange } from '@/services/authService'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/Dropdown'

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authed, setAuthed] = useState(!!getAuthToken())
  const [username, setUsername] = useState(getAuthUsername() || '未登录')

  useEffect(() => {
    const unsubscribe = subscribeAuthChange(() => {
      setAuthed(!!getAuthToken())
      setUsername(getAuthUsername() || '未登录')
    })
    return () => unsubscribe()
  }, [])

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60">
                <User className="h-4 w-4" />
                <span>{username}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => navigate('/profile')}>用户信息</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
