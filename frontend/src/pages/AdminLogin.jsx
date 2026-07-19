import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// ── Icons (inline SVG — zero-dependency) ──────────────────────────────────────
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminLogin() {
  const [step, setStep] = useState('credentials') // 'credentials' | '2fa'
  const [form, setForm] = useState({ email: '', password: '', admin_secret: '' })
  const [twoFaCode, setTwoFaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  // Track failed attempts — lock UI after 5 consecutive failures
  const handleFailure = useCallback((msg) => {
    toast.error(msg)
    setFailedAttempts(prev => {
      const next = prev + 1
      if (next >= 5) {
        setIsLocked(true)
        toast.error('Too many failed attempts. Wait 60 seconds before trying again.', { duration: 8000 })
        setTimeout(() => {
          setIsLocked(false)
          setFailedAttempts(0)
        }, 60000)
      }
      return next
    })
  }, [])

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/admin-login', {
        email: form.email,
        password: form.password,
        admin_secret: form.admin_secret,
      })

      if (data.requires_2fa) {
        setStep('2fa')
        toast('Enter your authenticator code to continue.', { icon: '🔐' })
        return
      }

      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })

      // Client-side role guard (defense-in-depth)
      if (user.role !== 'admin') {
        handleFailure('Access denied: not an admin account.')
        return
      }

      login(user, data.access_token)
      setFailedAttempts(0)
      toast.success(`Welcome, ${user.full_name}. Admin session started.`, { duration: 4000 })
      navigate('/admin', { replace: true })
    } catch (err) {
      handleFailure(err.response?.data?.detail ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handle2FASubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/2fa/login', {
        email: form.email,
        code: twoFaCode,
      })

      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })

      if (user.role !== 'admin') {
        handleFailure('Access denied: not an admin account.')
        return
      }

      login(user, data.access_token)
      setFailedAttempts(0)
      toast.success(`Welcome, ${user.full_name}. Admin session started.`, { duration: 4000 })
      navigate('/admin', { replace: true })
    } catch (err) {
      handleFailure(err.response?.data?.detail ?? '2FA verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div
      id="admin-login-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(ellipse at 60% 0%, rgba(139,92,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(239,68,68,0.10) 0%, transparent 50%), var(--color-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        animation: 'fadeIn 0.4s ease',
      }}>

        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: '1.25rem', marginBottom: '1rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(239,68,68,0.15) 100%)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#8B5CF6',
            boxShadow: '0 0 40px rgba(139,92,246,0.2)',
          }}>
            <ShieldIcon />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EF4444 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', letterSpacing: '-0.02em',
          }}>
            Admin Portal
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Polaris &mdash; Restricted Access
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '1.25rem',
          padding: '2rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,92,246,0.1)',
        }}>

          {/* Lockout banner */}
          {isLocked && (
            <div role="alert" style={{
              marginBottom: '1.25rem', padding: '0.875rem 1rem',
              borderRadius: '0.75rem', fontSize: '0.813rem', lineHeight: 1.5,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <LockIcon />
              Too many failed attempts &mdash; temporarily locked for 60 seconds.
            </div>
          )}

          {/* Attempts warning */}
          {failedAttempts > 0 && failedAttempts < 5 && !isLocked && (
            <div style={{
              marginBottom: '1.25rem', padding: '0.75rem 1rem',
              borderRadius: '0.75rem', fontSize: '0.813rem',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              color: 'var(--color-gold)',
            }}>
              ⚠&nbsp;{5 - failedAttempts} attempt{5 - failedAttempts !== 1 ? 's' : ''} remaining before temporary lockout.
            </div>
          )}

          {/* ── Credentials step ── */}
          {step === 'credentials' && (
            <form id="admin-login-form" onSubmit={handleCredentialsSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-email">Email Address</label>
                <input
                  id="admin-email"
                  type="email"
                  className="form-input"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange('password')}
                    disabled={isLocked}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: '0.875rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex',
                    }}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-secret-key"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <KeyIcon /> Admin Secret Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-secret-key"
                    type={showSecret ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter admin portal secret"
                    required
                    autoComplete="off"
                    value={form.admin_secret}
                    onChange={handleChange('admin_secret')}
                    disabled={isLocked}
                    style={{ paddingRight: '2.75rem', borderColor: 'rgba(139,92,246,0.35)' }}
                  />
                  <button type="button"
                    onClick={() => setShowSecret(v => !v)}
                    aria-label={showSecret ? 'Hide secret' : 'Reveal secret'}
                    style={{
                      position: 'absolute', right: '0.875rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex',
                    }}>
                    {showSecret ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginTop: '0.375rem' }}>
                  Required alongside your credentials. Provided by system administrator.
                </p>
              </div>

              <button
                id="admin-login-submit"
                type="submit"
                disabled={loading || isLocked}
                style={{
                  marginTop: '0.25rem',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: loading || isLocked ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  letterSpacing: '0.01em',
                  color: '#fff',
                  background: loading || isLocked
                    ? 'var(--color-border)'
                    : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  boxShadow: loading || isLocked ? 'none' : '0 4px 20px rgba(139,92,246,0.4)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%',
                }}
              >
                {loading
                  ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  : 'Sign In to Admin Panel'}
              </button>
            </form>
          )}

          {/* ── 2FA step ── */}
          {step === '2fa' && (
            <form id="admin-2fa-form" onSubmit={handle2FASubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div style={{
                textAlign: 'center', padding: '1rem',
                background: 'rgba(139,92,246,0.08)', borderRadius: '0.875rem',
                border: '1px solid rgba(139,92,246,0.2)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  Two-factor authentication is enabled.<br />
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-2fa-code">Authenticator Code</label>
                <input
                  id="admin-2fa-code"
                  type="text"
                  className="form-input"
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isLocked}
                  style={{
                    textAlign: 'center', fontSize: '1.75rem',
                    letterSpacing: '0.5rem', fontWeight: 700, fontFamily: 'monospace',
                  }}
                />
              </div>

              <button
                id="admin-2fa-submit"
                type="submit"
                disabled={loading || isLocked || twoFaCode.length !== 6}
                style={{
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: loading || isLocked || twoFaCode.length !== 6 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: '#fff',
                  background: loading || isLocked || twoFaCode.length !== 6
                    ? 'var(--color-border)'
                    : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  boxShadow: loading || isLocked || twoFaCode.length !== 6
                    ? 'none' : '0 4px 20px rgba(139,92,246,0.4)',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {loading
                  ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  : 'Verify & Enter Admin Panel'}
              </button>

              <button type="button"
                onClick={() => { setStep('credentials'); setTwoFaCode('') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: '0.813rem',
                  textAlign: 'center', textDecoration: 'underline',
                }}>
                &larr; Back to credentials
              </button>
            </form>
          )}
        </div>

        {/* Security notice */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', marginTop: '1.5rem',
          color: 'var(--color-text-sub)', fontSize: '0.75rem',
        }}>
          <LockIcon />
          <span>Encrypted connection &middot; Unauthorized access is monitored and logged</span>
        </div>
      </div>
    </div>
  )
}
