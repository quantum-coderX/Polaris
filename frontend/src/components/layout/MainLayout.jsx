import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Menu, X } from 'lucide-react'

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-white">
      <nav className="navbar">
        <div className="container navbar__inner relative">
          <NavLink to="/" className="navbar__logo" onClick={handleLinkClick}>Polaris</NavLink>

          {/* Hamburger Menu Icon */}
          <button
            className="lg:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop & Mobile Links */}
          <div className={`
            navbar__links
            ${isMobileMenuOpen 
              ? 'absolute top-full left-0 right-0 bg-surface border-b border-border p-6 flex flex-col items-start gap-4 z-50 animate-fade-in' 
              : 'hidden lg:flex lg:items-center lg:gap-6'
            }
          `}>
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
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8 mt-16 text-center text-gray-500 text-sm bg-surface/50">
        <div className="container">
          © {new Date().getFullYear()} Polaris. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
