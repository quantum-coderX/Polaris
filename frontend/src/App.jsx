import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, AUTH_STATUS, ROLES, bootstrapAuthSession } from './store/authStore'

// Layouts
import MainLayout from './components/layout/MainLayout'
import DashboardLayout from './components/layout/DashboardLayout'

// Public Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'

// Protected Pages
import Learn from './pages/Learn'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import MentorDashboard from './pages/dashboard/MentorDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import AdminUsers from './pages/dashboard/AdminUsers'
import AdminLogin from './pages/AdminLogin'
import CourseEditor from './pages/mentor/CourseEditor'
import CertificatePage from './pages/CertificatePage'

function roleLabel(role) {
  if (role === ROLES.ADMIN) return 'Admin'
  if (role === ROLES.MENTOR) return 'Mentor'
  if (role === ROLES.STUDENT) return 'Student'
  return role
}

const ProtectedRoute = ({ children, roles }) => {
  const { authStatus, user, hasAnyRole } = useAuthStore()
  const location = useLocation()

  if (authStatus === AUTH_STATUS.IDLE || authStatus === AUTH_STATUS.AUTHENTICATING) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        data-auth-status={authStatus}
      >
        <span className="spinner w-8 h-8 border-2" aria-label="Verifying session" />
      </div>
    )
  }

  if (authStatus !== AUTH_STATUS.AUTHENTICATED || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          reason: 'unauthenticated',
          message: 'Please sign in to access this page.',
          from: location.pathname,
        }}
      />
    )
  }

  if (roles && !hasAnyRole(roles)) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          reason: 'unauthorized',
          message: `Access denied. ${roleLabel(user.role)} accounts cannot open this area.`,
          from: location.pathname,
          requiredRoles: roles,
        }}
      />
    )
  }

  return children
}

function AuthRoot({ children }) {
  const authStatus = useAuthStore((state) => state.authStatus)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    bootstrapAuthSession().finally(() => setReady(true))
  }, [])

  const status =
    !ready && authStatus === AUTH_STATUS.IDLE
      ? AUTH_STATUS.AUTHENTICATING
      : authStatus

  return (
    <div id="app-root" data-auth-status={status}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRoot>
        <Routes>
          {/* Public */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/courses" element={<CourseList />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/certificates/verify/:certId" element={<CertificatePage />} />
          </Route>

          {/* Student protected */}
          <Route element={<ProtectedRoute roles={[ROLES.STUDENT, ROLES.MENTOR, ROLES.ADMIN]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/learn/:courseId/:lessonId?" element={<Learn />} />
            <Route path="/checkout/:courseId" element={<Checkout />} />
          </Route>

          {/* Mentor protected */}
          <Route element={<ProtectedRoute roles={[ROLES.MENTOR, ROLES.ADMIN]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/mentor" element={<MentorDashboard />} />
            <Route path="/mentor/courses/new" element={<CourseEditor />} />
            <Route path="/mentor/courses/:courseId/edit" element={<CourseEditor />} />
          </Route>

          {/* Admin protected */}
          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthRoot>
    </BrowserRouter>
  )
}
