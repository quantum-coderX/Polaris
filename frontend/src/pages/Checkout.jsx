import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api, { createCheckout, enrollFree } from '../services/api'
import {
  ShoppingCart, CheckCircle, XCircle, Loader2,
  Shield, Clock, BookOpen, ArrowLeft, CreditCard, Zap,
} from 'lucide-react'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Checkout() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') // 'success' | 'cancelled' | null
  const { isAuthenticated } = useAuthStore()

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-checkout', courseId],
    queryFn: () => api.get(`/courses/${courseId}`).then((r) => r.data),
  })

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated()) navigate('/login', { replace: true })
  }, [isAuthenticated, navigate])

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleStripeCheckout = async () => {
    setError(null)
    setProcessing(true)
    try {
      const { checkout_url } = await createCheckout(courseId)
      window.location.href = checkout_url
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to start checkout. Please try again.')
      setProcessing(false)
    }
  }

  const handleFreeEnroll = async () => {
    setError(null)
    setProcessing(true)
    try {
      await enrollFree(courseId)
      navigate(`/learn/${courseId}`, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Enrollment failed. Please try again.')
      setProcessing(false)
    }
  }

  // ── Status screens ────────────────────────────────────────────────────────
  if (status === 'success') return <SuccessScreen course={course} courseId={courseId} />
  if (status === 'cancelled') return <CancelledScreen course={course} courseId={courseId} onRetry={handleStripeCheckout} processing={processing} />

  if (isLoading) return <PageLoader />

  const isFree = course?.is_free || Number(course?.price ?? 0) === 0

  return (
    <div className="checkout-root">
      {/* Back link */}
      <Link to={`/courses/${course?.slug}`} className="checkout-back">
        <ArrowLeft size={16} /> Back to Course
      </Link>

      <div className="checkout-grid">
        {/* ── Left: Order Summary ───────────────────────────────────────── */}
        <div className="checkout-summary-col">
          <div className="checkout-card">
            <h2 className="checkout-section-title">Order Summary</h2>
            <div className="checkout-course-row">
              <img
                src={course?.thumbnail_url ?? `https://picsum.photos/seed/${courseId}/160/90`}
                alt={course?.title}
                className="checkout-thumbnail"
              />
              <div className="checkout-course-info">
                <p className="checkout-course-title">{course?.title}</p>
                <div className="checkout-course-meta">
                  <span className="badge badge-primary">{course?.level}</span>
                  {course?.total_lessons && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <BookOpen size={12} /> {course.total_lessons} lessons
                    </span>
                  )}
                  {course?.total_duration_minutes && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} /> {Math.round(course.total_duration_minutes / 60)}h {course.total_duration_minutes % 60}m
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="checkout-price-breakdown">
              <div className="checkout-price-row">
                <span className="text-gray-400">Original price</span>
                <span className={isFree ? 'line-through text-gray-600' : 'text-white font-semibold'}>
                  {isFree ? 'Free' : `$${Number(course?.price).toFixed(2)}`}
                </span>
              </div>
              <div className="checkout-price-divider" />
              <div className="checkout-price-row checkout-price-total">
                <span className="font-bold text-white">Total</span>
                <span className={`text-xl font-extrabold ${isFree ? 'text-secondary' : 'text-white'}`}>
                  {isFree ? 'FREE' : `$${Number(course?.price).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Guarantees */}
            <ul className="checkout-guarantees">
              <li>
                <CheckCircle size={14} className="text-secondary" />
                <span>30-day money-back guarantee</span>
              </li>
              <li>
                <CheckCircle size={14} className="text-secondary" />
                <span>Full lifetime access</span>
              </li>
              <li>
                <CheckCircle size={14} className="text-secondary" />
                <span>Certificate of completion</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Right: Payment ────────────────────────────────────────────── */}
        <div className="checkout-payment-col">
          <div className="checkout-card">
            <h2 className="checkout-section-title">
              {isFree ? 'Claim Your Free Course' : 'Secure Payment'}
            </h2>

            {error && (
              <div className="checkout-error" role="alert">
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {isFree ? (
              /* Free enroll */
              <div className="checkout-free-section">
                <div className="checkout-free-badge">
                  <Zap size={28} className="text-secondary" />
                  <span>This course is completely free!</span>
                </div>
                <p className="text-gray-400 text-sm text-center mb-6">
                  Enroll instantly — no payment needed.
                </p>
                <button
                  id="enroll-free-btn"
                  className="btn btn-secondary btn-full btn-lg"
                  onClick={handleFreeEnroll}
                  disabled={processing}
                >
                  {processing
                    ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                    : <><BookOpen size={18} /> Enroll Now &mdash; It&apos;s Free</>
                  }
                </button>
              </div>
            ) : (
              /* Paid checkout */
              <div className="checkout-paid-section">
                {/* Stripe branding hint */}
                <div className="checkout-stripe-badge">
                  <Shield size={14} className="text-primary" />
                  <span>Secured by <strong>Stripe</strong></span>
                  <CreditCard size={14} className="text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm text-center mb-6">
                   You&apos;ll be redirected to Stripe&apos;s secure checkout to complete payment.
                </p>

                {/* Card logos */}
                <div className="checkout-card-logos">
                  {['VISA', 'MC', 'AMEX', 'PAY'].map((brand) => (
                    <span key={brand} className="checkout-card-chip">{brand}</span>
                  ))}
                </div>

                <button
                  id="stripe-checkout-btn"
                  className="btn btn-primary btn-full btn-lg"
                  onClick={handleStripeCheckout}
                  disabled={processing}
                >
                  {processing
                    ? <><Loader2 size={18} className="animate-spin" /> Redirecting to Stripe…</>
                    : <><ShoppingCart size={18} /> Pay ${Number(course?.price).toFixed(2)} with Stripe</>
                  }
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By completing your purchase you agree to our{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ course, courseId }) {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate(`/learn/${courseId}`), 5000)
    return () => clearTimeout(t)
  }, [courseId, navigate])

  return (
    <div className="checkout-status-screen">
      <div className="checkout-status-card checkout-status-card--success">
        <div className="checkout-status-icon checkout-status-icon--success">
          <CheckCircle size={56} />
        </div>
        <h1 className="checkout-status-title">You&apos;re enrolled! 🎉</h1>
        <p className="checkout-status-msg">
          Payment confirmed. Your access to <strong>{course?.title ?? 'the course'}</strong> is ready.
        </p>
        <p className="text-xs text-gray-500 mb-6">Redirecting to your lesson in 5 seconds…</p>
        <button
          id="go-learn-btn"
          className="btn btn-primary btn-lg"
          onClick={() => navigate(`/learn/${courseId}`)}
        >
          <BookOpen size={18} /> Start Learning Now
        </button>
      </div>
    </div>
  )
}

// ─── Cancelled Screen ─────────────────────────────────────────────────────────

function CancelledScreen({ course, courseId, onRetry, processing }) {
  return (
    <div className="checkout-status-screen">
      <div className="checkout-status-card checkout-status-card--cancelled">
        <div className="checkout-status-icon checkout-status-icon--cancelled">
          <XCircle size={56} />
        </div>
        <h1 className="checkout-status-title">Payment cancelled</h1>
        <p className="checkout-status-msg">
           No charges were made. You can try again whenever you&apos;re ready.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            id="retry-checkout-btn"
            className="btn btn-primary btn-lg"
            onClick={onRetry}
            disabled={processing}
          >
            {processing
              ? <><Loader2 size={18} className="animate-spin" /> Please wait…</>
              : <><ShoppingCart size={18} /> Try Again</>
            }
          </button>
          <Link
            to={`/courses/${course?.slug ?? courseId}`}
            className="btn btn-secondary btn-lg"
          >
            <ArrowLeft size={18} /> Back to Course
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Page Loader ─────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-primary" />
    </div>
  )
}
