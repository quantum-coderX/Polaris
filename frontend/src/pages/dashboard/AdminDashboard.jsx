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
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-heading text-white mb-1">Admin Panel</h1>
      <p className="text-gray-400 mb-8">Platform overview and content moderation</p>

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users },
          { label: 'Total Courses', value: stats?.total_courses ?? 0, icon: BookOpen },
          { label: 'Pending Review', value: stats?.pending_courses ?? 0, icon: Clock },
          { label: 'Total Revenue', value: `$${(stats?.total_revenue ?? 0).toFixed(2)}`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <Icon size={14} />{label}
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Pending Courses */}
      <section className="mb-8">
        <h2 className="text-lg font-heading font-bold mb-4 text-white">Pending Course Reviews ({pendingCourses?.length ?? 0})</h2>
        {pendingCourses?.length === 0 && <p className="text-gray-400">No courses pending review.</p>}
        <div className="flex flex-col gap-3">
          {pendingCourses?.map(course => (
            <div key={course.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold text-white">{course.title}</div>
                <div className="text-gray-400 text-xs mt-1">{course.level} · {course.language} · ${course.price}</div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  className="btn btn-sm flex-1 sm:flex-initial" 
                  style={{ background: 'rgba(0,212,200,0.15)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.3)' }} 
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
        <h2 className="text-lg font-heading font-bold mb-4 text-white">Pending Mentor Approvals ({pendingMentors?.length ?? 0})</h2>
        {pendingMentors?.length === 0 && <p className="text-gray-400">No mentor approvals pending.</p>}
        <div className="flex flex-col gap-3">
          {pendingMentors?.map(mentor => (
            <div key={mentor.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold text-white">{mentor.full_name}</div>
                <div className="text-gray-400 text-xs mt-1">{mentor.email} · @{mentor.username}</div>
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
