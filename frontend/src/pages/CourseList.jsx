import { useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Search, Filter, Clock, Star, ChevronDown, X, Sliders } from 'lucide-react'

const LEVELS = ['beginner', 'intermediate', 'advanced']
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Spanish', 'French']

export default function CourseList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [q, setQ] = useState(searchParams.get('q') || '')

  const level = searchParams.get('level') || ''
  const language = searchParams.get('language') || ''
  const isFree = searchParams.get('is_free') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''

  const buildQueryParams = () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (level) params.set('level', level)
    if (language) params.set('language', language)
    if (isFree) params.set('is_free', isFree)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    params.set('limit', '24')
    return params.toString()
  }

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', q, level, language, isFree, minPrice, maxPrice],
    queryFn: () => {
      const endpoint = q
        ? `/search/courses?${buildQueryParams()}`
        : `/courses?${buildQueryParams()}`
      return api.get(endpoint).then(r => r.data)
    },
    staleTime: 30_000,
  })

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    const p = new URLSearchParams(searchParams)
    if (q) p.set('q', q); else p.delete('q')
    setSearchParams(p)
  }, [q, searchParams, setSearchParams])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    setSearchParams(p)
  }

  const clearAll = () => {
    setQ('')
    setSearchParams({})
  }

  const activeFilters = [level, language, isFree, minPrice, maxPrice].filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0d0d1a 100%)',
        borderBottom: '1px solid var(--color-border)',
        padding: '3rem 0 2rem',
      }}>
        <div className="container">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Browse <span style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Courses</span>
          </h1>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            {courses ? `${courses.length} courses found` : 'Explore thousands of expert-led courses'}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', maxWidth: 700 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                id="course-search"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search courses, topics, skills..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}
              style={{ gap: '0.5rem', position: 'relative' }}>
              <Sliders size={16} /> Filters
              {activeFilters > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, background: 'var(--color-primary)',
                  color: '#fff', borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700
                }}>{activeFilters}</span>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Filter Panel */}
        {showFilters && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 16, padding: '1.5rem',
            marginBottom: '2rem',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem'
          }}>
            {/* Level */}
            <div>
              <label className="form-label">Level</label>
              <select className="form-select" value={level} onChange={e => setFilter('level', e.target.value)}>
                <option value="">All Levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="form-label">Language</label>
              <select className="form-select" value={language} onChange={e => setFilter('language', e.target.value)}>
                <option value="">All Languages</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="form-label">Availability</label>
              <select className="form-select" value={isFree} onChange={e => setFilter('is_free', e.target.value)}>
                <option value="">All Courses</option>
                <option value="true">Free Only</option>
                <option value="false">Paid Only</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="form-label">Min Price ($)</label>
              <input className="form-input" type="number" min={0} value={minPrice}
                onChange={e => setFilter('min_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="form-label">Max Price ($)</label>
              <input className="form-input" type="number" min={0} value={maxPrice}
                onChange={e => setFilter('max_price', e.target.value)} placeholder="999" />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ghost btn-full" onClick={clearAll}>
                <X size={14} /> Clear All
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {activeFilters > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {level && <FilterTag label={`Level: ${level}`} onRemove={() => setFilter('level', '')} />}
            {language && <FilterTag label={`Lang: ${language}`} onRemove={() => setFilter('language', '')} />}
            {isFree === 'true' && <FilterTag label="Free" onRemove={() => setFilter('is_free', '')} />}
            {isFree === 'false' && <FilterTag label="Paid" onRemove={() => setFilter('is_free', '')} />}
          </div>
        )}

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid-4">
            {Array(8).fill(null).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses?.length === 0 ? (
          <EmptyState onClear={clearAll} />
        ) : (
          <div className="grid-4">
            {courses?.map(course => <CourseCard key={course.id} course={course} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterTag({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 100,
      background: 'var(--color-primary)20',
      border: '1px solid var(--color-primary)40',
      color: 'var(--color-primary)', fontSize: 12, fontWeight: 600,
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}>
        <X size={12} />
      </button>
    </span>
  )
}

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug ?? course.id}`} style={{ textDecoration: 'none' }}>
      <div className="card-course" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, overflow: 'hidden',
        transition: 'all 0.2s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(108,99,255,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={course.thumbnail_url ?? `https://picsum.photos/seed/${course.id}/400/225`}
            alt={course.title}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
          />
          {course.is_free && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              background: '#10b981', color: '#fff',
              padding: '3px 10px', borderRadius: 100,
              fontSize: 11, fontWeight: 700,
            }}>FREE</span>
          )}
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.5rem' }}>
            <span style={{
              background: 'var(--color-primary)20', color: 'var(--color-primary)',
              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            }}>{course.level}</span>
            <span style={{
              background: 'var(--color-border)', color: 'var(--color-text-muted)',
              padding: '2px 8px', borderRadius: 6, fontSize: 11,
            }}>{course.language}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: '0.75rem', color: '#fff' }}>
            {course.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {course.total_duration_minutes}min
            </span>
            <span>{course.total_lessons} lessons</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: course.is_free ? '#10b981' : '#fff' }}>
            {course.is_free ? 'Free' : `$${Number(course.price).toFixed(2)}`}
          </div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 16, overflow: 'hidden', opacity: 0.6,
    }}>
      <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--color-border)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ padding: '1rem' }}>
        <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, background: 'var(--color-border)', borderRadius: 4, marginBottom: 8, width: '80%' }} />
        <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 4, width: '50%' }} />
      </div>
    </div>
  )
}

function EmptyState({ onClear }) {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ marginBottom: '0.5rem' }}>No courses found</h2>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Try a different search term or adjust your filters
      </p>
      <button className="btn btn-primary" onClick={onClear}>Clear Filters</button>
    </div>
  )
}
