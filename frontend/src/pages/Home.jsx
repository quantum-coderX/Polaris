import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Search, Clock, Users, BookOpen, Award, ArrowRight, Star, CheckCircle } from 'lucide-react'

/* ── Academia photo pool: Unsplash IDs cycling per course ID ─── */
const ACADEMIA_PHOTOS = [
  '1481627834876-b7833e8f5570',  // dark books on shelf
  '1516979187457-637abb4f9353',  // colourful books close-up
  '1456513080510-7bf3a84b82f8',  // studying with window light
  '1524995997946-a1c2e315a42f',  // library reading room
  '1507842217343-583bb7270b66',  // grand library hall
  '1532187643603-ba119ca4109e',  // science / test tubes
  '1513475382585-d06e58bcb0e0',  // watercolour painting
  '1509475826633-fed3f9b2ff5a',  // music / piano keys
  '1434030216411-0b793f4b6f74',  // person writing notes
  '1519681393784-d120267933ba',  // mountains & stars
]

export const getAcademiaThumb = (id) => {
  const idx = (id ?? 0) % ACADEMIA_PHOTOS.length
  return `https://images.unsplash.com/photo-${ACADEMIA_PHOTOS[idx]}?auto=format&fit=crop&w=400&h=225&q=80`
}

const DISCIPLINES = [
  {
    name: 'Literature & Writing',
    count: '124 courses',
    photo: 'photo-1481627834876-b7833e8f5570',
    color: '#C5922B',
  },
  {
    name: 'Philosophy',
    count: '89 courses',
    photo: 'photo-1456513080510-7bf3a84b82f8',
    color: '#8B2D3E',
  },
  {
    name: 'History & Humanities',
    count: '156 courses',
    photo: 'photo-1524995997946-a1c2e315a42f',
    color: '#3D6B50',
  },
  {
    name: 'Natural Sciences',
    count: '201 courses',
    photo: 'photo-1532187643603-ba119ca4109e',
    color: '#2E5A8B',
  },
  {
    name: 'Fine Arts & Music',
    count: '93 courses',
    photo: 'photo-1513475382585-d06e58bcb0e0',
    color: '#7A5C1E',
  },
  {
    name: 'Technology & Logic',
    count: '178 courses',
    photo: 'photo-1518770660439-4636190af475',
    color: '#5C4A7A',
  },
]

const FEATURES = [
  { icon: BookOpen, title: 'Expert-Led Curriculum', desc: 'Courses crafted by distinguished scholars, authors, and practitioners at the peak of their field.' },
  { icon: Award,    title: 'Verified Certificates', desc: 'Earn credentials that carry weight — shareable on LinkedIn and recognised by institutions.' },
  { icon: Star,     title: 'Lifelong Access', desc: 'Once enrolled, the knowledge is yours forever. Learn at the rhythm your life allows.' },
  { icon: Users,    title: 'Scholarly Community', desc: 'Join discussion halls, peer reviews, and live seminars with fellow learners worldwide.' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Browse the Catalogue',
    desc: 'Explore hundreds of curated courses across literature, science, arts and philosophy.',
    photo: 'photo-1507842217343-583bb7270b66',
  },
  {
    step: '02',
    title: 'Study at Your Pace',
    desc: 'Watch lectures, read texts, complete quizzes, and engage in scholarly Q&A at your own rhythm.',
    photo: 'photo-1434030216411-0b793f4b6f74',
  },
  {
    step: '03',
    title: 'Earn Your Certificate',
    desc: 'Complete the curriculum and receive a verified certificate to showcase your achievement.',
    photo: 'photo-1523050854058-8df90110c9f1',
  },
]

export default function Home() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: courses } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => api.get('/courses?limit=8').then(r => r.data),
  })

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — Full-bleed library photography
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1920&q=85')`,
          }}
        />
        {/* Layered overlay: dark bottom vignette + directional dark */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, rgba(10,7,4,0.88) 0%, rgba(10,7,4,0.72) 50%, rgba(10,7,4,0.45) 100%)',
          }}
        />
        {/* Gold bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to top, rgba(15,13,10,0.95), transparent)' }}
        />

        <div className="container relative z-10 py-16 sm:py-24 md:py-28">
          <div className="max-w-3xl">
            <div className="hero__eyebrow mb-6">
              🏛️ &nbsp;Est. 2026 · Trusted by 10,000+ Scholars
            </div>

            <h1
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                color: '#F5EFE2',
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
              }}
            >
              Pursue Knowledge<br />
              <em style={{ color: '#C5922B', fontStyle: 'italic' }}>Without Limits</em>
            </h1>

            <p style={{ color: 'rgba(230,217,194,0.82)', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', lineHeight: 1.7, maxWidth: '36rem', marginBottom: '2.5rem' }}>
              Expert-led academic courses in literature, philosophy, history, sciences, and the arts.
              Learn at your pace — and earn a certificate that matters.
            </p>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mb-8">
              <div className="relative flex-grow">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(230,217,194,0.5)' }} />
                <input
                  id="hero-search"
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg text-sm outline-none transition-all"
                  placeholder="Search courses, topics, scholars…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/courses?q=${search}`)}
                  style={{
                    background: 'rgba(253,252,247,0.10)',
                    border: '1px solid rgba(197,146,43,0.40)',
                    color: '#F5EFE2',
                    backdropFilter: 'blur(10px)',
                  }}
                />
              </div>
              <button
                className="btn btn-primary px-6 py-3.5 text-sm whitespace-nowrap"
                onClick={() => navigate(`/courses?q=${search}`)}
              >
                <Search size={16} /> Search
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/courses" className="btn btn-primary btn-lg">
                Browse Catalogue <ArrowRight size={18} />
              </Link>
              <Link to="/register" className="btn btn-lg"
                style={{ border: '1.5px solid rgba(197,146,43,0.50)', color: '#E6D9C2', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                Enrol for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATS BAR
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-t border-b py-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Students',     value: '10,000+', icon: Users },
              { label: 'Expert Mentors',      value: '500+',    icon: BookOpen },
              { label: 'Courses Available',   value: '1,200+',  icon: Award },
              { label: 'Certificates Issued', value: '8,500+',  icon: CheckCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon size={20} className="mx-auto mb-2" style={{ color: 'var(--color-primary)' }} />
                <div
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: '2rem', fontWeight: 800,
                    background: 'var(--gradient-hero)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {value}
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DISCIPLINES GRID — image tiles
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2>Explore the Disciplines</h2>
            <div className="gold-divider" />
            <p>From antiquity to modernity — choose your field of study</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DISCIPLINES.map((disc) => (
              <Link
                key={disc.name}
                to={`/courses?q=${encodeURIComponent(disc.name.split(' ')[0])}`}
                className="group relative overflow-hidden rounded-xl cursor-pointer"
                style={{ height: '200px' }}
              >
                {/* BG image */}
                <img
                  src={`https://images.unsplash.com/${disc.photo}?auto=format&fit=crop&w=600&h=300&q=80`}
                  alt={disc.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ background: `linear-gradient(to top, rgba(10,7,4,0.90) 0%, rgba(10,7,4,0.45) 60%, rgba(10,7,4,0.20) 100%)` }}
                />
                {/* Gold left stripe */}
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: disc.color }} />
                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 700, fontSize: '1.1rem',
                      color: '#F5EFE2', marginBottom: '0.25rem',
                    }}
                  >
                    {disc.name}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(230,217,194,0.70)' }}>{disc.count}</p>
                </div>
                {/* Hover arrow */}
                <div
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                >
                  <ArrowRight size={20} style={{ color: disc.color }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURED COURSES
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="section" style={{ background: 'var(--color-surface)' }}>
        <div className="container">
          <div className="section__header">
            <h2>Featured Courses</h2>
            <div className="gold-divider" />
            <p>Handpicked by our editorial team to help you grow</p>
          </div>
          <div className="grid-4">
            {(courses ?? Array(4).fill(null)).map((course, i) => (
              <CourseCard key={course?.id ?? i} course={course} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/courses" className="btn btn-outline-gold btn-lg">
              View Full Catalogue <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SPLIT — "The Scholarly Experience" with image
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="section overflow-hidden">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image — shows BELOW text on mobile, LEFT on desktop */}
            <div
              className="relative rounded-2xl overflow-hidden w-full"
              style={{
                height: 'clamp(260px, 45vw, 480px)',
                order: 2,
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85"
                alt="Scholar studying in library"
                className="w-full h-full object-cover"
              />
              {/* Decorative gold frame */}
              <div
                className="absolute inset-4 rounded-xl pointer-events-none"
                style={{ border: '1.5px solid rgba(197,146,43,0.30)' }}
              />
              {/* Floating stat card */}
              <div
                className="absolute bottom-6 right-6 rounded-xl p-4"
                style={{
                  background: 'rgba(15,13,10,0.88)',
                  border: '1px solid rgba(197,146,43,0.35)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.6rem', fontWeight: 800, color: '#C5922B' }}>98%</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(230,217,194,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completion Rate</div>
              </div>
            </div>

            {/* Text — shows FIRST on mobile */}
            <div style={{ order: 1 }}>
              <div className="hero__eyebrow" style={{ marginBottom: '1.5rem' }}>Why Polaris</div>
              <h2
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
                  fontWeight: 800, lineHeight: 1.15,
                  color: 'var(--color-text)', marginBottom: '1.25rem',
                }}
              >
                The Scholarly<br />
                <em style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>Experience Reimagined</em>
              </h2>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.75, marginBottom: '2rem', fontSize: '1.05rem' }}>
                Polaris brings the rigour of a university education to wherever you are.
                Every course is designed to challenge, inspire, and reward genuine effort.
              </p>

              <div className="flex flex-col gap-5 mb-8">
                {FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4 items-start">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(197,146,43,0.14)' }}
                    >
                      <Icon size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>{title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/register" className="btn btn-primary btn-lg">
                Begin Your Studies <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          QUOTE — Aristotle
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-14 md:py-20 lg:py-24 relative overflow-hidden"
        style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ opacity: 0.04 }}
        >
          <img
            src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=30"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative z-10 text-center max-w-2xl md:max-w-3xl mx-auto px-4">
          <div className="gold-divider mb-10" />
          <blockquote
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              fontWeight: 500, fontStyle: 'italic',
              lineHeight: 1.5, color: 'var(--color-text)',
              marginBottom: '1.5rem',
            }}
          >
            "The roots of education are bitter,<br />
            but the fruit is sweet."
          </blockquote>
          <cite style={{ fontFamily: '"Playfair Display", serif', fontSize: '0.9rem', color: 'var(--color-primary)', fontStyle: 'normal', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            — Aristotle
          </cite>
          <div className="gold-divider mt-10" />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS — with step images
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2>Your Path to Mastery</h2>
            <div className="gold-divider" />
            <p>From first lesson to certified graduate — in three scholarly steps</p>
          </div>
          <div className="grid-3">
            {HOW_IT_WORKS.map(({ step, title, desc, photo }) => (
              <div key={step} className="card group overflow-hidden p-0">
                {/* Step image */}
                <div className="relative overflow-hidden" style={{ height: '180px' }}>
                  <img
                    src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=500&h=250&q=80`}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: 'sepia(20%) brightness(0.85)' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,7,4,0.75), transparent)' }} />
                  {/* Step number badge */}
                  <div
                    className="absolute bottom-4 left-5"
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: '2.5rem', fontWeight: 900,
                      color: '#C5922B', lineHeight: 1,
                      textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    }}
                  >
                    {step}
                  </div>
                </div>
                {/* Content */}
                <div className="p-6">
                  <h3 style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '0.6rem' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CTA BANNER — Library bg
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1920&q=80')`,
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(10,7,4,0.82)' }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(197,146,43,0.12) 0%, rgba(139,45,62,0.10) 100%)' }}
        />
        <div className="container relative z-10 text-center">
          <div className="gold-divider mb-10" />
          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
              fontWeight: 800, color: '#F5EFE2',
              marginBottom: '1rem', lineHeight: 1.2,
            }}
          >
            Begin Your Scholarly Journey
          </h2>
          <p style={{ color: 'rgba(230,217,194,0.75)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '32rem', margin: '0 auto 2.5rem' }}>
            Join thousands of curious minds who chose to pursue depth over distraction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn btn-primary btn-lg">
              Enrol for Free Today
            </Link>
            <Link to="/courses" className="btn btn-lg"
              style={{ border: '1.5px solid rgba(197,146,43,0.45)', color: '#E6D9C2', background: 'rgba(255,255,255,0.05)' }}>
              Explore Courses
            </Link>
          </div>
          <div className="gold-divider mt-10" />
        </div>
      </section>
    </>
  )
}

/* ── Course Card ─────────────────────────────────────────────────── */
function CourseCard({ course }) {
  if (!course) {
    return (
      <div className="card-course opacity-60">
        <div
          className="w-full aspect-video animate-pulse"
          style={{ background: 'var(--color-border)', borderRadius: '80px 80px 0 0' }}
        />
        <div className="card-course__body">
          <div className="h-4 rounded mb-2 w-3/4 animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="h-3 rounded w-1/2 animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
      </div>
    )
  }

  const thumb = course.thumbnail_url ?? getAcademiaThumb(course.id)

  return (
    <Link to={`/courses/${course.slug}`} className="card-course">
      <div className="card-course__thumb-wrap">
        <img className="card-course__thumbnail" src={thumb} alt={course.title} />
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
          <span className="flex items-center gap-1"><Users size={12} /> {course.level}</span>
        </div>
        <div className="card-course__price mt-auto pt-2">
          {course.is_free
            ? <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Free</span>
            : `$${course.price}`}
        </div>
      </div>
    </Link>
  )
}
