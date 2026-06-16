import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Search, Clock, X, Sliders } from 'lucide-react'

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
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-gradient-to-br from-surface2 via-[#16213e] to-bg border-b border-border py-12 md:py-16">
        <div className="container">
          <h1 className="text-3xl md:text-5xl font-heading mb-2 text-white">
            Browse <span className="bg-gradient-hero bg-clip-text text-transparent">Courses</span>
          </h1>
          <p className="text-gray-400 mb-6">
            {courses ? `${courses.length} courses found` : 'Explore thousands of expert-led courses'}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full">
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="course-search"
                className="form-input pl-10"
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
          <div className="bg-surface border border-border rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end animate-fade-in">
            {/* Level */}
            <div>
              <label className="form-label" htmlFor="filter-level">Level</label>
              <select id="filter-level" className="form-select" value={level} onChange={e => setFilter('level', e.target.value)}>
                <option value="">All Levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="form-label" htmlFor="filter-lang">Language</label>
              <select id="filter-lang" className="form-select" value={language} onChange={e => setFilter('language', e.target.value)}>
                <option value="">All Languages</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Price Availability */}
            <div>
              <label className="form-label" htmlFor="filter-price">Availability</label>
              <select id="filter-price" className="form-select" value={isFree} onChange={e => setFilter('is_free', e.target.value)}>
                <option value="">All Courses</option>
                <option value="true">Free Only</option>
                <option value="false">Paid Only</option>
              </select>
            </div>

            {/* Price Range */}
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
            {level && <FilterTag label={`Level: ${level}`} onRemove={() => setFilter('level', '')} />}
            {language && <FilterTag label={`Lang: ${language}`} onRemove={() => setFilter('language', '')} />}
            {isFree === 'true' && <FilterTag label="Free" onRemove={() => setFilter('is_free', '')} />}
            {isFree === 'false' && <FilterTag label="Paid" onRemove={() => setFilter('is_free', '')} />}
            {minPrice && <FilterTag label={`Min: $${minPrice}`} onRemove={() => setFilter('min_price', '')} />}
            {maxPrice && <FilterTag label={`Max: $${maxPrice}`} onRemove={() => setFilter('max_price', '')} />}
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
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
      {label}
      <button onClick={onRemove} className="text-primary hover:text-white focus:outline-none flex items-center">
        <X size={12} />
      </button>
    </span>
  )
}

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug ?? course.id}`} className="card-course">
      <div className="relative">
        <img
          src={course.thumbnail_url ?? `https://picsum.photos/seed/${course.id}/400/225`}
          alt={course.title}
          className="card-course__thumbnail"
        />
        {course.is_free && (
          <span className="absolute top-3 right-3 bg-secondary text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
            FREE
          </span>
        )}
      </div>
      <div className="card-course__body">
        <div className="card-course__tags">
          <span className="card-course__tag">{course.level}</span>
          <span className="text-xs text-gray-400 px-2 py-0.5 rounded bg-surface2">{course.language}</span>
        </div>
        <div className="card-course__title">
          {course.title}
        </div>
        <div className="card-course__meta">
          <span className="flex items-center gap-1"><Clock size={12} /> {course.total_duration_minutes}m</span>
          <span>{course.total_lessons || 0} lessons</span>
        </div>
        <div className="card-course__price mt-auto pt-2">
          {course.is_free ? (
            <span className="text-secondary font-extrabold text-base">Free</span>
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
    <div className="bg-surface border border-border rounded-2xl overflow-hidden opacity-50 flex flex-col h-full">
      <div className="w-full aspect-video bg-border animate-pulse" />
      <div className="p-5 flex-grow">
        <div className="h-3 bg-border rounded mb-3 w-1/3 animate-pulse" />
        <div className="h-4 bg-border rounded mb-2 w-3/4 animate-pulse" />
        <div className="h-3 bg-border rounded w-1/2 animate-pulse mt-4" />
      </div>
    </div>
  )
}

function EmptyState({ onClear }) {
  return (
    <div className="text-center py-20 px-4">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-xl font-bold mb-2 text-white">No courses found</h2>
      <p className="text-gray-400 mb-6 max-w-sm mx-auto">
        Try a different search term or adjust your filters to view courses.
      </p>
      <button className="btn btn-primary" onClick={onClear}>Clear Filters</button>
    </div>
  )
}
