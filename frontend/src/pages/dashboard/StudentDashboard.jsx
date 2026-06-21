import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
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
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">
          Welcome back, <span className="bg-gradient-hero bg-clip-text text-transparent">{user?.full_name}</span> 👋
        </h1>
        <p className="text-gray-400">Continue where you left off</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-label">Enrolled</div>
          <div className="stat-value">{enrollments?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{enrollments?.filter(e => e.status === 'completed').length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Certificates</div>
          <div className="stat-value">{enrollments?.filter(e => e.certificate_url).length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{enrollments?.filter(e => e.status === 'active' && e.progress_percent > 0).length ?? 0}</div>
        </div>
      </div>

      {/* My Courses */}
      <h2 className="text-lg font-heading font-bold mb-4 text-white">My Courses</h2>
      {!enrollments?.length ? (
        <div className="card text-center p-12">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-bold mb-2">No courses yet</h3>
          <p className="text-gray-400 mb-6">Start learning today!</p>
          <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enrollments.map(enrollment => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}

      {/* Recent Notifications */}
      {notifications?.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-heading font-bold mb-4 text-white">Recent Notifications</h2>
          <div className="flex flex-col gap-2">
            {notifications.map(n => (
              <div key={n.id} className="card p-4 flex justify-between items-center gap-4">
                <div>
                  <div className="font-semibold text-sm text-white">{n.title}</div>
                  <div className="text-gray-400 text-xs mt-1">{n.message}</div>
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
  const [generating, setGenerating] = useState(false)
  const [certUrl, setCertUrl] = useState(enrollment.certificate_url ?? null)
  const qc = useQueryClient()

  const thumbnail = enrollment.course_thumbnail
    ?? `https://picsum.photos/seed/${enrollment.course_id}/120/68`
  const title = enrollment.course_title ?? `Course #${enrollment.course_id}`

  const handleGenCert = async () => {
    setGenerating(true)
    try {
      const { generateCertificate } = await import('../../services/api')
      const data = await generateCertificate(enrollment.course_id)
      setCertUrl(data.download_url || data.certificate_url)
      qc.invalidateQueries(['my-enrollments'])
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  const canGetCert = enrollment.progress_percent >= 100 && !certUrl

  return (
    <div className="card flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      {/* Thumbnail */}
      <img
        src={thumbnail}
        alt={title}
        className="w-24 h-14 object-cover rounded-lg shrink-0 hidden md:block"
      />
      <div className="flex-1 w-full min-w-0">
        <div className="font-semibold text-white mb-2 truncate">{title}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${enrollment.progress_percent}%` }} />
        </div>
        <div className="text-gray-400 text-xs mt-1">{enrollment.progress_percent}% complete</div>
      </div>
      <div className="flex gap-2 w-full md:w-auto flex-wrap">
        <Link to={`/learn/${enrollment.course_id}`} className="btn btn-primary btn-sm flex-1 md:flex-initial text-center">
          Continue
        </Link>
        {canGetCert && (
          <button
            className="btn btn-sm flex-1 md:flex-initial text-center"
            style={{ background: 'rgba(0,212,200,0.15)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.3)' }}
            onClick={handleGenCert}
            disabled={generating}
          >
            {generating ? 'Generating...' : '🏆 Get Certificate'}
          </button>
        )}
        {certUrl && (
          <a
            href={certUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm flex-1 md:flex-initial text-center"
          >
            Certificate
          </a>
        )}
      </div>
    </div>
  )
}


