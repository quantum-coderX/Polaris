import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(user, data.access_token)
      toast.success(`Welcome back, ${user.full_name}!`)
      navigate(user.role === 'admin' ? '/admin' : user.role === 'mentor' ? '/mentor' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fadein" style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome Back
          </div>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>Sign in to continue learning</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <button id="login-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-muted" style={{ marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
