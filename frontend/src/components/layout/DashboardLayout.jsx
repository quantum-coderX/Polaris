import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LayoutDashboard, BookOpen, Users, Settings, Bell, BarChart3, ShieldCheck } from 'lucide-react'

export default function DashboardLayout() {
  const { user } = useAuthStore()

  const studentLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Learning' },
    { to: '/courses', icon: BookOpen, label: 'Browse Courses' },
  ]

  const mentorLinks = [
    { to: '/mentor', icon: BarChart3, label: 'Analytics' },
    { to: '/mentor/courses/new', icon: BookOpen, label: 'New Course' },
  ]

  const adminLinks = [
    { to: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ]

  const links = user?.role === 'admin'
    ? adminLinks
    : user?.role === 'mentor'
    ? [...mentorLinks, ...studentLinks]
    : studentLinks

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '2rem', background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LearnHub
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `sidebar__item${isActive ? ' active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
              {user?.full_name?.[0] ?? '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '2rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
