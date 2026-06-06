import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  Clock, Star, Users, ChevronDown, ChevronUp,
  PlayCircle, FileText, Lock, CheckCircle, ShoppingCart, BookOpen
} from 'lucide-react'

export default function CourseDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
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
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0d0d1a 100%)',
        borderBottom: '1px solid var(--color-border)',
        padding: '4rem 0',
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>
          {/* Left */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
              <span style={{ background: 'var(--color-primary)20', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {course?.level}
              </span>
              <span style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)', padding: '4px 12px', borderRadius: 6, fontSize: 12 }}>
                {course?.language}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', lineHeight: 1.2, marginBottom: '1rem' }}>
              {course?.title}
            </h1>
            <p className="text-muted" style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              {course?.short_description}
            </p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Stat icon={<Clock size={16} />} value={`${course?.total_duration_minutes} min`} label="Total Duration" />
              <Stat icon={<BookOpen size={16} />} value={`${course?.total_lessons} lessons`} label="Lessons" />
              {avgRating && <Stat icon={<Star size={16} color="#f59e0b" fill="#f59e0b" />} value={avgRating} label={`${reviews.length} reviews`} />}
            </div>
          </div>

          {/* Enroll card */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 20, padding: '1.5rem', position: 'sticky', top: '5rem',
          }}>
            <img
              src={course?.thumbnail_url ?? `https://picsum.photos/seed/${course?.id}/400/225`}
              alt={course?.title}
              style={{ width: '100%', borderRadius: 12, marginBottom: '1rem', objectFit: 'cover', aspectRatio: '16/9' }}
            />
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
              {course?.is_free ? <span style={{ color: '#10b981' }}>Free</span> : `$${Number(course?.price).toFixed(2)}`}
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
            <p className="text-muted" style={{ textAlign: 'center', fontSize: 12, marginTop: '0.75rem' }}>
              30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container" style={{ padding: '3rem 1rem', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem' }}>
        <div>
          {/* What you'll learn */}
          {course?.what_you_learn && (
            <Section title="What You'll Learn">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {course.what_you_learn.split('\n').filter(Boolean).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.9rem' }}>
                    <CheckCircle size={14} color="#10b981" style={{ marginTop: 3, flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Curriculum */}
          <Section title="Course Curriculum">
            {modules?.map((mod, idx) => (
              <div key={mod.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: '0.75rem', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleModule(idx)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.25rem', background: 'var(--color-surface)', border: 'none', cursor: 'pointer', color: '#fff',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{mod.title}</span>
                  {expandedModules.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedModules.has(idx) && mod.lessons?.map(lesson => (
                  <div key={lesson.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {lesson.lesson_type === 'video'
                        ? <PlayCircle size={14} color="var(--color-primary)" />
                        : <FileText size={14} color="var(--color-text-muted)" />}
                      <span style={{ fontSize: '0.875rem' }}>{lesson.title}</span>
                      {lesson.is_preview && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Preview</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{lesson.duration_minutes}min</span>
                      {!enrollment && !lesson.is_preview && <Lock size={12} color="var(--color-text-muted)" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Section>

          {/* Reviews */}
          {reviews?.length > 0 && (
            <Section title={`Student Reviews (${reviews.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.slice(0, 5).map(review => (
                  <div key={review.id} style={{
                    padding: '1rem', borderRadius: 12,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? '#f59e0b' : 'transparent'} color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{review.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Requirements sidebar */}
        <div>
          {course?.requirements && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 16, padding: '1.5rem', marginBottom: '1rem',
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Requirements</h3>
              {course.requirements.split('\n').filter(Boolean).map((req, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--color-primary)', marginTop: 3 }}>•</span>
                  <span className="text-muted">{req}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>{title}</h2>
      {children}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
}
