import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      logout()
      setIsMobileMenuOpen(false)
      navigate('/login')
      toast.success('Logged out')
    }
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const handleLinkClick = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <nav className="navbar">
        <div className="container navbar__inner relative">
          <NavLink to="/" className="navbar__logo" onClick={handleLinkClick}>Polaris</NavLink>

          <div className="flex items-center gap-3 lg:hidden">
            {/* Theme toggle — mobile */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Hamburger */}
            <button
              className="p-2 rounded-xl transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={toggleMobileMenu}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop & Mobile Links */}
          <div className={`
            navbar__links
            ${isMobileMenuOpen
              ? 'absolute top-full left-0 right-0 border-b p-6 flex flex-col items-start gap-4 z-50 animate-fade-in'
              : 'hidden lg:flex lg:items-center lg:gap-6'
            }
          `}
            style={isMobileMenuOpen ? { background: 'var(--color-surface)', borderColor: 'var(--color-border)' } : {}}
          >
            <NavLink
              to="/courses"
              className={({ isActive }) => `navbar__link w-full lg:w-auto ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              Courses
            </NavLink>

            {isAuthenticated() ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `navbar__link w-full lg:w-auto ${isActive ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Dashboard
                </NavLink>
                {user?.role === 'mentor' && (
                  <NavLink
                    to="/mentor"
                    className={({ isActive }) => `navbar__link w-full lg:w-auto ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    My Courses
                  </NavLink>
                )}
                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `navbar__link w-full lg:w-auto ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    Admin
                  </NavLink>
                )}
                <button
                  className="btn btn-secondary btn-sm w-full lg:w-auto text-center mt-2 lg:mt-0"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) => `navbar__link w-full lg:w-auto ${isActive ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn btn-primary btn-sm w-full lg:w-auto text-center mt-2 lg:mt-0"
                  onClick={handleLinkClick}
                >
                  Get Started
                </NavLink>
              </>
            )}

            {/* Theme toggle — desktop (inside links row) */}
            <button
              className="theme-toggle hidden lg:flex"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t py-8 mt-16 text-center text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
        <div className="container">
          © {new Date().getFullYear()} Polaris. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
