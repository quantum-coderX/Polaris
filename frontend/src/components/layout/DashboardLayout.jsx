import { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, AUTH_STATUS, ROLES } from '../../store/authStore'
import {
  LayoutDashboard, BookOpen, Users,
  BarChart3, ShieldCheck, Menu, X, LogOut, Sun, Moon, UserCircle
} from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

/** Route prefixes and the roles allowed to access them (defense-in-depth). */
const ROUTE_ROLE_RULES = [
  { prefix: '/admin', roles: [ROLES.ADMIN] },
  { prefix: '/mentor', roles: [ROLES.MENTOR, ROLES.ADMIN] },
  { prefix: '/dashboard', roles: [ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN] },
  { prefix: '/profile', roles: [ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN] },
  { prefix: '/learn', roles: [ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN] },
  { prefix: '/checkout', roles: [ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN] },
]

function requiredRolesForPath(pathname) {
  const rule = ROUTE_ROLE_RULES.find(({ prefix }) => pathname.startsWith(prefix))
  return rule?.roles ?? [ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN]
}

function roleLabel(role) {
  if (role === ROLES.ADMIN) return 'Admin'
  if (role === ROLES.MENTOR) return 'Mentor'
  if (role === ROLES.STUDENT) return 'Student'
  return role
}

export default function DashboardLayout() {
  const { user, logout, authStatus, hasAnyRole } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  const allowedRoles = useMemo(
    () => requiredRolesForPath(location.pathname),
    [location.pathname],
  )

  useEffect(() => {
    if (authStatus === AUTH_STATUS.IDLE || authStatus === AUTH_STATUS.AUTHENTICATING) {
      return
    }

    if (authStatus === AUTH_STATUS.UNAUTHENTICATED || !user) {
      navigate('/login', {
        replace: true,
        state: {
          reason: 'unauthenticated',
          message: 'Please sign in to access this page.',
          from: location.pathname,
        },
      })
      return
    }

    if (!hasAnyRole(allowedRoles)) {
      navigate('/login', {
        replace: true,
        state: {
          reason: 'unauthorized',
          message: `Access denied. ${roleLabel(user.role)} accounts cannot open this area.`,
          from: location.pathname,
          requiredRoles: allowedRoles,
        },
      })
    }
  }, [authStatus, user, allowedRoles, hasAnyRole, navigate, location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: {
        reason: 'logged_out',
        message: 'You have been signed out.',
      },
    })
  }

  const studentLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Learning' },
    { to: '/courses', icon: BookOpen, label: 'Browse Courses' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ]

  const mentorLinks = [
    { to: '/mentor', icon: BarChart3, label: 'Analytics' },
    { to: '/mentor/courses/new', icon: BookOpen, label: 'New Course' },
  ]

  const adminLinks = [
    { to: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ]

  const links =
    user?.role === ROLES.ADMIN
      ? [...adminLinks, ...studentLinks]
      : user?.role === ROLES.MENTOR
        ? [...mentorLinks, ...studentLinks]
        : studentLinks

  const handleLinkClick = () => setIsSidebarOpen(false)

  const isResolvingSession =
    authStatus === AUTH_STATUS.IDLE || authStatus === AUTH_STATUS.AUTHENTICATING

  if (isResolvingSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
        data-auth-status={authStatus}
        data-user-role={user?.role ?? 'none'}
      >
        <span className="spinner w-8 h-8 border-2" aria-label="Loading session" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      data-auth-status={authStatus}
      data-user-role={user?.role ?? 'none'}
    >
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="font-heading font-extrabold text-lg bg-gradient-hero bg-clip-text text-transparent">
          Polaris
        </div>
        <div className="flex items-center gap-2">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        sidebar
        fixed inset-y-0 left-0 z-50 transform -translate-x-full
        lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : ''}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="font-heading font-extrabold text-xl bg-gradient-hero bg-clip-text text-transparent">
            Polaris
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 flex flex-col gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
              {user?.full_name?.[0] ?? '?'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{user?.full_name}</div>
              <div className="text-xs capitalize truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.role}</div>
            </div>
          </div>

          <button
            className="sidebar-item w-full justify-between"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
          </button>

          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-item w-full"
            style={{ color: 'var(--color-accent)' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 overflow-auto" style={{ background: 'var(--color-bg)' }}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
