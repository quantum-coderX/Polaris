import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, BookOpen, Users, DollarSign, Star } from 'lucide-react'
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

export default function MentorDashboard() {
  const { user } = useAuthStore()

  const { data: analytics } = useQuery({
    queryKey: ['mentor-analytics', user?.id],
    queryFn: () => api.get(`/admin/mentors/${user.id}/analytics`).then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: courses } = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: () => api.get('/courses/mine').then(r => r.data),
  })

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold" style={{ color: 'var(--color-text)' }}>
            Mentor Dashboard
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>Manage your courses and track performance</p>
        </div>
        <Link to="/mentor/courses/new" className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} /> New Course
        </Link>
      </div>

      {/* Geometric Metric Grid */}
      <div className="grid-4 mb-8">
        <MetricCard
          label="Total Students"
          value={analytics?.total_enrollments ?? 0}
          icon={Users}
          color="violet"
          sub="enrolled learners"
        />
        <MetricCard
          label="Revenue"
          value={`$${analytics?.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}`}
          icon={DollarSign}
          color="green"
          sub="lifetime earnings"
        />
        <MetricCard
          label="Avg Rating"
          value={analytics?.average_rating ?? '—'}
          icon={Star}
          color="amber"
          sub="across all courses"
        />
        <MetricCard
          label="Courses"
          value={analytics?.published_courses ?? 0}
          icon={BookOpen}
          color="sky"
          sub="published"
        />
      </div>

      {/* Course List */}
      <h2 className="text-lg font-heading font-bold mb-4" style={{ color: 'var(--color-text)' }}>My Courses</h2>
      {!courses?.length ? (
        <div className="card text-center p-12">
          <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>No courses created yet</h3>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Create your first course to begin teaching!</p>
          <Link to="/mentor/courses/new" className="btn btn-primary">Create Course</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map(course => (
            <div key={course.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>{course.title}</div>
                <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{course.level} · {course.language}</div>
              </div>
              <div className="flex gap-3 items-center w-full sm:w-auto justify-between sm:justify-start">
                <span className={`badge ${
                  course.status === 'published' ? 'badge-success' :
                  course.status === 'pending'   ? 'badge-warning' :
                  course.status === 'rejected'  ? 'badge-danger'  : 'badge-primary'
                }`}>{course.status}</span>
                <Link to={`/mentor/courses/${course.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
