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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading text-white">Mentor Dashboard</h1>
          <p className="text-gray-400">Manage your courses and track performance</p>
        </div>
        <Link to="/mentor/courses/new" className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} /> New Course
        </Link>
      </div>

      {/* Analytics Grid */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-label flex items-center gap-1.5"><Users size={14} /> Students</div>
          <div className="stat-value">{analytics?.total_enrollments ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-1.5"><DollarSign size={14} /> Revenue</div>
          <div className="stat-value">${analytics?.total_revenue?.toFixed(2) ?? '0.00'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-1.5"><Star size={14} /> Avg Rating</div>
          <div className="stat-value">{analytics?.average_rating ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-1.5"><BookOpen size={14} /> Courses</div>
          <div className="stat-value">{analytics?.published_courses ?? 0}</div>
        </div>
      </div>

      {/* Course List */}
      <h2 className="text-lg font-heading font-bold mb-4 text-white">My Courses</h2>
      {!courses?.length ? (
        <div className="card text-center p-12">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-bold mb-2">No courses created yet</h3>
          <p className="text-gray-400 mb-6">Create your first course to begin teaching!</p>
          <Link to="/mentor/courses/new" className="btn btn-primary">Create Course</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map(course => (
            <div key={course.id} className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
              <div>
                <div className="font-semibold text-white text-base mb-1">{course.title}</div>
                <div className="text-gray-400 text-xs capitalize">{course.level} · {course.language}</div>
              </div>
              <div className="flex gap-3 items-center w-full sm:w-auto justify-between sm:justify-start">
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
      )}
    </div>
  )
}
