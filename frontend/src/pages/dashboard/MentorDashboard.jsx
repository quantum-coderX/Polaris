// Mentor Dashboard — analytics + my courses list
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, BookOpen, Users, DollarSign, Star } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function MentorDashboard() {
  const { user } = useAuthStore()

  const { data: analytics } = useQuery({
    queryKey: ['mentor-analytics', user?.id],
    queryFn: () => api.get(`/admin/mentors/${user.id}/analytics`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: courses } = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: () => api.get('/courses?limit=50').then(r => r.data),
  })

  return (
    <div className="animate-fadein">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Mentor Dashboard</h1>
          <p className="text-muted">Manage your courses and track performance</p>
        </div>
        <Link to="/mentor/courses/new" className="btn btn-primary">
          <Plus size={18} /> New Course
        </Link>
      </div>

      {/* Analytics */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card glow-pulse">
          <div className="stat-card__label"><Users size={14} style={{ display: 'inline' }} /> Students</div>
          <div className="stat-card__value">{analytics?.total_enrollments ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><DollarSign size={14} style={{ display: 'inline' }} /> Revenue</div>
          <div className="stat-card__value">${analytics?.total_revenue?.toFixed(2) ?? '0.00'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><Star size={14} style={{ display: 'inline' }} /> Avg Rating</div>
          <div className="stat-card__value">{analytics?.average_rating ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label"><BookOpen size={14} style={{ display: 'inline' }} /> Courses</div>
          <div className="stat-card__value">{analytics?.published_courses ?? 0}</div>
        </div>
      </div>

      {/* Course List */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>My Courses</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {courses?.map(course => (
          <div key={course.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{course.title}</div>
              <div className="text-muted text-sm">{course.level} · {course.language}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge ${
                course.status === 'published' ? 'badge-success' :
                course.status === 'pending' ? 'badge-warning' :
                course.status === 'rejected' ? 'badge-danger' : 'badge-primary'
              }`}>{course.status}</span>
              <Link to={`/mentor/courses/${course.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
