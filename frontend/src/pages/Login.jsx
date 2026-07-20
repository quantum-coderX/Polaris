import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { BookOpen, Mail, Lock } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const ALERT_MESSAGES = {
  unauthenticated: (state) => state?.message ?? 'Please sign in to continue.',
  unauthorized: (state) => state?.message ?? 'You do not have permission to view that page.',
  session_expired: () => 'Your session expired. Please sign in again.',
  logged_out: (state) => state?.message ?? 'You have been signed out.',
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [authAlert, setAuthAlert] = useState(null)
  const [requires2FA, setRequires2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const queryReason = searchParams.get('reason')
    const stateReason = location.state?.reason
    const reason = stateReason ?? queryReason
    if (!reason) return

    const resolver = ALERT_MESSAGES[reason]
    const message = resolver ? resolver(location.state) : null
    if (message) {
      setAuthAlert({ reason, message })
      toast.error(message)
    }

    if (queryReason || stateReason) {
      navigate({ pathname: '/login', search: '' }, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (requires2FA) {
        const { data } = await api.post('/auth/2fa/login', { email: form.email, code: totpCode })
        const { data: user } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        login(user, data.access_token)
        toast.success(`Welcome back, ${user.full_name}!`)
        navigate(user.role === 'admin' ? '/admin' : user.role === 'mentor' ? '/mentor' : '/dashboard')
      } else {
        const { data } = await api.post('/auth/login', form)
        if (data.requires_2fa) {
          setRequires2FA(true)
          toast('Please enter your authenticator code.', { icon: '🛡️' })
          return
        }
        
        const { data: user } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        login(user, data.access_token)
        toast.success(`Welcome back, ${user.full_name}!`)
        navigate(user.role === 'admin' ? '/admin' : user.role === 'mentor' ? '/mentor' : '/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand__logo">Polaris</div>
          <div className="auth-brand__title">Welcome Back</div>
          <p className="auth-brand__sub">Sign in to continue your learning journey</p>
        </div>

        {authAlert && (
          <div
            role="alert"
            data-auth-alert-reason={authAlert.reason}
            className="mb-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-text)',
            }}
          >
            {authAlert.message}
          </div>
        )}

        <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!requires2FA ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input pl-10"
                    placeholder="you@example.com"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                  <input
                    id="login-password"
                    type="password"
                    className="form-input pl-10"
                    placeholder="••••••••"
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label text-center block mb-2" htmlFor="login-totp">Authenticator Code</label>
              <input
                id="login-totp"
                type="text"
                className="form-input text-center text-2xl tracking-[0.5em] font-mono py-4"
                placeholder="000000"
                required
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          )}

          <button id="login-submit" type="submit" className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
            {loading ? <span className="spinner w-5 h-5 border-2" /> : requires2FA ? 'Verify Code' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-theme-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Sign up free</Link>
        </p>

        <div className="mt-6 pt-6 border-t flex items-center justify-center gap-2 text-xs text-theme-muted" style={{ borderColor: 'var(--color-border)' }}>
          <BookOpen size={14} />
          <span>Access courses, track progress, earn certificates</span>
        </div>
      </div>
    </div>
  )
}
