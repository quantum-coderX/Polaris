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
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="card w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="font-heading text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Welcome Back
          </div>
          <p className="text-gray-400 text-sm mt-2">Sign in to continue learning</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <button id="login-submit" type="submit" className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
            {loading ? <span className="spinner w-5 h-5 border-2" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
