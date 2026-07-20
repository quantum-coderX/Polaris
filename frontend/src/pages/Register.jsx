import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, AtSign, Mail, Lock, GraduationCap, Users } from 'lucide-react'
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
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-brand">
          <div className="auth-brand__logo">Polaris</div>
          <div className="auth-brand__title">Create Your Account</div>
          <p className="auth-brand__sub">Join thousands of learners and start growing today</p>
        </div>

        <form id="register-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input id="reg-name" type="text" className="form-input pl-10" placeholder="Jane Doe" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input id="reg-username" type="text" className="form-input pl-10" placeholder="janedoe" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input id="reg-email" type="email" className="form-input pl-10" placeholder="you@example.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input id="reg-password" type="password" className="form-input pl-10" placeholder="Min. 8 characters" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>

          {/* Role selector — LMS-specific */}
          <div className="form-group">
            <label className="form-label">I want to</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`p-4 rounded-xl border-2 text-left transition-all ${form.role === 'student' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                style={{ background: form.role === 'student' ? 'rgba(139,92,246,0.06)' : 'var(--color-surface-2)' }}
                onClick={() => setForm(f => ({ ...f, role: 'student' }))}
              >
                <GraduationCap size={20} className={form.role === 'student' ? 'text-primary' : 'text-theme-muted'} />
                <div className="font-semibold text-sm mt-2 text-theme">Learn</div>
                <div className="text-xs text-theme-muted">Take courses as a student</div>
              </button>
              <button
                type="button"
                className={`p-4 rounded-xl border-2 text-left transition-all ${form.role === 'mentor' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                style={{ background: form.role === 'mentor' ? 'rgba(139,92,246,0.06)' : 'var(--color-surface-2)' }}
                onClick={() => setForm(f => ({ ...f, role: 'mentor' }))}
              >
                <Users size={20} className={form.role === 'mentor' ? 'text-primary' : 'text-theme-muted'} />
                <div className="font-semibold text-sm mt-2 text-theme">Teach</div>
                <div className="text-xs text-theme-muted">Create and sell courses</div>
              </button>
            </div>
          </div>

          <button id="register-submit" type="submit" className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
            {loading ? <span className="spinner w-5 h-5 border-2" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-theme-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
