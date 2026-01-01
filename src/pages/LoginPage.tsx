import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login, register, fetchCaptcha } from '@/services/authService'
import { Loading } from '@/components/ui'
import './login.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [code, setCode] = useState('')
  const [uuid, setUuid] = useState('')
  const [captchaImg, setCaptchaImg] = useState('')
  const [captchaEnabled, setCaptchaEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const remembered = localStorage.getItem('remember_username')
    if (remembered) setUsername(remembered)
    refreshCaptcha()
  }, [])

  const refreshCaptcha = async () => {
    try {
      const { enabled, img, uuid } = await fetchCaptcha()
      setCaptchaEnabled(enabled)
      if (enabled) {
        setCaptchaImg(img || '')
        setUuid(uuid || '')
      } else {
        setCaptchaImg('')
        setUuid('')
        setCode('')
      }
    } catch (err: any) {
      setError(err?.message || '获取验证码失败')
    }
  }

  const redirectAfterLogin = () => {
    const redirect = (location.state as any)?.from || '/'
    navigate(redirect, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(
        captchaEnabled ? { username, password, code, uuid } : { username, password }
      )
      if (remember) localStorage.setItem('remember_username', username)
      else localStorage.removeItem('remember_username')
      redirectAfterLogin()
    } catch (err: any) {
      setError(err?.message || '登录失败')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError(null)
    setLoading(true)
    try {
      const payload = captchaEnabled ? { username, password, code, uuid } : { username, password }
      await register(payload)
      await login(payload)
      if (remember) localStorage.setItem('remember_username', username)
      redirectAfterLogin()
    } catch (err: any) {
      setError(err?.message || '注册失败')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg"></div>
      <div className="login-card">
        <div className="card-body">
          <div className="right">
            <h2 className="title">欢迎回来</h2>
            <p className="subtitle">画图专家</p>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-item">
                <label>用户名 / 邮箱</label>
                <div className="input-wrap">
                  <span className="input-prefix">👤</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名或邮箱"
                    required
                  />
                </div>
              </div>
              <div className="form-item">
                <label>密码</label>
                <div className="input-wrap">
                  <span className="input-prefix">🔒</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                  />
                </div>
              </div>
              {captchaEnabled && (
                <div className="form-item row">
                  <div className="flex-1">
                    <label>验证码</label>
                    <div className="input-wrap">
                      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入验证码" required />
                    </div>
                  </div>
                  <div className="captcha-box" onClick={refreshCaptcha}>
                    {captchaImg ? <img src={captchaImg} alt="captcha" /> : <span>获取验证码</span>}
                  </div>
                </div>
              )}
              <div className="form-row">
                <label className="checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>记住我</span>
                </label>
                <div className="spacer"></div>
                <button type="button" className="link-btn" onClick={() => alert('暂未开放忘记密码功能')}>
                  忘记密码
                </button>
              </div>
              {error && <div className="error-box">{error}</div>}
              <div className="btn-row">
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? <Loading size="sm" /> : '登录'}
                </button>
                <button type="button" className="secondary-btn" disabled={loading} onClick={handleRegister}>
                  {loading ? <Loading size="sm" /> : '注册'}
                </button>
              </div>
            </form>
          </div>
          <div className="banner">
            <div className="banner-mask" />
            <div className="banner-text">
              <div className="dot" />
              <div>
                <h3>高效 · 便捷 · 安全</h3>
                <p>基于 AI 的快速画图工具</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
