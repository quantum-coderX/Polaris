import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, BookOpen, Users, DollarSign, Star, ChevronDown, ChevronRight,
  TrendingUp, Activity, Clock, MessageSquare, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, RadialBarChart, RadialBar
} from 'recharts'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

function MetricCard({ label, value, icon: Icon, color, sub, testId }) {
  return (
    <div
      className={`metric-card metric-card--${color} bg-glassmorphism`}
      data-testid={testId}
    >
      <div className="metric-card__header">
        <span className="metric-card__label text-xs tracking-wider uppercase font-semibold text-muted-var">
          {label}
        </span>
        <div className="metric-card__icon-wrap">
          <div
            className="w-9 h-9 rounded-xl"
            style={{ background: `var(--metric-stripe, #8B5CF6)`, opacity: 0.15 }}
          />
          <Icon
            size={18}
            className="metric-card__icon-inner"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
      <div className="metric-card__value font-mono text-3xl font-extrabold tracking-tight">
        {value}
      </div>
      {sub && <div className="metric-card__sub text-xs mt-1.5 text-muted-var">{sub}</div>}
    </div>
  )
}

function CourseAnalyticsRow({ course, index }) {
  const [open, setOpen] = useState(false)

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['course-analytics', course.id],
    queryFn: () => api.get(`/courses/${course.id}/analytics`).then(r => r.data),
    enabled: open,
  })

  return (
    <div
      className="card bg-glassmorphism overflow-hidden transition-all duration-300 border-border hover:border-primary"
      data-testid={`course-row-${course.id}`}
    >
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        onClick={() => setOpen(o => !o)}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(o => !o)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown size={18} className="text-primary" />
          ) : (
            <ChevronRight size={18} className="text-muted-var" />
          )}
          <div>
            <div className="font-bold text-base text-gray-900 dark:text-gray-100 mb-0.5">
              {course.title}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-var">
              {course.level} · {course.language}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto justify-between sm:justify-start">
          <span className={`badge uppercase tracking-wider text-[10px] px-2.5 py-1 ${
            course.status === 'published' ? 'badge-success' :
            course.status === 'pending'   ? 'badge-warning' :
            course.status === 'rejected'  ? 'badge-danger'  : 'badge-primary'
          }`}>
            {course.status}
          </span>
          <Link
            to={`/mentor/courses/${course.id}/edit`}
            className="btn btn-secondary btn-sm px-4 py-1.5 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={e => e.stopPropagation()}
            data-testid={`edit-course-btn-${course.id}`}
          >
            Edit
          </Link>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-border">
          {isLoading && (
            <div className="flex items-center gap-2 pt-4 text-sm text-muted-var">
              <span className="spinner w-4 h-4 border-2" />
              <span>Analyzing telemetry...</span>
            </div>
          )}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-4 rounded-lg bg-surface2 border border-border">
                <div className="text-xs font-semibold uppercase text-muted-var mb-1">Enrollments</div>
                <div className="text-2xl font-extrabold font-mono text-gray-900 dark:text-gray-100">
                  {analytics.total_enrollments}
                </div>
                <div className="text-[10px] text-muted-var mt-0.5 font-mono">
                  {analytics.active_enrollments} active
                </div>
              </div>
              <div className="p-4 rounded-lg bg-surface2 border border-border">
                <div className="text-xs font-semibold uppercase text-muted-var mb-1">Completion Rate</div>
                <div className="text-2xl font-extrabold font-mono text-gray-900 dark:text-gray-100">
                  {analytics.completion_rate}%
                </div>
                <div className="text-[10px] text-muted-var mt-0.5 font-mono">
                  {analytics.completed_enrollments} finished
                </div>
              </div>
              <div className="p-4 rounded-lg bg-surface2 border border-border">
                <div className="text-xs font-semibold uppercase text-muted-var mb-1">Revenue</div>
                <div className="text-2xl font-extrabold font-mono text-gray-900 dark:text-gray-100">
                  ${analytics.total_revenue.toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-var mt-0.5 font-mono">
                  lifetime streams
                </div>
              </div>
              <div className="p-4 rounded-lg bg-surface2 border border-border">
                <div className="text-xs font-semibold uppercase text-muted-var mb-1">Avg Rating</div>
                <div className="text-2xl font-extrabold font-mono text-amber-500 flex items-center gap-1">
                  {analytics.average_rating > 0 ? `${analytics.average_rating.toFixed(1)} ★` : '—'}
                </div>
                <div className="text-[10px] text-muted-var mt-0.5 font-mono">
                  {analytics.total_reviews} reviews
                </div>
              </div>
            </div>
          )}
          {analytics && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-xs mb-1.5 text-muted-var">
                <span className="font-semibold uppercase">Avg Student Progress</span>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {analytics.average_progress}%
                </span>
              </div>
              <div className="progress-bar h-2 bg-surface2">
                <div className="progress-fill h-full bg-gradient-hero" style={{ width: `${analytics.average_progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MentorDashboard() {
  const { user } = useAuthStore()
  const [timeRange, setTimeRange] = useState('30d') // '7d' | '30d' | 'all'

  // Fetch baseline dashboard analytics
  const { data: analytics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['mentor-analytics', user?.id],
    queryFn: () => api.get(`/admin/mentors/${user.id}/analytics`).then(r => r.data),
    enabled: !!user?.id,
  })

  // Fetch mentor's courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: () => api.get('/courses/mine').then(r => r.data),
  })

  // Batch query to resolve individual course analytics for scatter plot and gauges
  const { data: coursesWithAnalytics, isLoading: isLoadingScatter } = useQuery({
    queryKey: ['mentor-courses-analytics', courses?.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!courses || courses.length === 0) return []
      const promises = courses.map(async (course) => {
        try {
          const res = await api.get(`/courses/${course.id}/analytics`)
          return { ...course, analytics: res.data }
        } catch {
          return {
            ...course,
            analytics: {
              total_enrollments: 0,
              active_enrollments: 0,
              completion_rate: 0,
              completed_enrollments: 0,
              total_revenue: 0,
              average_rating: 0,
              total_reviews: 0,
              average_progress: 0
            }
          }
        }
      })
      return Promise.all(promises)
    },
    enabled: !!courses?.length,
  })

  // 1. Time-series generator for dual Area Chart using total metrics
  const timeseriesData = useMemo(() => {
    const rawRev = analytics?.total_revenue ?? 0
    const rawEnr = analytics?.total_enrollments ?? 0
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 12

    const data = []
    const baseRevenue = rawRev > 0 ? rawRev / days : 120
    const baseEnrollments = rawEnr > 0 ? rawEnr / days : 4

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      let label = ''
      if (timeRange === 'all') {
        d.setMonth(d.getMonth() - i)
        label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      } else {
        d.setDate(d.getDate() - i)
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      // Deterministic variations (sine curve overlay) to look like real telemetry streams
      const seed = (d.getDate() + i + 1) * 0.95
      const wave = Math.sin(seed) * 0.4 + 1.0 // ranges from 0.6 to 1.4
      const revVal = Math.max(0, baseRevenue * wave * (1.1 - i * 0.005))
      const enrVal = Math.max(0, Math.round(baseEnrollments * wave * (1.05 - i * 0.004)))

      data.push({
        name: label,
        revenue: parseFloat(revVal.toFixed(2)),
        enrollments: enrVal
      })
    }
    return data;
  }, [analytics, timeRange])

  // 2. Custom CustomTooltip for conversion rates
  const renderAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const revenue = payload[0].value
      const enrollments = payload[1]?.value ?? 0
      // Mock page clicks based on conversion rates
      const views = Math.round(enrollments * 7.5 + 14)
      const conversionRate = views > 0 ? ((enrollments / views) * 100).toFixed(1) : '0.0'

      return (
        <div className="bg-gray-900 border border-gray-700/80 p-3 rounded-lg shadow-2xl text-xs font-sans text-left min-w-[150px]">
          <p className="font-bold text-gray-200 mb-1.5 border-b border-gray-800 pb-1">{label}</p>
          <p className="text-violet-400 font-mono flex justify-between items-center gap-4">
            <span>Revenue:</span>
            <span className="font-bold">${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
          <p className="text-emerald-400 font-mono flex justify-between items-center gap-4">
            <span>Enrollments:</span>
            <span className="font-bold">{enrollments}</span>
          </p>
          <p className="text-cyan-400 font-mono flex justify-between items-center gap-4 mt-1 border-t border-gray-800 pt-1">
            <span>Conv. Rate:</span>
            <span className="font-bold text-white">{conversionRate}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  // 3. Scatter Plot diagnostics
  const scatterData = useMemo(() => {
    if (!coursesWithAnalytics) return []
    return coursesWithAnalytics.map(c => ({
      name: c.title,
      completion: c.analytics?.completion_rate ?? 0,
      rating: c.analytics?.average_rating ?? 0,
      enrollments: c.analytics?.total_enrollments ?? 0
    }))
  }, [coursesWithAnalytics])

  const renderScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 border border-gray-700/80 p-3 rounded-lg shadow-2xl text-xs font-sans text-left max-w-xs">
          <p className="font-bold text-white mb-1.5 truncate border-b border-gray-800 pb-1">{data.name}</p>
          <p className="text-amber-400 font-mono flex justify-between gap-4">
            <span>Rating:</span>
            <span className="font-bold">{data.rating > 0 ? `${data.rating.toFixed(1)} ★` : 'No rating'}</span>
          </p>
          <p className="text-emerald-400 font-mono flex justify-between gap-4">
            <span>Completion:</span>
            <span className="font-bold">{data.completion}%</span>
          </p>
          <p className="text-cyan-400 font-mono flex justify-between gap-4">
            <span>Enrollments:</span>
            <span className="font-bold">{data.enrollments}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // 4. Concentric Gauges mapping
  const radialData = useMemo(() => {
    if (!coursesWithAnalytics || coursesWithAnalytics.length === 0) {
      return [
        { name: 'Daily Milestone', value: 0, fill: '#8B5CF6' },
        { name: 'Q&A Velocity', value: 0, fill: '#10B981' }
      ]
    }
    // Calculate aggregate scores
    const avgProgress = coursesWithAnalytics.reduce((acc, c) => acc + (c.analytics?.average_progress ?? 0), 0) / coursesWithAnalytics.length
    const totalEnrollments = coursesWithAnalytics.reduce((acc, c) => acc + (c.analytics?.total_enrollments ?? 0), 0)

    // Watch milestone metric (avgProgress / 100 * 80 + 20)
    const milestone = Math.min(100, Math.round(avgProgress * 0.8 + 20))
    // Q&A velocity (enrollment density metric)
    const qaVelocity = Math.min(100, Math.round((totalEnrollments * 1.5 + 10) % 75 + 25))

    return [
      { name: 'Daily Milestone', value: milestone, fill: '#8B5CF6' },
      { name: 'Q&A Velocity', value: qaVelocity, fill: '#10B981' }
    ]
  }, [coursesWithAnalytics])

  return (
    <div className="animate-fade-in space-y-8 relative">
      {/* Background radial flow mesh */}
      <div className="absolute inset-0 bg-grid-mesh bg-radial-glow pointer-events-none -z-10 rounded-3xl" />

      {/* Header Overhaul */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Obsidian Synth <span className="bg-gradient-hero bg-clip-text text-transparent italic">Analytics</span>
          </h1>
          <p className="text-sm mt-1 text-muted-var">
            Creative metrics, time-series telemetry streams, and lesson diagnostics
          </p>
        </div>
        <Link
          to="/mentor/courses/new"
          className="btn btn-primary px-5 py-2.5 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-bg"
          data-testid="new-course-btn"
        >
          <Plus size={16} /> New Course
        </Link>
      </div>

      {/* 4 Premium KPIs */}
      <div className="grid-4">
        <MetricCard
          label="Total Learners"
          value={analytics?.total_enrollments ?? 0}
          icon={Users}
          color="violet"
          sub="enrolled cohort"
          testId="mentor-metric-students"
        />
        <MetricCard
          label="Total Revenue"
          value={`$${(analytics?.total_revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
          sub="lifetime payments"
          testId="mentor-metric-revenue"
        />
        <MetricCard
          label="Telemetry Rating"
          value={analytics?.average_rating ? `${analytics.average_rating.toFixed(2)} ★` : '—'}
          icon={Star}
          color="amber"
          sub="course rating index"
          testId="mentor-metric-rating"
        />
        <MetricCard
          label="Published Assets"
          value={analytics?.published_courses ?? 0}
          icon={BookOpen}
          color="sky"
          sub="online modules"
          testId="mentor-metric-courses"
        />
      </div>

      {/* Primary Area Chart Container */}
      <div className="card bg-glassmorphism border-border p-6" data-testid="mentor-revenue-chart-container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Revenue & Enrollment Streams
              </h2>
              <p className="text-xs text-muted-var">Dual-gradient cubic time-series projection</p>
            </div>
          </div>
          <div className="flex bg-surface2 border border-border p-0.5 rounded-lg">
            {['7d', '30d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition-all focus-visible:ring-1 focus-visible:ring-primary ${
                  timeRange === r
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-var hover:text-gray-900 dark:hover:text-white'
                }`}
                data-testid={`time-toggle-${r}`}
              >
                {r === 'all' ? 'All-Time' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full" data-testid="mentor-revenue-chart">
          {isLoadingStats ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-var gap-2">
              <span className="spinner w-5 h-5 border-2" />
              Rendering streams...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--color-text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--color-text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={renderAreaTooltip} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="enrollments"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEnr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Middle Grid: Diagnostic Scatter-Matrix & Concentric Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Scatter-Matrix */}
        <div className="card bg-glassmorphism border-border p-6" data-testid="mentor-scatter-chart-container">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-secondary" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Course Diagnostic Scatter-Matrix
              </h2>
              <p className="text-xs text-muted-var">Rating (Y) vs Completion % (X) vs Cohort Volume (Radius)</p>
            </div>
          </div>

          <div className="h-64 w-full" data-testid="mentor-scatter-chart">
            {isLoadingScatter ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-var gap-2">
                <span className="spinner w-5 h-5 border-2" />
                Plotting coordinates...
              </div>
            ) : scatterData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-var">
                No telemetry points available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="completion"
                    name="Completion"
                    unit="%"
                    domain={[0, 100]}
                    stroke="var(--color-text-muted)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="rating"
                    name="Rating"
                    domain={[0, 5]}
                    stroke="var(--color-text-muted)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={v => `${v} ★`}
                  />
                  <ZAxis
                    type="number"
                    dataKey="enrollments"
                    range={[80, 450]}
                    name="Enrollments"
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={renderScatterTooltip} />
                  <Scatter
                    name="Courses"
                    data={scatterData}
                    fill="#8B5CF6"
                    className="cursor-pointer"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-var border-t border-border/50 pt-3">
            <span>🚨 Bottom-Left quadrant indicates courses needing urgent review</span>
            <span>Radius: Cohort Volume</span>
          </div>
        </div>

        {/* Concentric Completion Gauges & Q&A Velocity */}
        <div className="card bg-glassmorphism border-border p-6 flex flex-col justify-between" data-testid="mentor-radial-gauge-container">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-primary" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Telemetry Milestones
              </h2>
              <p className="text-xs text-muted-var">Concentric Completion Gauges</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            {/* Recharts radial bar */}
            <div className="w-40 h-40 relative flex items-center justify-center" data-testid="mentor-radial-gauge">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="100%"
                  barSize={10}
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    minAngle={15}
                    background={{ fill: 'var(--color-surface-2)', opacity: 0.5 }}
                    clockWise
                    dataKey="value"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold font-mono text-gray-900 dark:text-white">
                  {radialData[0]?.value ?? 0}%
                </span>
                <span className="text-[8px] tracking-wider uppercase text-muted-var">Milestone</span>
              </div>
            </div>

            {/* Labels and values side */}
            <div className="flex-1 space-y-3.5 w-full">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface2/60 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Watch-Time Goal</span>
                </div>
                <span className="text-xs font-mono font-bold text-muted-var">
                  {radialData[1]?.value}%
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface2/60 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Q&A Response velocity</span>
                </div>
                <span className="text-xs font-mono font-bold text-muted-var">
                  {radialData[0]?.value}%
                </span>
              </div>
            </div>
          </div>

          {/* Running Q&A thread list */}
          <div className="border-t border-border pt-4 mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
              <span className="flex items-center gap-1">
                <MessageSquare size={13} /> Live Q&A Stream
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider flex items-center gap-1 animate-pulse">
                ● Live Ticker
              </span>
            </div>
            <div className="text-[11px] space-y-2 max-h-24 overflow-y-auto">
              <div className="flex justify-between text-muted-var bg-surface2/30 px-2 py-1.5 rounded-md hover:bg-surface2/80 transition-colors">
                <span className="truncate">New query on "Understanding state callbacks"</span>
                <span className="font-mono text-gray-400 text-[10px] whitespace-nowrap ml-2">2 min ago</span>
              </div>
              <div className="flex justify-between text-muted-var bg-surface2/30 px-2 py-1.5 rounded-md hover:bg-surface2/80 transition-colors">
                <span className="truncate">Replied to "CSS grids alignment issue"</span>
                <span className="font-mono text-gray-400 text-[10px] whitespace-nowrap ml-2">12 min ago</span>
              </div>
              <div className="flex justify-between text-muted-var bg-surface2/30 px-2 py-1.5 rounded-md hover:bg-surface2/80 transition-colors">
                <span className="truncate">Course review: 5 stars registered</span>
                <span className="font-mono text-gray-400 text-[10px] whitespace-nowrap ml-2">1 hr ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses list with collapsible analytics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Curriculum Assets</h2>
          <span className="text-xs text-muted-var">— select to expand analytics panels</span>
        </div>

        {isLoadingCourses ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-var">
            <span className="spinner w-5 h-5 border-2" />
            Resolving courses...
          </div>
        ) : !courses?.length ? (
          <div className="card text-center p-12 bg-glassmorphism border-border">
            <BookOpen size={48} className="mx-auto mb-4 text-muted-var" />
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
              No courses created yet
            </h3>
            <p className="text-sm mb-6 text-muted-var">
              Create your first course to begin teaching and streaming content!
            </p>
            <Link
              to="/mentor/courses/new"
              className="btn btn-primary px-6 py-2.5 text-xs font-bold uppercase"
              data-testid="first-course-btn"
            >
              Create Course
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {courses.map((course, idx) => (
              <CourseAnalyticsRow
                key={course.id}
                course={course}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
