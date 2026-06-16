import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { 
  LayoutDashboard, BookOpen, Users,
  BarChart3, ShieldCheck, Menu, X, LogOut
} from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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

  const handleLinkClick = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg text-white">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-surface border-b border-border w-full">
        <div className="font-heading font-extrabold text-lg bg-gradient-hero bg-clip-text text-transparent">
          Polaris
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 text-gray-400 hover:text-white focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
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
          {/* Close button inside sidebar on mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
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

        <div className="mt-auto pt-6 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-border">
            <div className="w-9 h-9 rounded-full bg-gradient-hero display flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
              {user?.full_name?.[0] ?? '?'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold truncate">{user?.full_name}</div>
              <div className="text-xs text-gray-400 capitalize truncate">{user?.role}</div>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
