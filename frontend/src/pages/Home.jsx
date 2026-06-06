import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Search, Star, Clock, Users } from 'lucide-react'

export default function Home() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: courses } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => api.get('/courses?limit=8').then(r => r.data),
  })

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero__eyebrow">🎓 Trusted by 10,000+ learners</div>
          <h1 className="hero__title">
            Learn Without<br /><span>Limits</span>
          </h1>
          <p className="hero__subtitle">
            Expert-led courses in programming, design, and business.
            Learn at your pace, get certified, and advance your career.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto 2rem', display: 'flex', gap: '0.75rem' }}>
            <input
              id="hero-search"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Search courses, topics, or instructors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/courses?q=${search}`)}
            />
            <button className="btn btn-primary" onClick={() => navigate(`/courses?q=${search}`)}>
              <Search size={18} />
              Search
            </button>
          </div>

          <div className="hero__actions">
            <Link to="/courses" className="btn btn-primary btn-lg">Browse Courses</Link>
            <Link to="/register" className="btn btn-secondary btn-lg">Start for Free</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '2rem 0' }}>
        <div className="container grid-4">
          {[
            { label: 'Active Students', value: '10,000+' },
            { label: 'Expert Mentors', value: '500+' },
            { label: 'Courses Available', value: '1,200+' },
            { label: 'Certificates Issued', value: '8,500+' },
          ].map(s => (
            <div key={s.label} className="text-center animate-fadein">
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
              <div className="text-muted text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Courses */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2>Featured Courses</h2>
            <p>Handpicked by our team to help you grow faster</p>
          </div>
          <div className="grid-4">
            {(courses ?? Array(4).fill(null)).map((course, i) => (
              <CourseCard key={course?.id ?? i} course={course} />
            ))}
          </div>
          <div className="text-center" style={{ marginTop: '2rem' }}>
            <Link to="/courses" className="btn btn-secondary">View All Courses</Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--color-surface)' }}>
        <div className="container">
          <div className="section__header">
            <h2>How LearnHub Works</h2>
            <p>From enrollment to certification in 3 simple steps</p>
          </div>
          <div className="grid-3">
            {[
              { step: '01', title: 'Browse & Enroll', desc: 'Explore thousands of courses. Enroll in one click — free or paid.' },
              { step: '02', title: 'Learn at Your Pace', desc: 'Watch videos, read PDFs, complete quizzes, and ask questions in real-time Q&A.' },
              { step: '03', title: 'Get Certified', desc: 'Complete a course and receive a verified certificate you can share on LinkedIn.' },
            ].map(s => (
              <div key={s.step} className="card animate-fadein">
                <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.step}</div>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{s.title}</h3>
                <p className="text-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function CourseCard({ course }) {
  if (!course) {
    return (
      <div className="card-course" style={{ opacity: 0.5 }}>
        <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--color-border)' }} />
        <div className="card-course__body">
          <div style={{ height: 16, background: 'var(--color-border)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 4, width: '60%' }} />
        </div>
      </div>
    )
  }

  return (
    <Link to={`/courses/${course.slug}`} className="card-course">
      <img
        className="card-course__thumbnail"
        src={course.thumbnail_url ?? `https://picsum.photos/seed/${course.id}/400/225`}
        alt={course.title}
      />
      <div className="card-course__body">
        <div className="card-course__tags">
          <span className="card-course__tag">{course.level}</span>
          <span className="card-course__tag">{course.language}</span>
        </div>
        <div className="card-course__title">{course.title}</div>
        <div className="card-course__meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{course.total_duration_minutes}min</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />Students</span>
        </div>
        <div className="card-course__price">
          {course.is_free ? <span style={{ color: 'var(--color-secondary)' }}>Free</span> : `$${course.price}`}
        </div>
      </div>
    </Link>
  )
}
