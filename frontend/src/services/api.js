import axios from 'axios'
import { useAuthStore, AUTH_STATUS } from '../store/authStore'

const defaultUrl = import.meta.env.VITE_API_URL || '';
const SERVICE_URLS = {
  auth: import.meta.env.VITE_AUTH_API_URL || defaultUrl,
  payment: import.meta.env.VITE_PAYMENT_API_URL || defaultUrl,
  notif: import.meta.env.VITE_NOTIF_API_URL || defaultUrl,
  core: import.meta.env.VITE_CORE_API_URL || defaultUrl
}

function getBaseUrlForPath(url = '') {
  const cleanUrl = url.replace(/^\//, '')
  
  const appendApiV1 = (baseUrl) => {
    if (baseUrl.endsWith('/api/v1')) return baseUrl;
    return baseUrl ? `${baseUrl}/api/v1` : '/api/v1';
  }

  if (cleanUrl.startsWith('auth') || cleanUrl.startsWith('users')) {
    return appendApiV1(SERVICE_URLS.auth);
  }
  if (cleanUrl.startsWith('payments')) {
    return appendApiV1(SERVICE_URLS.payment);
  }
  if (cleanUrl.startsWith('notifications')) {
    return appendApiV1(SERVICE_URLS.notif);
  }
  return appendApiV1(SERVICE_URLS.core);
}

const api = axios.create({
  withCredentials: true, // HttpOnly refresh cookie
})



const AUTH_SKIP_PATHS = ['/auth/refresh', '/auth/login', '/auth/admin-login', '/auth/register', '/auth/logout']

function shouldSkipTokenRefresh(url = '') {
  return AUTH_SKIP_PATHS.some((path) => url.includes(path))
}

/** Single in-flight refresh — concurrent 401s await the same promise (request queue). */
let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  const store = useAuthStore.getState()
  store.setAuthStatus(AUTH_STATUS.AUTHENTICATING)

  refreshPromise = axios
    .post('/api/v1/auth/refresh', {}, { withCredentials: true })
    .then(({ data }) => {
      const newToken = data.access_token
      store.setAccessToken(newToken)
      store.setAuthStatus(AUTH_STATUS.AUTHENTICATED)
      return newToken
    })
    .catch((err) => {
      store.logout()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrlForPath(config.url)
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      shouldSkipTokenRefresh(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newToken = await refreshAccessToken()
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?reason=session_expired')
      }
      return Promise.reject(refreshError)
    }
  },
)

export default api

// ─── Typed API helpers ────────────────────────────────────────────────────────

/** Returns the pre-signed stream URL for a lesson */
export const getStreamUrl = (lessonId) =>
  api.get(`/lessons/${lessonId}/stream`).then((r) => r.data)

/** Mark a lesson complete and update progress */
export const postProgress = (courseId, lessonId) =>
  api.post(`/enrollments/${courseId}/progress`, { lesson_id: lessonId }).then((r) => r.data)

/** Fetch Q&A messages for a course */
export const getQAMessages = (courseId) =>
  api.get(`/qa/${courseId}/messages`).then((r) => r.data)

/** Post a new Q&A message */
export const postQAMessage = (courseId, body) =>
  api.post(`/qa/${courseId}/messages`, { body }).then((r) => r.data)

/** Start Stripe checkout — returns { checkout_url } */
export const createCheckout = (courseId) =>
  api
    .post('/payments/checkout', {
      course_id: courseId,
      success_url: `${window.location.origin}/checkout/${courseId}?status=success`,
      cancel_url: `${window.location.origin}/checkout/${courseId}?status=cancelled`,
    })
    .then((r) => r.data)

/** Direct free-course enrollment */
export const enrollFree = (courseId) =>
  api.post(`/enrollments/${courseId}`).then((r) => r.data)

// ─── Quiz helpers ─────────────────────────────────────────────────────────────

/** Get the quiz attached to a lesson (404 if none) */
export const getQuizForLesson = (lessonId) =>
  api.get(`/lessons/${lessonId}/quiz`).then((r) => r.data)

/** Get quiz questions (without correct answers) */
export const getQuizQuestions = (quizId) =>
  api.get(`/quizzes/${quizId}/questions`).then((r) => r.data)

/** Submit answers for grading — returns QuizResult */
export const submitQuiz = (quizId, answers) =>
  api.post(`/quizzes/${quizId}/submit`, { answers }).then((r) => r.data)

/** Get student's past attempts on a quiz */
export const getQuizAttempts = (quizId) =>
  api.get(`/quizzes/${quizId}/attempts`).then((r) => r.data)

// ─── Certificate helpers ──────────────────────────────────────────────────────

/** Generate (or re-fetch) a certificate for a completed course */
export const generateCertificate = (courseId) =>
  api.post(`/certificates/${courseId}`).then((r) => r.data)

/** Public verify endpoint (no auth) */
export const verifyCertificate = (certId) =>
  api.get(`/certificates/verify/${certId}`).then((r) => r.data)

// ─── Profile helpers ──────────────────────────────────────────────────────────

/** Update the current user's profile */
export const updateProfile = (data) =>
  api.patch('/users/me', data).then((r) => r.data)

/** Upload a new avatar picture */
export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

/** Get the current user's full profile */
export const getMyProfile = () =>
  api.get('/auth/me').then((r) => r.data)

// ─── Course Analytics helpers ─────────────────────────────────────────────────

/** Get detailed analytics for a single course (mentor/admin only) */
export const getCourseAnalytics = (courseId) =>
  api.get(`/courses/${courseId}/analytics`).then((r) => r.data)

/** Get mentor's aggregate analytics */
export const getMentorAnalytics = (mentorId) =>
  api.get(`/admin/mentors/${mentorId}/analytics`).then((r) => r.data)

// ─── Admin helpers ────────────────────────────────────────────────────────────

/** List all payments (admin only) */
export const getAdminPayments = (status) =>
  api.get(`/admin/payments${status ? `?status=${status}` : ''}`).then((r) => r.data)

/** Issue a refund (admin only) */
export const issueRefund = (payment_id, reason) =>
  api.post('/payments/refund', { payment_id, reason }).then((r) => r.data)

/** Download a CSV report — returns a Blob */
export const exportReport = (type) =>
  api.get(`/admin/reports/export?type=${type}`, { responseType: 'blob' }).then((r) => r.data)

// ─── Enhanced Search helpers ──────────────────────────────────────────────────

/** Search courses with all filters including rating */
export const searchCourses = (params) =>
  api.get('/search/courses', { params }).then((r) => r.data)

/** Autocomplete course titles */
export const autocompleteCourses = (q) =>
  api.get('/search/autocomplete', { params: { q } }).then((r) => r.data)
