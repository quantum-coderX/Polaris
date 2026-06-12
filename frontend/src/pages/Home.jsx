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
          <div className="relative max-w-xl mx-auto mb-8 flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
            <input
              id="hero-search"
              className="form-input flex-grow"
              placeholder="Search courses, topics, or instructors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/courses?q=${search}`)}
            />
            <button className="btn btn-primary w-full sm:w-auto" onClick={() => navigate(`/courses?q=${search}`)}>
              <Search size={18} />
              Search
            </button>
          </div>

          <div className="hero__actions">
            <Link to="/courses" className="btn btn-primary btn-lg w-full sm:w-auto">Browse Courses</Link>
            <Link to="/register" className="btn btn-secondary btn-lg w-full sm:w-auto">Start for Free</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-surface border-t border-b border-border py-8">
        <div className="container grid-4">
          {[
            { label: 'Active Students', value: '10,000+' },
            { label: 'Expert Mentors', value: '500+' },
            { label: 'Courses Available', value: '1,200+' },
            { label: 'Certificates Issued', value: '8,500+' },
          ].map(s => (
            <div key={s.label} className="text-center py-4">
              <div className="text-3xl font-heading font-extrabold bg-gradient-hero bg-clip-text text-transparent">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
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
          <div className="text-center mt-10">
            <Link to="/courses" className="btn btn-secondary">View All Courses</Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-surface">
        <div className="container">
          <div className="section__header">
            <h2>How Polaris Works</h2>
            <p>From enrollment to certification in 3 simple steps</p>
          </div>
          <div className="grid-3">
            {[
              { step: '01', title: 'Browse & Enroll', desc: 'Explore thousands of courses. Enroll in one click — free or paid.' },
              { step: '02', title: 'Learn at Your Pace', desc: 'Watch videos, read PDFs, complete quizzes, and ask questions in real-time Q&A.' },
              { step: '03', title: 'Get Certified', desc: 'Complete a course and receive a verified certificate you can share on LinkedIn.' },
            ].map(s => (
              <div key={s.step} className="card">
                <div className="text-5xl font-heading font-extrabold bg-gradient-hero bg-clip-text text-transparent">{s.step}</div>
                <h3 className="text-lg font-bold mt-4 mb-2 text-white">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
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
      <div className="card-course opacity-50">
        <div className="w-full aspect-video bg-border animate-pulse" />
        <div className="card-course__body">
          <div className="h-4 bg-border rounded mb-2 w-3/4 animate-pulse" />
          <div className="h-3 bg-border rounded w-1/2 animate-pulse" />
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
          <span className="flex items-center gap-1 text-gray-400"><Clock size={12} />{course.total_duration_minutes}m</span>
          <span className="flex items-center gap-1 text-gray-400"><Users size={12} /> {course.level}</span>
        </div>
        <div className="card-course__price mt-auto pt-2">
          {course.is_free ? <span className="text-secondary font-bold">Free</span> : `$${course.price}`}
        </div>
      </div>
    </Link>
  )
}
