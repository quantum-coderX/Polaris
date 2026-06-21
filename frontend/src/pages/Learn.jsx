import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api, { getStreamUrl, postProgress, getQAMessages, postQAMessage, getQuizForLesson, getQuizQuestions, submitQuiz, getQuizAttempts } from '../services/api'
import {
  PlayCircle, CheckCircle, Lock, ChevronLeft, ChevronRight,
  MessageSquare, StickyNote, BookOpen, Loader2, Send,
  ChevronDown, ChevronUp, Menu, X, HelpCircle, Award,
  RotateCcw, Trophy, XCircle as XCircleIcon, Clock,
} from 'lucide-react'

// ─── Helper ──────────────────────────────────────────────────────────────────

function flatLessons(modules = []) {
  return modules.flatMap((m) => m.lessons ?? [])
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Learn() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('qa') // 'qa' | 'notes'
  const [expandedModules, setExpandedModules] = useState(new Set())

  // ── Course + modules ──────────────────────────────────────────────────────
  const { data: course } = useQuery({
    queryKey: ['course-learn', courseId],
    queryFn: () => api.get(`/courses/${courseId}`).then((r) => r.data),
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['modules-learn', courseId],
    queryFn: () => api.get(`/courses/${courseId}/modules`).then((r) => r.data),
  })

  // Expand all modules once data loads
  useEffect(() => {
    if (modules.length > 0) {
      setExpandedModules(new Set(modules.map((_, i) => i)))
    }
  }, [modules])


  // ── Enrollment / progress ─────────────────────────────────────────────────
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment-learn', courseId],
    queryFn: () => api.get(`/enrollments/${courseId}`).then((r) => r.data).catch(() => null),
    enabled: !!courseId,
  })

  const lessons = flatLessons(modules)
  const currentLesson = lessons.find((l) => String(l.id) === String(lessonId)) ?? lessons[0]
  const currentIdx = lessons.findIndex((l) => l.id === currentLesson?.id)

  // Auto-navigate to first lesson if none selected
  useEffect(() => {
    if (lessons.length && !lessonId && currentLesson) {
      navigate(`/learn/${courseId}/${currentLesson.id}`, { replace: true })
    }
  }, [lessons, lessonId, courseId, currentLesson, navigate])

  // ── Stream URL ────────────────────────────────────────────────────────────
  const { data: streamData } = useQuery({
    queryKey: ['stream', currentLesson?.id],
    queryFn: () => getStreamUrl(currentLesson.id),
    enabled: !!currentLesson?.id,
    staleTime: 1000 * 60 * 10, // pre-signed URLs valid 10 min
  })

  const queryClient = useQueryClient()
  const handleVideoEnd = useCallback(async () => {
    if (!currentLesson) return
    try {
      await postProgress(courseId, currentLesson.id)
      queryClient.invalidateQueries(['enrollment-learn', courseId])
    } catch (_) { /* silently ignore — progress is best-effort */ }
  }, [courseId, currentLesson, queryClient])

  const prevLesson = lessons[currentIdx - 1]
  const nextLesson = lessons[currentIdx + 1]

  const toggleModule = (idx) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const completedIds = new Set(enrollment?.completed_lesson_ids ?? [])

  if (!course) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="learn-root">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="learn-topbar">
        <div className="learn-topbar-left">
          <button
            id="learn-sidebar-toggle"
            className="learn-icon-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to={`/courses/${course.slug}`} className="learn-back-link">
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{course.title}</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
        <div className="learn-topbar-center hidden md:block text-sm font-semibold text-white truncate">
          {currentLesson?.title ?? 'Select a lesson'}
        </div>
        <div className="learn-topbar-right">
          <button
            id="learn-prev-btn"
            className="learn-icon-btn"
            disabled={!prevLesson}
            onClick={() => prevLesson && navigate(`/learn/${courseId}/${prevLesson.id}`)}
            aria-label="Previous lesson"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-gray-400 hidden sm:block">
            {currentIdx + 1} / {lessons.length}
          </span>
          <button
            id="learn-next-btn"
            className="learn-icon-btn"
            disabled={!nextLesson}
            onClick={() => nextLesson && navigate(`/learn/${courseId}/${nextLesson.id}`)}
            aria-label="Next lesson"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="learn-body">
        {/* Sidebar */}
        <aside className={`learn-sidebar ${sidebarOpen ? 'learn-sidebar--open' : 'learn-sidebar--closed'}`}>
          <div className="learn-sidebar-header">
            <BookOpen size={16} className="text-primary" />
            <span className="text-sm font-bold text-white">Course Content</span>
            <span className="ml-auto text-xs text-gray-400">
              {completedIds.size}/{lessons.length}
            </span>
          </div>
          <div className="learn-sidebar-progress">
            <div
              className="learn-sidebar-progress-fill"
              style={{ width: `${enrollment?.progress_percent ?? 0}%` }}
            />
          </div>
          <nav className="learn-sidebar-nav">
            {modules.map((mod, idx) => (
              <div key={mod.id}>
                <button
                  className="learn-module-btn"
                  onClick={() => toggleModule(idx)}
                >
                  <span className="text-sm font-semibold text-white truncate flex-1 text-left">
                    {mod.title}
                  </span>
                  {expandedModules.has(idx) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedModules.has(idx) && mod.lessons?.map((lesson) => {
                  const done = completedIds.has(lesson.id)
                  const active = lesson.id === currentLesson?.id
                  const locked = !enrollment && !lesson.is_preview
                  return (
                    <button
                      key={lesson.id}
                      id={`lesson-btn-${lesson.id}`}
                      className={`learn-lesson-btn ${active ? 'learn-lesson-btn--active' : ''} ${locked ? 'learn-lesson-btn--locked' : ''}`}
                      onClick={() => !locked && navigate(`/learn/${courseId}/${lesson.id}`)}
                      disabled={locked}
                      title={locked ? 'Enroll to unlock' : lesson.title}
                    >
                      <span className="learn-lesson-icon">
                        {locked ? (
                          <Lock size={13} className="text-gray-500" />
                        ) : done ? (
                          <CheckCircle size={13} className="text-secondary" />
                        ) : (
                          <PlayCircle size={13} className={active ? 'text-primary' : 'text-gray-500'} />
                        )}
                      </span>
                      <span className="truncate text-xs text-left flex-1">{lesson.title}</span>
                      {lesson.duration_minutes > 0 && (
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {lesson.duration_minutes}m
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="learn-main">
          {/* Video Player */}
          <VideoPlayer
            lesson={currentLesson}
            streamUrl={streamData?.stream_url ?? streamData?.url}
            onEnded={handleVideoEnd}
          />

          {/* Lesson Title */}
          <div className="learn-lesson-header">
            <h1 className="learn-lesson-title">{currentLesson?.title}</h1>
            {currentLesson?.description && (
              <p className="learn-lesson-desc">{currentLesson.description}</p>
            )}
          </div>

          {/* Tabs */}
          <div className="learn-tabs">
            <button
              id="tab-qa"
              className={`learn-tab-btn ${activeTab === 'qa' ? 'learn-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('qa')}
            >
              <MessageSquare size={15} /> Q&amp;A
            </button>
            <button
              id="tab-quiz"
              className={`learn-tab-btn ${activeTab === 'quiz' ? 'learn-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <HelpCircle size={15} /> Quiz
            </button>
            <button
              id="tab-notes"
              className={`learn-tab-btn ${activeTab === 'notes' ? 'learn-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <StickyNote size={15} /> My Notes
            </button>
          </div>

          <div className="learn-tab-content">
            {activeTab === 'qa' && (
              <QAPanel courseId={courseId} accessToken={accessToken} />
            )}
            {activeTab === 'quiz' && (
              <QuizPanel lessonId={currentLesson?.id} />
            )}
            {activeTab === 'notes' && (
              <NotesPanel courseId={courseId} lessonId={currentLesson?.id} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ lesson, streamUrl, onEnded }) {
  const videoRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
  }, [streamUrl])

  if (!lesson) {
    return (
      <div className="video-placeholder">
        <PlayCircle size={64} className="text-primary opacity-40" />
        <p className="text-gray-400 mt-4">Select a lesson to start</p>
      </div>
    )
  }

  if (lesson.lesson_type !== 'video') {
    return (
      <div className="video-placeholder">
        <div className="text-center max-w-md">
          <BookOpen size={56} className="text-primary opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">{lesson.title}</h3>
          <p className="text-gray-400 text-sm">{lesson.description ?? 'Reading lesson — no video.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-wrapper">
      {loading && (
        <div className="video-loading">
          <Loader2 size={36} className="animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="video-placeholder">
          <p className="text-red-400 font-semibold">Could not load video.</p>
          <p className="text-gray-500 text-sm mt-1">The stream URL may have expired.</p>
        </div>
      )}
      {streamUrl && !error && (
        <video
          ref={videoRef}
          id="learn-video"
          key={streamUrl}
          src={streamUrl}
          controls
          controlsList="nodownload"
          className={`learn-video ${loading ? 'opacity-0' : 'opacity-100'}`}
          onCanPlay={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true) }}
          onEnded={onEnded}
        />
      )}
      {!streamUrl && !error && (
        <div className="video-placeholder">
          <Loader2 size={36} className="animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}

// ─── Q&A Panel ────────────────────────────────────────────────────────────────

function QAPanel({ courseId, accessToken }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load existing messages
  const { data: qaData, isLoading } = useQuery({
    queryKey: ['qa-messages', courseId],
    queryFn: () => getQAMessages(courseId),
  })

  useEffect(() => {
    if (qaData) setMessages(qaData)
  }, [qaData])


  // WebSocket real-time
  useEffect(() => {
    if (!courseId || !accessToken) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/api/v1/qa/ws/${courseId}?token=${accessToken}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        setMessages((prev) => {
          // Avoid duplicates (our own messages come back via WS too)
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } catch (_e) { /* ignore malformed WS messages */ }
    }

    return () => ws.close()
  }, [courseId, accessToken])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    try {
      const msg = await postQAMessage(courseId, body)
      setDraft('')
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      inputRef.current?.focus()
    } catch (_) {
      alert('Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }

  return (
    <div className="qa-panel">
      <div className="qa-messages">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <MessageSquare size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No questions yet. Be the first!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="qa-message">
            <div className="qa-avatar">
              {(msg.user?.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="qa-message-body">
              <div className="qa-message-meta">
                <span className="qa-author">{msg.user?.full_name ?? 'User'}</span>
                <span className="qa-time">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
                {msg.user?.role === 'mentor' && (
                  <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px' }}>
                    Mentor
                  </span>
                )}
              </div>
              <p className="qa-text">{msg.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="qa-composer">
        <textarea
          ref={inputRef}
          id="qa-input"
          className="qa-input"
          rows={2}
          placeholder="Ask a question… (Ctrl+Enter to send)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          id="qa-send-btn"
          className="btn btn-primary"
          disabled={sending || !draft.trim()}
          onClick={send}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  )
}

// ─── Quiz Panel ──────────────────────────────────────────────────────────────

function QuizPanel({ lessonId }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showAttempts, setShowAttempts] = useState(false)

  // Discover quiz for this lesson
  const { data: quiz, isLoading: quizLoading, error: quizError } = useQuery({
    queryKey: ['lesson-quiz', lessonId],
    queryFn: () => getQuizForLesson(lessonId),
    enabled: !!lessonId,
    retry: false,
  })

  // Fetch questions when quiz is found
  const { data: questions = [] } = useQuery({
    queryKey: ['quiz-questions', quiz?.id],
    queryFn: () => getQuizQuestions(quiz.id),
    enabled: !!quiz?.id,
  })

  // Fetch past attempts
  const { data: attempts = [], refetch: refetchAttempts } = useQuery({
    queryKey: ['quiz-attempts', quiz?.id],
    queryFn: () => getQuizAttempts(quiz.id),
    enabled: !!quiz?.id,
  })

  // Reset state when lesson changes
  useEffect(() => {
    setAnswers({})
    setResult(null)
    setShowAttempts(false)
  }, [lessonId])

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setSubmitting(true)
    try {
      const res = await submitQuiz(quiz.id, answers)
      setResult(res)
      refetchAttempts()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
  }

  // No quiz for this lesson
  if (!quizLoading && (quizError || !quiz)) {
    return (
      <div className="quiz-empty">
        <HelpCircle size={48} className="text-gray-600 mb-3" />
        <p className="text-gray-400 text-sm">No quiz available for this lesson.</p>
      </div>
    )
  }

  if (quizLoading) {
    return (
      <div className="quiz-empty">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  // Show result screen after submission
  if (result) {
    return (
      <div className="quiz-panel animate-fade-in">
        <div className={`quiz-result-card ${result.passed ? 'quiz-result-card--pass' : 'quiz-result-card--fail'}`}>
          <div className="quiz-result-icon">
            {result.passed
              ? <Trophy size={40} className="text-secondary" />
              : <XCircleIcon size={40} className="text-accent" />}
          </div>
          <h3 className="quiz-result-title">
            {result.passed ? 'Congratulations!' : 'Not quite there yet'}
          </h3>
          <div className="quiz-result-score">
            <span className="quiz-result-score-value">{result.score}%</span>
            <span className="quiz-result-score-label">
              {result.correct_count}/{result.total_questions} correct · Pass: {result.pass_score}%
            </span>
          </div>
        </div>

        {/* Per-question feedback */}
        <div className="quiz-feedback">
          <h4 className="text-sm font-bold text-white mb-3">Question Review</h4>
          {result.feedback.map((fb, i) => (
            <div key={fb.question_id} className={`quiz-feedback-item ${fb.correct ? 'quiz-feedback-item--correct' : 'quiz-feedback-item--wrong'}`}>
              <div className="quiz-feedback-header">
                <span className="quiz-feedback-num">Q{i + 1}</span>
                {fb.correct
                  ? <CheckCircle size={14} className="text-secondary" />
                  : <XCircleIcon size={14} className="text-accent" />}
              </div>
              <p className="text-sm text-gray-300 mb-1">{fb.question_text}</p>
              {!fb.correct && (
                <p className="text-xs text-accent">Your answer: {fb.your_answer || '(blank)'} · Correct: {fb.correct_answer}</p>
              )}
              {fb.explanation && (
                <p className="text-xs text-gray-500 mt-1 italic">{fb.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button className="btn btn-primary" onClick={handleRetry}>
            <RotateCcw size={15} /> Try Again
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAttempts((v) => !v)}>
            <Clock size={15} /> {showAttempts ? 'Hide' : 'Past'} Attempts ({attempts.length})
          </button>
        </div>

        {showAttempts && <AttemptsTable attempts={attempts} passScore={result.pass_score} />}
      </div>
    )
  }

  // Quiz-taking view
  const answeredCount = Object.keys(answers).length
  const totalQ = questions.length

  return (
    <div className="quiz-panel animate-fade-in">
      <div className="quiz-header">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award size={16} className="text-primary" /> {quiz.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Pass score: {quiz.pass_score}% · {totalQ} question{totalQ !== 1 ? 's' : ''}</p>
        </div>
        {attempts.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAttempts((v) => !v)}>
            <Clock size={13} /> Attempts ({attempts.length})
          </button>
        )}
      </div>

      {showAttempts && <AttemptsTable attempts={attempts} passScore={quiz.pass_score} />}

      <div className="quiz-questions">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            value={answers[q.id] ?? ''}
            onChange={(val) => handleAnswer(q.id, val)}
          />
        ))}
      </div>

      <div className="quiz-footer">
        <span className="text-xs text-gray-500">{answeredCount}/{totalQ} answered</span>
        <button
          id="quiz-submit-btn"
          className="btn btn-primary"
          disabled={submitting || answeredCount === 0}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Submit Quiz
        </button>
      </div>
    </div>
  )
}


function QuestionCard({ question, index, value, onChange }) {
  const options = (() => {
    if (!question.options) return []
    try { return JSON.parse(question.options) } catch { return [] }
  })()

  return (
    <div className="quiz-question">
      <div className="quiz-question-header">
        <span className="quiz-question-num">Q{index + 1}</span>
        <span className="quiz-question-type">{question.question_type.replace('_', ' ')}</span>
      </div>
      <p className="quiz-question-text">{question.question_text}</p>

      {question.question_type === 'multiple_choice' && (
        <div className="quiz-options">
          {options.map((opt, i) => (
            <label
              key={i}
              className={`quiz-option ${value === String(i) ? 'quiz-option--selected' : ''}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={String(i)}
                checked={value === String(i)}
                onChange={() => onChange(String(i))}
                className="sr-only"
              />
              <span className="quiz-option-radio">
                {value === String(i) && <span className="quiz-option-radio-dot" />}
              </span>
              <span className="quiz-option-text">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'true_false' && (
        <div className="quiz-options quiz-options--row">
          {['True', 'False'].map((tf) => (
            <label
              key={tf}
              className={`quiz-option quiz-option--tf ${value === tf.toLowerCase() ? 'quiz-option--selected' : ''}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={tf.toLowerCase()}
                checked={value === tf.toLowerCase()}
                onChange={() => onChange(tf.toLowerCase())}
                className="sr-only"
              />
              <span className="quiz-option-text">{tf}</span>
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'short_answer' && (
        <input
          type="text"
          className="form-input mt-2"
          placeholder="Type your answer…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}


function AttemptsTable({ attempts, passScore }) {
  if (!attempts.length) return <p className="text-xs text-gray-500 mt-3">No previous attempts.</p>
  return (
    <div className="quiz-attempts">
      <table className="quiz-attempts-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Score</th>
            <th>Result</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a, i) => (
            <tr key={a.id}>
              <td>{attempts.length - i}</td>
              <td className="font-bold">{a.score}%</td>
              <td>
                <span className={`badge ${a.passed ? 'badge-success' : 'badge-danger'}`}>
                  {a.passed ? 'Passed' : 'Failed'}
                </span>
              </td>
              <td className="text-gray-500">{new Date(a.submitted_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────

function NotesPanel({ courseId, lessonId }) {
  const key = `polaris-notes-${courseId}-${lessonId}`
  const [note, setNote] = useState(() => localStorage.getItem(key) ?? '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    localStorage.setItem(key, note)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    setNote(localStorage.getItem(key) ?? '')
    setSaved(false)
  }, [key])

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <StickyNote size={16} className="text-primary" />
        <span className="text-sm font-semibold text-white">Lesson Notes</span>
        <span className="text-xs text-gray-500 ml-2">Saved locally in your browser</span>
      </div>
      <textarea
        id="notes-textarea"
        className="notes-textarea"
        placeholder="Jot down your thoughts, key concepts, or questions…"
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false) }}
        rows={10}
      />
      <div className="notes-footer">
        <button
          id="notes-save-btn"
          className="btn btn-secondary btn-sm"
          onClick={save}
        >
          {saved ? <CheckCircle size={14} className="text-secondary" /> : <StickyNote size={14} />}
          {saved ? 'Saved!' : 'Save Note'}
        </button>
        <span className="text-xs text-gray-500">
          {note.length} characters
        </span>
      </div>
    </div>
  )
}
