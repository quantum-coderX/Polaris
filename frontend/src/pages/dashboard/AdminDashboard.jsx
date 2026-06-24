// Admin Dashboard — platform overview and moderation
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, BookOpen, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

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

export default function AdminDashboard() {
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const { data: pendingCourses } = useQuery({
    queryKey: ['pending-courses'],
    queryFn: () => api.get('/admin/courses/pending').then(r => r.data),
  })

  const { data: pendingMentors } = useQuery({
    queryKey: ['pending-mentors'],
    queryFn: () => api.get('/admin/users/pending-mentors').then(r => r.data),
  })

  const approveCourse = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['pending-courses']); toast.success('Course approved!') },
  })

  const rejectCourse = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries(['pending-courses']); toast.success('Course rejected') },
  })

  const approveMentor = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['pending-mentors']); toast.success('Mentor approved!') },
  })

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-heading font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        Admin Panel
      </h1>
      <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>Platform overview and content moderation</p>

      {/* Geometric Metric Grid */}
      <div className="grid-4 mb-8">
        <MetricCard
          label="Total Users"
          value={stats?.total_users ?? 0}
          icon={Users}
          color="violet"
          sub="registered accounts"
        />
        <MetricCard
          label="Total Courses"
          value={stats?.total_courses ?? 0}
          icon={BookOpen}
          color="sky"
          sub="on platform"
        />
        <MetricCard
          label="Pending Review"
          value={stats?.pending_courses ?? 0}
          icon={Clock}
          color="amber"
          sub="awaiting approval"
        />
        <MetricCard
          label="Total Revenue"
          value={`$${(stats?.total_revenue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          color="green"
          sub="platform earnings"
        />
      </div>

      {/* Pending Courses */}
      <section className="mb-8">
        <h2 className="text-lg font-heading font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          Pending Course Reviews ({pendingCourses?.length ?? 0})
        </h2>
        {pendingCourses?.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>No courses pending review.</p>
        )}
        <div className="flex flex-col gap-3">
          {pendingCourses?.map(course => (
            <div key={course.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{course.title}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {course.level} · {course.language} · ${course.price}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="btn btn-sm flex-1 sm:flex-initial"
                  style={{ background: 'rgba(0,212,200,0.12)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.25)' }}
                  onClick={() => approveCourse.mutate(course.id)}
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button className="btn btn-danger btn-sm flex-1 sm:flex-initial" onClick={() => rejectCourse.mutate(course.id)}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Mentors */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          Pending Mentor Approvals ({pendingMentors?.length ?? 0})
        </h2>
        {pendingMentors?.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>No mentor approvals pending.</p>
        )}
        <div className="flex flex-col gap-3">
          {pendingMentors?.map(mentor => (
            <div key={mentor.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{mentor.full_name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {mentor.email} · @{mentor.username}
                </div>
              </div>
              <button className="btn btn-primary btn-sm w-full sm:w-auto" onClick={() => approveMentor.mutate(mentor.id)}>
                <CheckCircle size={16} /> Approve Mentor
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
