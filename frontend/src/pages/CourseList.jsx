import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Search, Clock, X, Sliders } from 'lucide-react'
import { getAcademiaThumb } from './Home'

const LEVELS = ['beginner', 'intermediate', 'advanced']
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Spanish', 'French']

export default function CourseList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [q, setQ] = useState(searchParams.get('q') || '')

  const level    = searchParams.get('level') || ''
  const language = searchParams.get('language') || ''
  const isFree   = searchParams.get('is_free') || ''
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

  const handleSearch = (e) => {
    e.preventDefault()
    const p = new URLSearchParams(searchParams)
    if (q) p.set('q', q); else p.delete('q')
    setSearchParams(p)
  }

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
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header — library image background */}
      <div className="relative border-b py-16 md:py-24 overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(10,7,4,0.78)' }} />
        <div className="container relative z-10">
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              fontWeight: 900, color: '#F5EFE2', marginBottom: '0.5rem',
            }}
          >
            Browse{' '}
            <em style={{ color: '#C5922B', fontStyle: 'italic' }}>Courses</em>
          </h1>
          <p style={{ color: 'rgba(230,217,194,0.75)', marginBottom: '1.5rem', fontSize: '1rem' }}>
            {courses ? `${courses.length} courses found` : 'Explore our expert-led academic catalogue'}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full">
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(230,217,194,0.5)' }} />
              <input
                id="course-search"
                className="pl-10 w-full py-3.5 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(253,252,247,0.10)', border: '1px solid rgba(197,146,43,0.40)', color: '#F5EFE2', backdropFilter: 'blur(8px)' }}
                placeholder="Search courses, topics, skills..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button type="submit" className="btn btn-primary flex-1 sm:flex-initial">Search</button>
              <button
                type="button"
                className="btn btn-secondary flex items-center justify-center gap-2 relative flex-1 sm:flex-initial"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Sliders size={16} /> Filters
                {activeFilters > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md">
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="container py-8">
        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-2xl border p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end animate-fade-in"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div>
              <label className="form-label" htmlFor="filter-level">Level</label>
              <select id="filter-level" className="form-select" value={level} onChange={e => setFilter('level', e.target.value)}>
                <option value="">All Levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="filter-lang">Language</label>
              <select id="filter-lang" className="form-select" value={language} onChange={e => setFilter('language', e.target.value)}>
                <option value="">All Languages</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="filter-price">Availability</label>
              <select id="filter-price" className="form-select" value={isFree} onChange={e => setFilter('is_free', e.target.value)}>
                <option value="">All Courses</option>
                <option value="true">Free Only</option>
                <option value="false">Paid Only</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="filter-min-price">Min Price ($)</label>
              <input id="filter-min-price" className="form-input" type="number" min={0} value={minPrice}
                onChange={e => setFilter('min_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="form-label" htmlFor="filter-max-price">Max Price ($)</label>
              <input id="filter-max-price" className="form-input" type="number" min={0} value={maxPrice}
                onChange={e => setFilter('max_price', e.target.value)} placeholder="999" />
            </div>
            <div>
              <button type="button" className="btn btn-ghost w-full flex items-center justify-center gap-2" onClick={clearAll}>
                <X size={14} /> Clear All
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {level    && <FilterTag label={`Level: ${level}`}     onRemove={() => setFilter('level', '')} />}
            {language && <FilterTag label={`Lang: ${language}`}    onRemove={() => setFilter('language', '')} />}
            {isFree === 'true'  && <FilterTag label="Free" onRemove={() => setFilter('is_free', '')} />}
            {isFree === 'false' && <FilterTag label="Paid" onRemove={() => setFilter('is_free', '')} />}
            {minPrice && <FilterTag label={`Min: $${minPrice}`}   onRemove={() => setFilter('min_price', '')} />}
            {maxPrice && <FilterTag label={`Max: $${maxPrice}`}   onRemove={() => setFilter('max_price', '')} />}
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
          <div className="grid-4 animate-fade-in">
            {courses?.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(124,92,252,0.10)', border: '1px solid rgba(124,92,252,0.2)', color: 'var(--color-primary)' }}>
      {label}
      <button onClick={onRemove} className="hover:opacity-70 focus:outline-none flex items-center" style={{ color: 'var(--color-primary)' }}>
        <X size={12} />
      </button>
    </span>
  )
}

function CourseCard({ course }) {
  const thumb = course.thumbnail_url ?? getAcademiaThumb(course.id)
  return (
    <Link to={`/courses/${course.slug ?? course.id}`} className="card-course">
      {/* Arched thumbnail */}
      <div className="card-course__thumb-wrap">
        <img
          src={thumb}
          alt={course.title}
          className="card-course__thumbnail"
        />
        {course.is_free && (
          <span
            className="absolute top-3 right-3 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase shadow-glow"
            style={{ background: 'var(--gradient-hero)' }}
          >
            FREE
          </span>
        )}
      </div>
      <div className="card-course__body">
        <div className="card-course__tags">
          <span className="card-course__tag">{course.level}</span>
          <span className="card-course__tag">{course.language}</span>
        </div>
        <div className="card-course__title">{course.title}</div>
        <div className="card-course__meta">
          <span className="flex items-center gap-1"><Clock size={12} /> {course.total_duration_minutes}m</span>
          <span>{course.total_lessons || 0} lessons</span>
        </div>
        <div className="card-course__price mt-auto pt-2">
          {course.is_free ? (
            <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Free</span>
          ) : (
            `$${Number(course.price).toFixed(2)}`
          )}
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="card-course opacity-60">
      <div className="w-full aspect-video animate-pulse" style={{ background: 'var(--color-border)', borderRadius: '80px 80px 0 0' }} />
      <div className="p-5 flex-grow">
        <div className="h-3 rounded mb-3 w-1/3 animate-pulse" style={{ background: 'var(--color-border)' }} />
        <div className="h-4 rounded mb-2 w-3/4 animate-pulse" style={{ background: 'var(--color-border)' }} />
        <div className="h-3 rounded w-1/2 animate-pulse mt-4" style={{ background: 'var(--color-border)' }} />
      </div>
    </div>
  )
}

function EmptyState({ onClear }) {
  return (
    <div className="text-center py-24 px-4">
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
      <h2
        style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}
      >
        No courses found
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '26rem', margin: '0 auto 1.5rem' }}>
        Adjust your search or filters to discover more scholarly works.
      </p>
      <button className="btn btn-primary" onClick={onClear}>Clear Filters</button>
    </div>
  )
}
