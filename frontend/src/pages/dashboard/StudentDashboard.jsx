import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BookOpen, Award, CheckCircle2, Layers, Clock, PlayCircle,
  TrendingUp, Bell, ArrowRight, Sparkles
} from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { getAcademiaThumb } from '../Home'

function MetricCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        <div className="metric-card__icon-wrap">
          <Icon size={18} className="metric-card__icon-inner" />
        </div>
      </div>
      <div className="metric-card__value">{value}</div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuthStore()

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/enrollments/my').then(r => r.data),
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=5').then(r => r.data),
  })

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') ?? []
  const completedCount = enrollments?.filter(e => e.status === 'completed').length ?? 0
  const certCount = enrollments?.filter(e => e.certificate_url).length ?? 0
  const inProgressCount = enrollments?.filter(e => e.status === 'active' && e.progress_percent > 0 && e.progress_percent < 100).length ?? 0

  // Most recent in-progress course for "Continue Learning" hero
  const continueCourse = activeEnrollments
    .filter(e => e.progress_percent > 0 && e.progress_percent < 100)
    .sort((a, b) => (b.last_accessed_at ?? '').localeCompare(a.last_accessed_at ?? ''))[0]
    ?? activeEnrollments[0]

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <div className="animate-fade-in">
      {/* Welcome hero */}
      <div className="dashboard-hero">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">My Learning</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-theme mb-1">
            Welcome back,{' '}
            <span className="bg-gradient-hero bg-clip-text text-transparent">{user?.full_name?.split(' ')[0]}</span>
          </h1>
          <p className="text-theme-muted text-sm md:text-base">
            {inProgressCount > 0
              ? `You have ${inProgressCount} course${inProgressCount !== 1 ? 's' : ''} in progress. Keep going!`
              : 'Start your learning journey today.'}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4 mb-8">
        <MetricCard label="Enrolled" value={enrollments?.length ?? 0} icon={Layers} color="violet" sub="total courses" />
        <MetricCard label="In Progress" value={inProgressCount} icon={TrendingUp} color="sky" sub="active learning" />
        <MetricCard label="Completed" value={completedCount} icon={CheckCircle2} color="green" sub="finished courses" />
        <MetricCard label="Certificates" value={certCount} icon={Award} color="amber" sub="earned credentials" />
      </div>

      {/* Continue Learning — featured card */}
      {continueCourse && (
        <div className="continue-card mb-8">
          <div className="continue-card__label">Continue where you left off</div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <img
              src={continueCourse.course_thumbnail ?? getAcademiaThumb(continueCourse.course_id)}
              alt={continueCourse.course_title}
              className="w-full sm:w-40 h-24 object-cover rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-lg text-theme truncate mb-1">
                {continueCourse.course_title ?? `Course #${continueCourse.course_id}`}
              </h2>
              <div className="flex items-center gap-3 text-xs text-theme-muted mb-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {continueCourse.progress_percent}% complete
                </span>
              </div>
              <div className="progress-bar mb-3">
                <div className="progress-fill" style={{ width: `${continueCourse.progress_percent}%` }} />
              </div>
              <Link
                to={`/learn/${continueCourse.course_id}`}
                className="btn btn-primary btn-sm inline-flex"
              >
                <PlayCircle size={16} /> Resume Learning
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* My Courses */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-bold text-theme">My Courses</h2>
        <Link to="/courses" className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
          Browse all <ArrowRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-48" style={{ background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      ) : !enrollments?.length ? (
        <div className="card text-center p-12">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.10)' }}>
            <BookOpen size={32} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-theme">No courses yet</h3>
          <p className="mb-6 text-theme-muted max-w-sm mx-auto">
            Explore our catalog and enroll in your first course to start learning.
          </p>
          <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map(enrollment => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}

      {/* Notifications */}
      {notifications?.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-theme-muted" />
            <h2 className="text-lg font-heading font-bold text-theme">Recent Updates</h2>
            {unreadCount > 0 && (
              <span className="badge badge-primary text-xs">{unreadCount} new</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className="card p-4 flex justify-between items-center gap-4"
                style={!n.is_read ? { borderColor: 'var(--color-primary)', background: 'rgba(139,92,246,0.04)' } : {}}
              >
                <div>
                  <div className="font-semibold text-sm text-theme">{n.title}</div>
                  <div className="text-xs mt-1 text-theme-muted">{n.message}</div>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
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

  const thumbnail = enrollment.course_thumbnail ?? getAcademiaThumb(enrollment.course_id)
  const title = enrollment.course_title ?? `Course #${enrollment.course_id}`
  const isComplete = enrollment.progress_percent >= 100

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

  const canGetCert = isComplete && !certUrl

  return (
    <div className="enrollment-card flex flex-col md:flex-row">
      <img src={thumbnail} alt={title} className="enrollment-card__thumb" />
      <div className="enrollment-card__body">
        <div className="enrollment-card__title">{title}</div>
        <div className="enrollment-card__meta">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {enrollment.progress_percent}% complete
          </span>
          {isComplete && (
            <span className="badge badge-success text-xs">Completed</span>
          )}
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${enrollment.progress_percent}%` }} />
        </div>
        <div className="enrollment-card__actions">
          <Link to={`/learn/${enrollment.course_id}`} className="btn btn-primary btn-sm">
            <PlayCircle size={14} />
            {enrollment.progress_percent > 0 ? 'Continue' : 'Start'}
          </Link>
          {canGetCert && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleGenCert}
              disabled={generating}
            >
              <Award size={14} />
              {generating ? 'Generating...' : 'Get Certificate'}
            </button>
          )}
          {certUrl && (
            <a href={certUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <Award size={14} /> View Certificate
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
