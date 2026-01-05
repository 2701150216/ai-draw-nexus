import { Sparkles, User, ChevronDown, Trash2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAuthToken, clearAuthToken, getAuthUsername, subscribeAuthChange } from '@/services/authService'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/Dropdown'
import { ProjectRepository } from '@/services/projectRepository'
import { useToast } from '@/hooks/useToast'

const defaultAvatar =
  'https://img.alicdn.com/imgextra/i4/O1CN01F4XgHe1OeZ0knoyqH_!!6000000001722-2-tps-800-800.png'

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error } = useToast()
  const [authed, setAuthed] = useState(!!getAuthToken())
  const [username, setUsername] = useState(getAuthUsername() || '游客')
  const avatarText = (username || 'G').slice(0, 1).toUpperCase()
  const avatar = authed ? defaultAvatar : undefined
  const email = authed ? `${username}@example.com` : ''
  const roleLabel = authed ? '管理员' : '游客模式'

  useEffect(() => {
    const unsubscribe = subscribeAuthChange(() => {
      setAuthed(!!getAuthToken())
      setUsername(getAuthUsername() || '未登录')
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = () => navigate('/login', { state: { from: location.pathname } })
  const handleProfile = () => navigate('/profile')
  const handleLogout = () => {
    clearAuthToken()
    setAuthed(false)
    setUsername('游客')
  }

  const handleClearCache = async () => {
    const ok = window.confirm('确定清除本地缓存的所有图吗？此操作不可恢复。')
    if (!ok) return
    try {
      await ProjectRepository.clearAll()
      success('已清除本地缓存的所有图')
    } catch (e: any) {
      console.error(e)
      error('清除缓存失败')
    }
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full bg-transparent px-2 py-1 text-sm font-medium text-foreground transition focus:outline-none focus-visible:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:border-transparent">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-surface font-semibold">
                {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : avatarText}
              </div>
              {authed && (
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-foreground">{username}</span>
                  <span className="text-xs text-muted">{roleLabel}</span>
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 p-0 overflow-hidden rounded-xl border border-border/60 shadow-lg bg-white"
          >
            {authed && (
              <div className="flex items-center gap-3 px-4 py-4 bg-[#e9f2ff]">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#cfd4dc] text-lg font-bold text-foreground/70">
                  {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : avatarText}
                </div>
                <div className="flex flex-col leading-tight text-foreground">
                  <span className="text-base font-semibold">{username}</span>
                  <span className="text-xs text-muted">{email}</span>
                </div>
              </div>
            )}
            <div className="py-1 bg-white">
              {authed ? (
                <>
                  <DropdownMenuItem
                    onClick={handleProfile}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-[#409eff]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    个人中心
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-[#409eff]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    系统设置
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-[#409eff]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    更新日志
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-[#409eff]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    数据看板
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleClearCache}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    清除本地缓存
                  </DropdownMenuItem>
                  <div className="my-1 border-t border-border/60" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-red-600"
                  >
                    退出登录
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={handleLogin}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-[#409eff]"
                  >
                    <User className="mr-2 h-4 w-4" />
                    登录
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleClearCache}
                    className="px-4 py-2.5 text-sm text-foreground hover:bg-[#f5f7fa] hover:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    清除本地缓存
                  </DropdownMenuItem>
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
