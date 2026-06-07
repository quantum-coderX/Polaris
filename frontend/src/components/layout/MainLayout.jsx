import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      logout()
      navigate('/login')
      toast.success('Logged out')
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="container navbar__inner">
          <NavLink to="/" className="navbar__logo">Polaris</NavLink>

          <div className="navbar__links">
            <NavLink to="/courses" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
              Courses
            </NavLink>

            {isAuthenticated() ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Dashboard
                </NavLink>
                {user?.role === 'mentor' && (
                  <NavLink to="/mentor" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                    My Courses
                  </NavLink>
                )}
                {user?.role === 'admin' && (
                  <NavLink to="/admin" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                    Admin
                  </NavLink>
                )}
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
                  Login
                </NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">Get Started</NavLink>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '2rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        <div className="container">
          © 2025 Polaris. All rights reserved.
        </div>
      </footer>
    </>
  )
}
