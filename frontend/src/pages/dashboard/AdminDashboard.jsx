// Admin Dashboard — platform overview and moderation
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, BookOpen, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

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
    <div className="animate-fadein">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Admin Panel</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Platform overview and content moderation</p>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users },
          { label: 'Total Courses', value: stats?.total_courses ?? 0, icon: BookOpen },
          { label: 'Pending Review', value: stats?.pending_courses ?? 0, icon: Clock },
          { label: 'Total Revenue', value: `$${(stats?.total_revenue ?? 0).toFixed(2)}`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card__label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Icon size={14} />{label}
            </div>
            <div className="stat-card__value">{value}</div>
          </div>
        ))}
      </div>

      {/* Pending Courses */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pending Course Reviews ({pendingCourses?.length ?? 0})</h2>
        {pendingCourses?.length === 0 && <p className="text-muted">No courses pending review.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingCourses?.map(course => (
            <div key={course.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{course.title}</div>
                <div className="text-muted text-sm">{course.level} · {course.language} · ${course.price}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm" style={{ background: 'rgba(0,212,200,0.15)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.3)' }} onClick={() => approveCourse.mutate(course.id)}>
                  <CheckCircle size={16} /> Approve
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => rejectCourse.mutate(course.id)}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Mentors */}
      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pending Mentor Approvals ({pendingMentors?.length ?? 0})</h2>
        {pendingMentors?.length === 0 && <p className="text-muted">No mentor approvals pending.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingMentors?.map(mentor => (
            <div key={mentor.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{mentor.full_name}</div>
                <div className="text-muted text-sm">{mentor.email} · @{mentor.username}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => approveMentor.mutate(mentor.id)}>
                <CheckCircle size={16} /> Approve Mentor
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
