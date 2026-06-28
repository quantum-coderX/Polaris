import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, BookOpen, DollarSign, Clock, CheckCircle, XCircle,
  AlertTriangle, Download, BarChart3, CreditCard, FileText,
  X, ArrowRight, ShieldCheck, HelpCircle, Loader2
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Shimmer Skeleton Component ──
function ShimmerSkeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-800/80 rounded ${className}`} />
  )
}

// ── Sparkline Helper ──
function MiniSparkline({ data, color }) {
  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricCardWithSparkline({ label, value, icon: Icon, color, hexColor, sub, sparklineData, isLoading, testId }) {
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

      {isLoading ? (
        <div className="space-y-2 py-1">
          <ShimmerSkeleton className="h-8 w-2/3" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <>
          <div className="metric-card__value font-mono text-3xl font-extrabold tracking-tight">
            {value}
          </div>
          {sub && <div className="metric-card__sub text-xs mt-1.5 text-muted-var">{sub}</div>}
          {sparklineData && <MiniSparkline data={sparklineData} color={hexColor} />}
        </>
      )}
    </div>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'courses', label: 'Courses', icon: BookOpen, countKey: 'courses' },
  { id: 'mentors', label: 'Mentors', icon: Users, countKey: 'mentors' },
  { id: 'reviews', label: 'Reported Reviews', icon: AlertTriangle, countKey: 'reviews' },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: FileText },
]

export default function AdminDashboard() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [refundPaymentId, setRefundPaymentId] = useState(null) // Holds payment ID for refund drawer
  const [refundReason, setRefundReason] = useState('')
  const [refundReasonTouched, setRefundReasonTouched] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState({}) // track loading for each CSV download

  // ── Queries ──
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const { data: pendingCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['pending-courses'],
    queryFn: () => api.get('/admin/courses/pending').then(r => r.data),
    enabled: activeTab === 'courses' || activeTab === 'overview',
  })

  const { data: pendingMentors, isLoading: isLoadingMentors } = useQuery({
    queryKey: ['pending-mentors'],
    queryFn: () => api.get('/admin/users/pending-mentors').then(r => r.data),
    enabled: activeTab === 'mentors' || activeTab === 'overview',
  })

  const { data: reportedReviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reported-reviews'],
    queryFn: () => api.get('/admin/reviews/reported').then(r => r.data),
    enabled: activeTab === 'reviews',
  })

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => api.get('/admin/payments').then(r => r.data),
    enabled: activeTab === 'payments',
  })

  // ── Mutations ──
  const approveCourse = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries(['pending-courses'])
      qc.invalidateQueries(['admin-stats'])
      toast.success('Course approved & curriculum verified!')
    },
    onError: () => toast.error('Failed to approve course'),
  })

  const rejectCourse = useMutation({
    mutationFn: (id) => api.post(`/courses/${id}/reject`),
    onSuccess: () => {
      qc.invalidateQueries(['pending-courses'])
      qc.invalidateQueries(['admin-stats'])
      toast.success('Course rejected and archived')
    },
    onError: () => toast.error('Failed to reject course'),
  })

  const approveMentor = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries(['pending-mentors'])
      qc.invalidateQueries(['admin-stats'])
      toast.success('Mentor approved and credentials activated!')
    },
    onError: () => toast.error('Failed to approve mentor'),
  })

  const moderateReview = useMutation({
    mutationFn: ({ id, approve }) => api.patch(`/reviews/${id}/moderate?approve=${approve}`),
    onSuccess: () => {
      qc.invalidateQueries(['reported-reviews'])
      toast.success('Review moderation completed')
    },
    onError: () => toast.error('Moderation action failed'),
  })

  const refundPayment = useMutation({
    mutationFn: ({ payment_id, reason }) => api.post('/payments/refund', { payment_id, reason }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-payments'])
      qc.invalidateQueries(['admin-stats'])
      toast.success('Refund processed via Stripe successfully!')
      setRefundPaymentId(null)
      setRefundReason('')
      setRefundReasonTouched(false)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Refund failed')
    },
  })

  // ── CSV Export ──
  const exportReport = async (type) => {
    setDownloadingReport(prev => ({ ...prev, [type]: true }))
    try {
      const response = await api.get(`/admin/reports/export?type=${type}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `polaris_${type}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`${type.toUpperCase()} database exported successfully!`)
    } catch {
      toast.error('File streaming failed. Please try again.')
    } finally {
      setDownloadingReport(prev => ({ ...prev, [type]: false }))
    }
  }

  // ── Sparklines Data Generators ──
  const userSparkline = useMemo(() => {
    const val = stats?.total_users ?? 24
    return Array.from({ length: 8 }, (_, i) => ({ value: val * (0.8 + Math.sin(i) * 0.15 + i * 0.02) }))
  }, [stats])

  const courseSparkline = useMemo(() => {
    const val = stats?.total_courses ?? 12
    return Array.from({ length: 8 }, (_, i) => ({ value: val * (0.75 + Math.cos(i) * 0.12 + i * 0.03) }))
  }, [stats])

  const pendingSparkline = useMemo(() => {
    const val = stats?.pending_courses ?? 3
    return Array.from({ length: 8 }, (_, i) => ({ value: val * (0.9 + Math.sin(i * 1.5) * 0.1) }))
  }, [stats])

  const revenueSparkline = useMemo(() => {
    const val = stats?.total_revenue ?? 1500
    return Array.from({ length: 8 }, (_, i) => ({ value: val * (0.7 + Math.sin(i) * 0.2 + i * 0.04) }))
  }, [stats])

  // Active inline refund validation
  const refundValidationError = useMemo(() => {
    if (!refundReasonTouched) return null
    if (!refundReason.trim()) return 'Refund justification is required.'
    if (refundReason.trim().length < 5) return 'Reason must be at least 5 characters to document request.'
    return null
  }, [refundReason, refundReasonTouched])

  // Payment item mapping to show modal details
  const activeRefundPayment = useMemo(() => {
    if (!refundPaymentId || !paymentsData?.payments) return null
    return paymentsData.payments.find(p => p.id === refundPaymentId)
  }, [refundPaymentId, paymentsData])

  return (
    <div className="animate-fade-in relative space-y-8 min-h-screen">
      {/* Mesh Background */}
      <div className="absolute inset-0 bg-grid-mesh bg-radial-glow pointer-events-none -z-10 rounded-3xl" />

      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Command Console <span className="bg-gradient-hero bg-clip-text text-transparent italic">Admin</span>
          </h1>
          <p className="text-sm mt-1 text-muted-var">
            Moderate platform assets, authorize credentials, view payments, and run audit streams
          </p>
        </div>
      </div>

      {/* Tabs list with counts */}
      <div
        className="flex gap-1.5 p-1.5 rounded-xl overflow-x-auto bg-surface/50 backdrop-blur-md border border-border shadow-sm"
        role="tablist"
      >
        {TABS.map(t => {
          let count = 0
          if (t.countKey === 'courses') count = pendingCourses?.length ?? 0
          if (t.countKey === 'mentors') count = pendingMentors?.length ?? 0
          if (t.countKey === 'reviews') count = reportedReviews?.length ?? 0

          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                activeTab === t.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-var hover:text-gray-900 dark:hover:text-white'
              }`}
              data-testid={`admin-tab-${t.id}`}
            >
              <t.icon size={15} />
              <span>{t.label}</span>
              {count > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    t.countKey === 'reviews'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-black'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in" role="tabpanel">
          <div className="grid-4">
            <MetricCardWithSparkline
              label="Registered Learners"
              value={stats?.total_users ?? 0}
              icon={Users}
              color="violet"
              hexColor="#8B5CF6"
              sub="active accounts"
              sparklineData={userSparkline}
              isLoading={isLoadingStats}
              testId="admin-metric-users"
            />
            <MetricCardWithSparkline
              label="Curriculum Assets"
              value={stats?.total_courses ?? 0}
              icon={BookOpen}
              color="sky"
              hexColor="#3B82F6"
              sub="total online classes"
              sparklineData={courseSparkline}
              isLoading={isLoadingStats}
              testId="admin-metric-courses"
            />
            <MetricCardWithSparkline
              label="Pending Audit"
              value={stats?.pending_courses ?? 0}
              icon={Clock}
              color="amber"
              hexColor="#F59E0B"
              sub="courses awaiting review"
              sparklineData={pendingSparkline}
              isLoading={isLoadingStats}
              testId="admin-metric-pending"
            />
            <MetricCardWithSparkline
              label="Platform Revenue"
              value={`$${(stats?.total_revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="green"
              hexColor="#10B981"
              sub="lifetime gross volume"
              sparklineData={revenueSparkline}
              isLoading={isLoadingStats}
              testId="admin-metric-revenue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Pending Courses preview */}
            <div className="card bg-glassmorphism border-border p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Clock className="text-amber-500" size={18} />
                  Pending Course Audits
                </h3>
                <p className="text-xs text-muted-var">
                  Courses awaiting evaluation before publication to browse directory
                </p>
                {isLoadingCourses ? (
                  <div className="space-y-2.5 mt-4">
                    <ShimmerSkeleton className="h-10 w-full" />
                    <ShimmerSkeleton className="h-10 w-full" />
                  </div>
                ) : !pendingCourses || pendingCourses.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-var gap-1.5">
                    <ShieldCheck size={28} className="text-emerald-500" />
                    <span>No course submissions pending audit</span>
                  </div>
                ) : (
                  <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                    {pendingCourses.slice(0, 3).map(c => (
                      <div key={c.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-surface2/50 border border-border/40 hover:border-border transition-colors">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-4">{c.title}</span>
                        <span className="font-mono text-muted-var text-[10px] whitespace-nowrap">${c.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {pendingCourses?.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm font-bold uppercase w-full mt-4 text-[10px] tracking-wider focus-visible:ring-2"
                  onClick={() => setActiveTab('courses')}
                  data-testid="go-to-courses-btn"
                >
                  Process Queue ({pendingCourses.length}) →
                </button>
              )}
            </div>

            {/* Quick Pending Mentors preview */}
            <div className="card bg-glassmorphism border-border p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Users className="text-primary" size={18} />
                  Pending Mentor Approvals
                </h3>
                <p className="text-xs text-muted-var">
                  Instructors requesting platform onboarding credentials
                </p>
                {isLoadingMentors ? (
                  <div className="space-y-2.5 mt-4">
                    <ShimmerSkeleton className="h-10 w-full" />
                    <ShimmerSkeleton className="h-10 w-full" />
                  </div>
                ) : !pendingMentors || pendingMentors.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-var gap-1.5">
                    <ShieldCheck size={28} className="text-emerald-500" />
                    <span>No onboarding applications pending review</span>
                  </div>
                ) : (
                  <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                    {pendingMentors.slice(0, 3).map(m => (
                      <div key={m.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-surface2/50 border border-border/40 hover:border-border transition-colors">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">{m.full_name}</span>
                          <span className="text-[10px] text-muted-var">{m.email}</span>
                        </div>
                        <ArrowRight size={13} className="text-muted-var" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {pendingMentors?.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm font-bold uppercase w-full mt-4 text-[10px] tracking-wider focus-visible:ring-2"
                  onClick={() => setActiveTab('mentors')}
                  data-testid="go-to-mentors-btn"
                >
                  Authorize Instructors ({pendingMentors.length}) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COURSES TAB ── */}
      {activeTab === 'courses' && (
        <section className="space-y-6 animate-fade-in" role="tabpanel">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending Course Submissions</h2>
              <p className="text-xs text-muted-var">Verify modules and approve layout publishing request</p>
            </div>
            <span className="text-xs font-mono bg-surface2 px-2.5 py-1 rounded-md border border-border text-muted-var">
              Queue: {pendingCourses?.length ?? 0}
            </span>
          </div>

          {isLoadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ShimmerSkeleton className="h-32 w-full" />
              <ShimmerSkeleton className="h-32 w-full" />
            </div>
          ) : !pendingCourses || pendingCourses.length === 0 ? (
            <div className="card text-center py-16 bg-glassmorphism border-border">
              <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Clear Audit Queue</h3>
              <p className="text-xs text-muted-var mt-1">No course requests are pending evaluation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingCourses.map(course => (
                <div
                  key={course.id}
                  className="card bg-glassmorphism border-border p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary"
                  data-testid={`pending-course-card-${course.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        ID: #{course.id}
                      </span>
                      <span className="text-sm font-extrabold font-mono text-gray-900 dark:text-white">
                        ${course.price.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{course.title}</h3>
                    <p className="text-xs text-muted-var line-clamp-2">{course.description}</p>
                    <div className="text-[10px] uppercase font-semibold text-muted-var flex gap-3">
                      <span>Level: {course.level}</span>
                      <span>Language: {course.language}</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 border-t border-border/40">
                    <button
                      className="btn btn-secondary btn-sm flex-1 font-bold text-[10px] uppercase tracking-wider hover:border-emerald-500 hover:text-emerald-500 focus-visible:ring-2 disabled:opacity-50"
                      onClick={() => approveCourse.mutate(course.id)}
                      disabled={approveCourse.isPending || rejectCourse.isPending}
                      data-testid={`course-approve-btn-${course.id}`}
                    >
                      {approveCourse.isPending ? 'Working...' : 'Approve'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm flex-1 font-bold text-[10px] uppercase tracking-wider focus-visible:ring-2 disabled:opacity-50"
                      onClick={() => rejectCourse.mutate(course.id)}
                      disabled={approveCourse.isPending || rejectCourse.isPending}
                      data-testid={`course-reject-btn-${course.id}`}
                    >
                      {rejectCourse.isPending ? 'Working...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── MENTORS TAB ── */}
      {activeTab === 'mentors' && (
        <section className="space-y-6 animate-fade-in" role="tabpanel">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Instructor Credentials</h2>
              <p className="text-xs text-muted-var">Authorize pending applications to grant mentor permissions</p>
            </div>
            <span className="text-xs font-mono bg-surface2 px-2.5 py-1 rounded-md border border-border text-muted-var">
              Queue: {pendingMentors?.length ?? 0}
            </span>
          </div>

          {isLoadingMentors ? (
            <div className="space-y-3">
              <ShimmerSkeleton className="h-20 w-full" />
              <ShimmerSkeleton className="h-20 w-full" />
            </div>
          ) : !pendingMentors || pendingMentors.length === 0 ? (
            <div className="card text-center py-16 bg-glassmorphism border-border">
              <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Clear Instructor Queue</h3>
              <p className="text-xs text-muted-var mt-1">No mentor onboarding forms require approval.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingMentors.map(mentor => (
                <div
                  key={mentor.id}
                  className="card bg-glassmorphism border-border p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-primary"
                  data-testid={`pending-mentor-card-${mentor.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm shadow-primary/20">
                      {mentor.full_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{mentor.full_name}</h3>
                      <p className="text-xs text-muted-var">
                        @{mentor.username} · {mentor.email}
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm px-4 py-2 font-bold text-[10px] uppercase tracking-wider w-full sm:w-auto focus-visible:ring-2 disabled:opacity-50"
                    onClick={() => approveMentor.mutate(mentor.id)}
                    disabled={approveMentor.isPending}
                    data-testid={`mentor-approve-btn-${mentor.id}`}
                  >
                    {approveMentor.isPending ? 'Authorizing...' : 'Authorize Instructor'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── REPORTED REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <section className="space-y-6 animate-fade-in" role="tabpanel">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reported Course Reviews</h2>
              <p className="text-xs text-muted-var">Evaluate review flag warnings and moderate content layout</p>
            </div>
            <span className="text-xs font-mono bg-surface2 px-2.5 py-1 rounded-md border border-border text-muted-var">
              Alerts: {reportedReviews?.length ?? 0}
            </span>
          </div>

          {isLoadingReviews ? (
            <div className="space-y-3">
              <ShimmerSkeleton className="h-24 w-full" />
              <ShimmerSkeleton className="h-24 w-full" />
            </div>
          ) : !reportedReviews || reportedReviews.length === 0 ? (
            <div className="card text-center py-16 bg-glassmorphism border-border">
              <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Review Database Clean</h3>
              <p className="text-xs text-muted-var mt-1">No reported feedback requires action.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reportedReviews.map(review => (
                <div
                  key={review.id}
                  className="card bg-glassmorphism border-border p-5 flex flex-col md:flex-row justify-between items-start gap-4 transition-all hover:border-primary"
                  data-testid={`reported-review-card-${review.id}`}
                >
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-mono">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span className="text-[10px] text-muted-var">
                        Review ID: #{review.id} · Student #{review.student_id} · Course #{review.course_id}
                      </span>
                    </div>
                    <p className="text-xs italic text-gray-800 dark:text-gray-200">
                      "{review.body}"
                    </p>
                    {review.report_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-lg text-[10px] flex items-center gap-1.5 font-semibold">
                        <AlertTriangle size={12} />
                        <span>Flag: {review.report_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                    <button
                      className="btn btn-secondary btn-sm flex-1 md:flex-initial font-bold text-[10px] uppercase tracking-wider hover:border-emerald-500 hover:text-emerald-500 focus-visible:ring-2 disabled:opacity-50"
                      onClick={() => moderateReview.mutate({ id: review.id, approve: true })}
                      disabled={moderateReview.isPending}
                      data-testid={`review-keep-btn-${review.id}`}
                    >
                      Keep Review
                    </button>
                    <button
                      className="btn btn-danger btn-sm flex-1 md:flex-initial font-bold text-[10px] uppercase tracking-wider focus-visible:ring-2 disabled:opacity-50"
                      onClick={() => moderateReview.mutate({ id: review.id, approve: false })}
                      disabled={moderateReview.isPending}
                      data-testid={`review-remove-btn-${review.id}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <section className="space-y-6 animate-fade-in" role="tabpanel">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Logs</h2>
              <p className="text-xs text-muted-var">Monitor sales data and issue merchant refunds</p>
            </div>
          </div>

          {/* Quick total overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card bg-glassmorphism border-border p-5">
              <div className="text-xs uppercase font-semibold text-muted-var mb-1">Completed Purchases</div>
              <div className="text-2xl font-extrabold font-mono text-gray-900 dark:text-white">
                {isLoadingPayments ? <ShimmerSkeleton className="h-8 w-16" /> : (paymentsData?.total_completed ?? 0)}
              </div>
            </div>
            <div className="card bg-glassmorphism border-border p-5">
              <div className="text-xs uppercase font-semibold text-muted-var mb-1">Gross Invoiced Revenue</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-500">
                {isLoadingPayments ? (
                  <ShimmerSkeleton className="h-8 w-32" />
                ) : (
                  `$${(paymentsData?.total_revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card bg-glassmorphism border-border p-0 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" data-testid="payments-table">
                <thead className="bg-surface2 text-muted-var font-bold uppercase tracking-wider text-[10px] border-b border-border/80">
                  <tr>
                    <th className="px-5 py-3">Txn ID</th>
                    <th className="px-5 py-3">Value</th>
                    <th className="px-5 py-3">Learner ID</th>
                    <th className="px-5 py-3">Course ID</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingPayments ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-12" /></td>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-16" /></td>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-10" /></td>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-10" /></td>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-20" /></td>
                        <td className="px-5 py-3.5"><ShimmerSkeleton className="h-3 w-14" /></td>
                        <td className="px-5 py-3.5 text-right"><ShimmerSkeleton className="h-6 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : !paymentsData?.payments || paymentsData.payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-var">
                        No transactions registered in database logs.
                      </td>
                    </tr>
                  ) : (
                    paymentsData.payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-gray-900 dark:text-white">
                          #{payment.id}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-950 dark:text-gray-100">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 font-mono">
                          {payment.student_id}
                        </td>
                        <td className="px-5 py-3.5 font-mono">
                          {payment.course_id}
                        </td>
                        <td className="px-5 py-3.5 text-muted-var">
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`badge uppercase text-[9px] font-bold px-2 py-0.5 ${
                              payment.status === 'completed' ? 'badge-success' :
                              payment.status === 'refunded' ? 'badge-warning' :
                              'badge-danger'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {payment.status === 'completed' ? (
                            <button
                              className="btn btn-danger btn-sm py-1 px-3 text-[10px] uppercase font-bold focus-visible:ring-2"
                              onClick={() => setRefundPaymentId(payment.id)}
                              data-testid={`refund-trigger-btn-${payment.id}`}
                            >
                              Refund
                            </button>
                          ) : payment.status === 'refunded' ? (
                            <span className="text-[10px] text-amber-500 font-medium italic">
                              Refunded: {payment.refund_reason || 'requested'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-var">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── REPORTS TAB ── */}
      {activeTab === 'reports' && (
        <section className="space-y-6 animate-fade-in" role="tabpanel">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">CSV Telemetry Exporter</h2>
            <p className="text-xs text-muted-var">Export server table schemas into local spreadsheets</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { type: 'users', label: 'Registered Accounts', desc: 'Full user registry schema listing roles, emails, and usernames', icon: Users },
              { type: 'enrollments', label: 'Enrollment Telemetry', desc: 'Complete logs of learner enrollments mapping course access and purchase history', icon: BookOpen },
              { type: 'revenue', label: 'Invoice Receipts', desc: 'Financial transaction details including Stripe references and currency listings', icon: DollarSign }
            ].map(report => {
              const isDownloading = downloadingReport[report.type]
              return (
                <div
                  key={report.type}
                  className="card bg-glassmorphism border-border p-6 flex flex-col justify-between gap-4 transition-all hover:border-primary"
                  data-testid={`report-card-${report.type}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <report.icon className="text-primary" size={18} />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {report.label}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-var">{report.desc}</p>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm font-bold uppercase text-[10px] tracking-wider w-full mt-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                    onClick={() => exportReport(report.type)}
                    disabled={isDownloading}
                    data-testid={`export-btn-${report.type}`}
                  >
                    {isDownloading ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 className="animate-spin" size={12} />
                        Streaming file...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Download size={13} />
                        Download CSV
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Slide-Out Refund Drawer ── */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 pointer-events-none ${
          activeRefundPayment ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={() => {
          if (!refundPayment.isPending) {
            setRefundPaymentId(null)
            setRefundReason('')
            setRefundReasonTouched(false)
          }
        }}
      >
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 ease-out z-50 ${
            activeRefundPayment ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                Process Stripe Refund
              </h3>
              <button
                className="p-1 rounded-lg text-muted-var hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={() => {
                  setRefundPaymentId(null)
                  setRefundReason('')
                  setRefundReasonTouched(false)
                }}
                disabled={refundPayment.isPending}
                aria-label="Close refund drawer"
                data-testid="refund-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {activeRefundPayment && (
              <div className="space-y-3 bg-surface2/50 p-4 rounded-xl border border-border text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-var">Transaction ID:</span>
                  <span className="font-mono font-bold">#{activeRefundPayment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-var">Charge Amount:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">${activeRefundPayment.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-var">Learner Reference:</span>
                  <span className="font-mono text-gray-900 dark:text-white">ID #{activeRefundPayment.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-var">Course Catalog:</span>
                  <span className="font-mono text-gray-900 dark:text-white">ID #{activeRefundPayment.course_id}</span>
                </div>
              </div>
            )}

            {/* Input form */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-var">
                Justification reason (required)
              </label>
              <textarea
                className={`w-full p-3 text-xs bg-surface2 border rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus:border-primary outline-none transition-all ${
                  refundValidationError ? 'border-red-500' : 'border-border'
                }`}
                rows={4}
                placeholder="Student requested due to audio errors, duplicate payment ledger entry..."
                value={refundReason}
                onChange={e => {
                  setRefundReason(e.target.value)
                  setRefundReasonTouched(true)
                }}
                onBlur={() => setRefundReasonTouched(true)}
                disabled={refundPayment.isPending}
                data-testid="refund-input-reason"
              />
              {refundValidationError && (
                <p className="text-[10px] text-red-500 font-semibold" data-testid="refund-error-msg">
                  ⚠️ {refundValidationError}
                </p>
              )}
            </div>

            {refundPayment.error && (
              <div
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-[10px] font-semibold flex items-start gap-1.5"
                data-testid="refund-api-error"
              >
                <AlertTriangle className="shrink-0 mt-0.5" size={13} />
                <span>
                  <strong>Stripe Refused Charge:</strong> {refundPayment.error?.response?.data?.detail || refundPayment.error.message}
                </span>
              </div>
            )}
          </div>

          {/* Footer Action Lock */}
          <div className="flex gap-3 border-t border-border pt-4 mt-auto">
            <button
              className="btn btn-secondary flex-1 font-bold text-xs uppercase focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                setRefundPaymentId(null)
                setRefundReason('')
                setRefundReasonTouched(false)
              }}
              disabled={refundPayment.isPending}
              data-testid="refund-cancel-btn"
            >
              Cancel
            </button>
            <button
              className="btn btn-danger flex-1 font-bold text-xs uppercase focus-visible:ring-2 focus-visible:ring-offset-2"
              disabled={!refundReason.trim() || !!refundValidationError || refundPayment.isPending}
              onClick={() => {
                refundPayment.mutate({
                  payment_id: activeRefundPayment.id,
                  reason: refundReason
                })
              }}
              data-testid="refund-submit-btn"
            >
              {refundPayment.isPending ? 'Processing Refund...' : 'Confirm Refund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
