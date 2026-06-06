import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

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
import StudentDashboard from './pages/dashboard/StudentDashboard'
import MentorDashboard from './pages/dashboard/MentorDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import CourseEditor from './pages/mentor/CourseEditor'

// Guards
const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
        </Route>

        {/* Student protected */}
        <Route element={<ProtectedRoute roles={['student', 'mentor', 'admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/learn/:courseId/:lessonId?" element={<Learn />} />
          <Route path="/checkout/:courseId" element={<Checkout />} />
        </Route>

        {/* Mentor protected */}
        <Route element={<ProtectedRoute roles={['mentor', 'admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/mentor" element={<MentorDashboard />} />
          <Route path="/mentor/courses/new" element={<CourseEditor />} />
          <Route path="/mentor/courses/:courseId/edit" element={<CourseEditor />} />
        </Route>

        {/* Admin protected */}
        <Route element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
