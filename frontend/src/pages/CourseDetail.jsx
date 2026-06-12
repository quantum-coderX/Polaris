import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  Clock, Star, ChevronDown, ChevronUp,
  PlayCircle, FileText, Lock, CheckCircle, ShoppingCart, BookOpen
} from 'lucide-react'

export default function CourseDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [expandedModules, setExpandedModules] = useState(new Set([0]))
  const [enrolling, setEnrolling] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/courses/${slug}`).then(r => r.data),
  })

  const { data: modules } = useQuery({
    queryKey: ['modules', course?.id],
    queryFn: () => api.get(`/courses/${course.id}/modules`).then(r => r.data),
    enabled: !!course?.id,
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', course?.id],
    queryFn: () => api.get(`/reviews/${course.id}`).then(r => r.data),
    enabled: !!course?.id,
  })

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', course?.id],
    queryFn: () => api.get(`/enrollments/${course.id}`).then(r => r.data).catch(() => null),
    enabled: !!course?.id && isAuthenticated(),
  })

  const toggleModule = (idx) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const handleEnroll = async () => {
    if (!isAuthenticated()) { navigate('/login'); return }
    try {
      setEnrolling(true)
      if (course.is_free || course.price === 0) {
        await api.post(`/enrollments/${course.id}`)
        navigate(`/learn/${course.id}`)
      } else {
        const resp = await api.post('/payments/checkout', {
          course_id: course.id,
          success_url: `${window.location.origin}/learn/${course.id}`,
          cancel_url: window.location.href,
        })
        window.location.href = resp.data.checkout_url
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (isLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-gradient-to-br from-surface2 via-[#16213e] to-bg border-b border-border py-12 md:py-16">
        <div className="container grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left info column */}
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4">
              <span className="badge badge-primary">
                {course?.level}
              </span>
              <span className="badge bg-surface2 text-gray-400">
                {course?.language}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-heading mb-4 text-white leading-tight">
              {course?.title}
            </h1>
            <p className="text-gray-400 mb-6 leading-relaxed text-base md:text-lg">
              {course?.short_description}
            </p>
            <div className="flex flex-wrap gap-6 mt-6">
              <Stat icon={<Clock size={16} />} value={`${course?.total_duration_minutes} min`} label="Total Duration" />
              <Stat icon={<BookOpen size={16} />} value={`${course?.total_lessons} lessons`} label="Lessons" />
              {avgRating && <Stat icon={<Star size={16} className="text-gold fill-current" />} value={avgRating} label={`${reviews.length} reviews`} />}
            </div>
          </div>

          {/* Right sticky checkout column */}
          <div className="lg:col-span-1 w-full lg:sticky lg:top-24">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-glow">
              <img
                src={course?.thumbnail_url ?? `https://picsum.photos/seed/${course?.id}/400/225`}
                alt={course?.title}
                className="w-full rounded-xl mb-4 object-cover aspect-video"
              />
              <div className="text-3xl font-heading font-extrabold mb-4 text-white">
                {course?.is_free ? <span className="text-secondary">Free</span> : `$${Number(course?.price).toFixed(2)}`}
              </div>

              {enrollment ? (
                <Link to={`/learn/${course?.id}`} className="btn btn-primary btn-full btn-lg">
                  <PlayCircle size={18} /> Continue Learning
                </Link>
              ) : (
                <button
                  id="enroll-btn"
                  className="btn btn-primary btn-full btn-lg"
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? 'Processing...' : course?.is_free ? (
                    <><BookOpen size={18} /> Enroll Free</>
                  ) : (
                    <><ShoppingCart size={18} /> Buy Now</>
                  )}
                </button>
              )}
              <p className="text-gray-400 text-center text-xs mt-3">
                30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Body Grid */}
      <div className="container py-12 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {/* What you'll learn */}
          {course?.what_you_learn && (
            <Section title="What You'll Learn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.what_you_learn.split('\n').filter(Boolean).map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-sm md:text-base">
                    <CheckCircle size={14} className="text-secondary mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Curriculum Accordion */}
          <Section title="Course Curriculum">
            {!modules?.length ? (
              <p className="text-gray-400">No lessons uploaded yet.</p>
            ) : (
              modules.map((mod, idx) => (
                <div key={mod.id} className="border border-border rounded-xl mb-3 overflow-hidden bg-surface">
                  <button
                    onClick={() => toggleModule(idx)}
                    className="w-full flex justify-between items-center p-4 hover:bg-surface2 text-left text-white border-0 transition-colors focus:outline-none"
                  >
                    <span className="fontWeight-600 font-bold">{mod.title}</span>
                    {expandedModules.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedModules.has(idx) && mod.lessons?.map(lesson => (
                    <div key={lesson.id} className="flex justify-between items-center p-3.5 border-t border-border bg-bg/50 hover:bg-bg transition-colors">
                      <div className="flex items-center gap-2">
                        {lesson.lesson_type === 'video'
                          ? <PlayCircle size={14} className="text-primary" />
                          : <FileText size={14} className="text-gray-400" />}
                        <span className="text-sm">{lesson.title}</span>
                        {lesson.is_preview && <span className="text-[10px] text-secondary font-bold uppercase ml-2 bg-secondary/15 px-1.5 py-0.5 rounded">Preview</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{lesson.duration_minutes}m</span>
                        {!enrollment && !lesson.is_preview && <Lock size={12} className="text-gray-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </Section>

          {/* Reviews List */}
          {reviews?.length > 0 && (
            <Section title={`Student Reviews (${reviews.length})`}>
              <div className="flex flex-col gap-4">
                {reviews.slice(0, 5).map(review => (
                  <div key={review.id} className="p-5 rounded-xl bg-surface border border-border">
                    <div className="flex justify-between mb-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? 'text-gold fill-current' : 'text-gray-600'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-300">{review.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar Requirements */}
        <div className="lg:col-span-1">
          {course?.requirements && (
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="mb-4 text-base font-bold text-white">Requirements</h3>
              <div className="flex flex-col gap-2">
                {course.requirements.split('\n').filter(Boolean).map((req, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-gray-400">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <div>
        <div className="font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-heading mb-4 text-white border-b border-border/50 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
}
