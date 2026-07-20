import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  User, Mail, AtSign, FileText, ShieldCheck, ShieldOff,
  Save, Eye, EyeOff, KeyRound, Upload, CheckCircle
} from 'lucide-react'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    username: user?.username ?? '',
    bio: user?.bio ?? '',
    avatar_url: user?.avatar_url ?? '',
  })

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ?? null)

  // ── Profile update ──────────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (data) => api.patch('/users/me', data).then(r => r.data),
    onSuccess: (data) => {
      setUser?.(data)
      qc.invalidateQueries(['me'])
      toast.success('Profile updated!')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Update failed'),
  })

  const handleSave = (e) => {
    e.preventDefault()
    updateProfile.mutate(form)
  }

  // ── Avatar URL preview ──────────────────────────────────────────────────
  const handleAvatarChange = (url) => {
    setForm(f => ({ ...f, avatar_url: url }))
    setAvatarPreview(url)
  }

  // ── 2FA ─────────────────────────────────────────────────────────────────
  const [twoFASetup, setTwoFASetup] = useState(null)
  const [totpCode, setTotpCode] = useState('')

  const enable2FA = useMutation({
    mutationFn: () => api.post('/auth/2fa/enable').then(r => r.data),
    onSuccess: (data) => setTwoFASetup(data),
    onError: () => toast.error('Failed to enable 2FA'),
  })

  const verify2FA = useMutation({
    mutationFn: (code) => api.post('/auth/2fa/verify', { code }).then(r => r.data),
    onSuccess: () => {
      toast.success('2FA enabled successfully!')
      setTwoFASetup(null)
      setTotpCode('')
    },
    onError: () => toast.error('Invalid code — try again'),
  })

  const disable2FA = useMutation({
    mutationFn: (code) => api.post('/auth/2fa/disable', { code }).then(r => r.data),
    onSuccess: () => {
      toast.success('2FA disabled')
      setTotpCode('')
    },
    onError: () => toast.error('Invalid code — try again'),
  })

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-heading font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          My Profile
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="mt-1">
          Manage your account settings and security
        </p>
      </div>

      {/* Avatar + Identity */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={user?.full_name}
                className="w-24 h-24 rounded-2xl object-cover"
                style={{ border: '2px solid var(--color-border)' }}
                onError={() => setAvatarPreview(null)}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-2xl text-white"
                style={{ background: 'var(--gradient-hero)' }}
              >
                {initials}
              </div>
            )}
            <div
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Upload size={14} />
            </div>
          </div>

          {/* Identity info */}
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xl font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {user?.full_name}
              </span>
              <span
                className="badge badge-primary text-xs capitalize"
              >
                {user?.role}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Mail size={13} /> {user?.email}
            </div>
            <div className="flex items-center gap-1.5 text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <AtSign size={13} /> {user?.username}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="card p-6 mb-6">
        <h2
          className="text-base font-heading font-bold mb-5 flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <User size={16} /> Edit Profile
        </h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Full Name
            </label>
            <input
              className="form-input w-full"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Username
            </label>
            <div className="relative">
              <AtSign
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                className="form-input w-full pl-9"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Bio
            </label>
            <textarea
              className="form-input w-full resize-none"
              rows={3}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell learners about yourself..."
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Avatar URL
            </label>
            <input
              className="form-input w-full"
              value={form.avatar_url}
              onChange={e => handleAvatarChange(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Enter a public image URL for your profile picture
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateProfile.isPending}
            >
              <Save size={16} />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change */}
      <div className="card p-6 mb-6">
        <h2
          className="text-base font-heading font-bold mb-5 flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <KeyRound size={16} /> Change Password
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pwForm.next !== pwForm.confirm) {
              toast.error('New passwords do not match')
              return
            }
            if (pwForm.next.length < 8) {
              toast.error('Password must be at least 8 characters')
              return
            }
            api.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.next })
              .then(() => {
                toast.success('Password updated successfully')
                setPwForm({ current: '', next: '', confirm: '' })
              })
              .catch(err => toast.error(err?.response?.data?.detail || 'Password change failed'))
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="form-label">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input pr-10"
                value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.next}
              onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Confirm new password"
              required
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-secondary">
              <KeyRound size={16} /> Update Password
            </button>
          </div>
        </form>
      </div>

      {/* 2FA Section */}
      <div className="card p-6 mb-6">
        <h2
          className="text-base font-heading font-bold mb-2 flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <ShieldCheck size={16} /> Two-Factor Authentication
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
          Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)
        </p>

        {/* Status badge */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`badge ${user?.is_2fa_enabled ? 'badge-success' : 'badge-warning'}`}
          >
            {user?.is_2fa_enabled ? '✓ Enabled' : '✗ Disabled'}
          </span>
        </div>

        {!twoFASetup && !user?.is_2fa_enabled && (
          <button
            className="btn btn-secondary"
            onClick={() => enable2FA.mutate()}
            disabled={enable2FA.isPending}
          >
            <ShieldCheck size={16} />
            {enable2FA.isPending ? 'Setting up...' : 'Enable 2FA'}
          </button>
        )}

        {twoFASetup && (
          <div className="flex flex-col gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                1. Scan the QR code with your authenticator app:
              </p>
              <img
                src={`data:image/png;base64,${twoFASetup.qr_code_image_b64}`}
                alt="2FA QR Code"
                className="w-48 h-48 rounded-xl mx-auto"
                style={{ border: '1px solid var(--color-border)' }}
              />
              <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Or enter manually: <code className="font-mono">{twoFASetup.secret}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                2. Enter the 6-digit code to confirm:
              </label>
              <div className="flex gap-3">
                <input
                  className="form-input flex-1 text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => verify2FA.mutate(totpCode)}
                  disabled={totpCode.length < 6 || verify2FA.isPending}
                >
                  <CheckCircle size={16} /> Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {user?.is_2fa_enabled && (
          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Enter your current authenticator code to disable 2FA:
            </p>
            <div className="flex gap-3">
              <input
                className="input flex-1 text-center text-lg font-mono tracking-widest"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
              />
              <button
                className="btn btn-danger"
                onClick={() => disable2FA.mutate(totpCode)}
                disabled={totpCode.length < 6 || disable2FA.isPending}
              >
                <ShieldOff size={16} /> Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="card p-6">
        <h2
          className="text-base font-heading font-bold mb-4 flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <KeyRound size={16} /> Account Info
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Email</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Role</span>
            <span className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{user?.role}</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Account Status</span>
            <span className="badge badge-success text-xs">Active</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>2FA</span>
            <span className={`badge text-xs ${user?.is_2fa_enabled ? 'badge-success' : 'badge-warning'}`}>
              {user?.is_2fa_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
