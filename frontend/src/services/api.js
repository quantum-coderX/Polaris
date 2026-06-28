import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // for httpOnly refresh cookie
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(Promise.reject)
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        const newToken = data.access_token
        useAuthStore.getState().setAccessToken(newToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
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
