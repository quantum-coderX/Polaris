import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '', role: 'student' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      // Auto-login after register
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(user, data.access_token)
      toast.success(`Account created! Welcome, ${user.full_name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fadein" style={{ width: '100%', maxWidth: 460 }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create Account
          </div>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>Join 10,000+ learners today</p>
        </div>

        <form id="register-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" className="form-input" placeholder="Jane Doe" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input id="reg-username" type="text" className="form-input" placeholder="janedoe" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-input" placeholder="you@example.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" className="form-input" placeholder="Min. 8 characters" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">I want to</label>
            <select id="reg-role" className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="student">Learn (Student)</option>
              <option value="mentor">Teach (Become a Mentor)</option>
            </select>
          </div>

          <button id="register-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted" style={{ marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
