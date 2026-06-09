import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, BookOpen, Star } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function StudentDashboard() {
  const { user } = useAuthStore()

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/enrollments/my').then(r => r.data),
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=5').then(r => r.data),
  })

  return (
    <div className="animate-fadein">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Welcome back, <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.full_name}</span> 👋</h1>
        <p className="text-muted">Continue where you left off</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card__label">Enrolled</div>
          <div className="stat-card__value">{enrollments?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Completed</div>
          <div className="stat-card__value">{enrollments?.filter(e => e.status === 'completed').length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Certificates</div>
          <div className="stat-card__value">{enrollments?.filter(e => e.certificate_url).length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">In Progress</div>
          <div className="stat-card__value">{enrollments?.filter(e => e.status === 'active' && e.progress_percent > 0).length ?? 0}</div>
        </div>
      </div>

      {/* My Courses */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>My Courses</h2>
      {!enrollments?.length ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-text-muted)' }} />
          <h3>No courses yet</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Start learning today!</p>
          <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {enrollments.map(enrollment => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}

      {/* Recent Notifications */}
      {notifications?.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Recent Notifications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map(n => (
              <div key={n.id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.title}</div>
                  <div className="text-muted text-sm">{n.message}</div>
                </div>
                {!n.is_read && <span className="badge badge-primary">New</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EnrollmentCard({ enrollment }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Course #{enrollment.course_id}</div>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${enrollment.progress_percent}%` }} />
        </div>
        <div className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>{enrollment.progress_percent}% complete</div>
      </div>
      <Link to={`/learn/${enrollment.course_id}`} className="btn btn-primary btn-sm">Continue</Link>
      {enrollment.certificate_url && (
        <a href={enrollment.certificate_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Certificate</a>
      )}
    </div>
  )
}
