import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Award, CheckCircle2, Layers } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

function MetricCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        <div className="metric-card__icon-wrap">
          <div
            className="w-9 h-9 rounded-xl"
            style={{ background: `var(--metric-stripe, #7c5cfc)`, opacity: 0.15 }}
          />
          <Icon
            size={18}
            className="metric-card__icon-inner"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
      <div className="metric-card__value">{value}</div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </div>
  )
}

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
        <h1 className="text-2xl md:text-3xl font-heading font-bold" style={{ color: 'var(--color-text)' }}>
          Welcome back, <span className="bg-gradient-hero bg-clip-text text-transparent">{user?.full_name}</span> 👋
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>Continue where you left off</p>
      </div>

      {/* Geometric Metric Grid */}
      <div className="grid-4 mb-8">
        <MetricCard
          label="Enrolled"
          value={enrollments?.length ?? 0}
          icon={Layers}
          color="violet"
          sub="total courses"
        />
        <MetricCard
          label="Completed"
          value={enrollments?.filter(e => e.status === 'completed').length ?? 0}
          icon={CheckCircle2}
          color="green"
          sub="finished courses"
        />
        <MetricCard
          label="Certificates"
          value={enrollments?.filter(e => e.certificate_url).length ?? 0}
          icon={Award}
          color="amber"
          sub="earned"
        />
        <MetricCard
          label="In Progress"
          value={enrollments?.filter(e => e.status === 'active' && e.progress_percent > 0).length ?? 0}
          icon={BookOpen}
          color="sky"
          sub="active courses"
        />
      </div>

      {/* My Courses */}
      <h2 className="text-lg font-heading font-bold mb-4" style={{ color: 'var(--color-text)' }}>My Courses</h2>
      {!enrollments?.length ? (
        <div className="card text-center p-12">
          <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>No courses yet</h3>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Start learning today!</p>
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
          <h2 className="text-lg font-heading font-bold mb-4" style={{ color: 'var(--color-text)' }}>Recent Notifications</h2>
          <div className="flex flex-col gap-2">
            {notifications.map(n => (
              <div key={n.id} className="card p-4 flex justify-between items-center gap-4">
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{n.title}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{n.message}</div>
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
      <img
        src={thumbnail}
        alt={title}
        className="w-24 h-14 object-cover rounded-lg shrink-0 hidden md:block"
      />
      <div className="flex-1 w-full min-w-0">
        <div className="font-semibold mb-2 truncate" style={{ color: 'var(--color-text)' }}>{title}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${enrollment.progress_percent}%` }} />
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{enrollment.progress_percent}% complete</div>
      </div>
      <div className="flex gap-2 w-full md:w-auto flex-wrap">
        <Link to={`/learn/${enrollment.course_id}`} className="btn btn-primary btn-sm flex-1 md:flex-initial text-center">
          Continue
        </Link>
        {canGetCert && (
          <button
            className="btn btn-sm flex-1 md:flex-initial text-center"
            style={{ background: 'rgba(0,212,200,0.12)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.25)' }}
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
