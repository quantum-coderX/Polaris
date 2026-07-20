import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Plus, Trash2, Edit3, Upload,
  PlayCircle, FileText, ChevronDown, ChevronUp, CheckCircle, AlertCircle
} from 'lucide-react'
import api from '../../services/api'
import axios from 'axios'

export default function CourseEditor() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditMode = !!courseId

  const [activeTab, setActiveTab] = useState('info') // 'info' or 'curriculum'
  const [courseForm, setCourseForm] = useState({
    title: '',
    short_description: '',
    description: '',
    price: 0,
    currency: 'USD',
    level: 'beginner',
    language: 'English',
    tags: '',
    requirements: '',
    what_you_learn: '',
    is_free: false,
    thumbnail_url: '',
  })

  // Curriculum State
  const [expandedModules, setExpandedModules] = useState(new Set())
  const [moduleTitleForm, setModuleTitleForm] = useState('')
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    lesson_type: 'video',
    content_text: '',
    duration_minutes: 10,
    is_preview: false,
  })

  // File Upload State
  const [uploadProgress, setUploadProgress] = useState({}) // { lessonId: 0-100 }
  const [uploadError, setUploadError] = useState({}) // { lessonId: string }

  // Load course data if in edit mode
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ['course-edit', courseId],
    queryFn: () => api.get(`/courses/${courseId}`).then(r => r.data),
    enabled: isEditMode,
  })

  // Load modules & lessons
  const { data: modules, refetch: refetchModules } = useQuery({
    queryKey: ['course-modules-edit', courseId],
    queryFn: () => api.get(`/courses/${courseId}/modules`).then(r => r.data),
    enabled: isEditMode,
  })

  // Sync course data to form
  useEffect(() => {
    if (course) {
      setCourseForm({
        title: course.title || '',
        short_description: course.short_description || '',
        description: course.description || '',
        price: course.price || 0,
        currency: course.currency || 'USD',
        level: course.level || 'beginner',
        language: course.language || 'English',
        tags: course.tags || '',
        requirements: course.requirements || '',
        what_you_learn: course.what_you_learn || '',
        is_free: course.is_free || false,
        thumbnail_url: course.thumbnail_url || '',
      })
    }
  }, [course])

  // Mutation to Create/Update Course
  const saveCourseMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditMode) {
        return api.patch(`/courses/${courseId}`, data).then(r => r.data)
      } else {
        return api.post('/courses/', data).then(r => r.data)
      }
    },
    onSuccess: (savedCourse) => {
      queryClient.invalidateQueries(['mentor-courses'])
      if (!isEditMode) {
        // Redirect to edit mode for curriculum building
        navigate(`/mentor/courses/${savedCourse.id}/edit`)
        setActiveTab('curriculum')
      } else {
        queryClient.invalidateQueries(['course-edit', courseId])
        alert('Course details saved successfully!')
      }
    },
    onError: (err) => {
      alert(err?.response?.data?.detail || 'Failed to save course details')
    }
  })

  // Submit for Review
  const submitReviewMutation = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries(['course-edit', courseId])
      queryClient.invalidateQueries(['mentor-courses'])
      alert('Course submitted for admin review successfully!')
    },
    onError: (err) => {
      alert(err?.response?.data?.detail || 'Submission failed')
    }
  })

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setCourseForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCourseSubmit = (e) => {
    e.preventDefault()
    // Validation
    if (!courseForm.title.trim()) return alert('Course Title is required')
    if (!courseForm.short_description.trim()) return alert('Short Description is required')
    
    saveCourseMutation.mutate(courseForm)
  }

  // --- Module Actions ---
  const addModuleMutation = useMutation({
    mutationFn: (title) => api.post(`/courses/${courseId}/modules`, {
      title,
      order: modules?.length || 0
    }),
    onSuccess: () => {
      setModuleTitleForm('')
      refetchModules()
    },
    onError: (err) => alert(err?.response?.data?.detail || 'Failed to create module')
  })

  const handleAddModule = (e) => {
    e.preventDefault()
    if (!moduleTitleForm.trim()) return
    addModuleMutation.mutate(moduleTitleForm)
  }

  // --- Lesson Actions ---
  const saveLessonMutation = useMutation({
    mutationFn: async ({ moduleId, lessonId, data }) => {
      if (lessonId) {
        return api.patch(`/lessons/${lessonId}`, data)
      } else {
        return api.post('/lessons/', { module_id: moduleId, ...data })
      }
    },
    onSuccess: () => {
      setEditingLessonId(null)
      setLessonForm({
        title: '',
        description: '',
        lesson_type: 'video',
        content_text: '',
        duration_minutes: 10,
        is_preview: false,
      })
      refetchModules()
    },
    onError: (err) => alert(err?.response?.data?.detail || 'Failed to save lesson')
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => api.delete(`/lessons/${lessonId}`),
    onSuccess: () => refetchModules(),
    onError: (err) => alert(err?.response?.data?.detail || 'Failed to delete lesson')
  })

  const handleEditLesson = (lesson) => {
    setEditingLessonId(lesson.id)
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      lesson_type: lesson.lesson_type,
      content_text: lesson.content_text || '',
      duration_minutes: lesson.duration_minutes,
      is_preview: lesson.is_preview,
    })
  }

  const handleLessonSubmit = (e, moduleId, lessonId = null) => {
    e.preventDefault()
    if (!lessonForm.title.trim()) return alert('Lesson title is required')
    saveLessonMutation.mutate({ moduleId, lessonId, data: lessonForm })
  }

  // --- File Upload ---
  const handleFileUpload = async (e, lessonId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadProgress(prev => ({ ...prev, [lessonId]: 0 }))
    setUploadError(prev => ({ ...prev, [lessonId]: null }))

    try {
      // 1. Get S3 pre-signed upload URL
      const { data } = await api.post(`/lessons/${lessonId}/upload-url`, null, {
        params: { content_type: file.type }
      })

      // 2. Upload raw binary file to S3
      await axios.put(data.upload_url, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(prev => ({ ...prev, [lessonId]: percent }))
          }
        }
      })

      // 3. Finalize upload metadata on backend
      await api.patch(`/lessons/${lessonId}/content?s3_key=${encodeURIComponent(data.s3_key)}`)

      setUploadProgress(prev => ({ ...prev, [lessonId]: 100 }))
      refetchModules()
    } catch (err) {
      console.error(err)
      setUploadProgress(prev => ({ ...prev, [lessonId]: undefined }))
      setUploadError(prev => ({
        ...prev,
        [lessonId]: err?.response?.data?.detail || 'Upload failed. Check your internet connection.'
      }))
    }
  }

  const toggleModule = (id) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isEditMode && isLoadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link to="/mentor" className="p-2 bg-surface2 border border-border rounded-xl text-gray-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">
              {isEditMode ? `Edit Course: ${course?.title}` : 'Create New Course'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isEditMode ? 'Design your curriculum and upload video/attachments' : 'Fill course details to get started'}
            </p>
          </div>
        </div>

        {isEditMode && (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              course?.status === 'published' ? 'bg-green-500/10 text-secondary border border-green-500/20' :
              course?.status === 'pending' ? 'bg-amber-500/10 text-gold border border-amber-500/20' :
              'bg-blue-500/10 text-primary border border-blue-500/20'
            }`}>
              {course?.status}
            </span>
            {course?.status !== 'published' && course?.status !== 'pending' && (
              <button
                onClick={() => submitReviewMutation.mutate()}
                className="btn btn-primary"
                disabled={submitReviewMutation.isPending}
              >
                Submit for Review
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {isEditMode && (
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Course Details
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
              activeTab === 'curriculum'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Curriculum Builder
          </button>
        </div>
      )}

      {/* Course Info Tab */}
      {(!isEditMode || activeTab === 'info') && (
        <form onSubmit={handleCourseSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-primary">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="form-label">Course Title *</label>
                <input
                  type="text"
                  name="title"
                  value={courseForm.title}
                  onChange={handleFormChange}
                  className="form-input"
                  placeholder="e.g. Complete Web Development Bootcamp"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Thumbnail URL</label>
                <input
                  type="url"
                  name="thumbnail_url"
                  value={courseForm.thumbnail_url}
                  onChange={handleFormChange}
                  className="form-input"
                  placeholder="https://example.com/thumbnail.png"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="form-label">Short Subtitle / Description *</label>
                <input
                  type="text"
                  name="short_description"
                  value={courseForm.short_description}
                  onChange={handleFormChange}
                  className="form-input"
                  placeholder="e.g. Master HTML, CSS, JavaScript, React, and Node.js with real projects."
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="form-label">Detailed Course Description</label>
                <textarea
                  name="description"
                  value={courseForm.description}
                  onChange={handleFormChange}
                  rows={5}
                  className="form-input py-2"
                  placeholder="Write a comprehensive guide on what this course is about, targets, and goals..."
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-primary">Pricing & Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-2 h-full pt-8">
                <input
                  type="checkbox"
                  id="is_free"
                  name="is_free"
                  checked={courseForm.is_free}
                  onChange={handleFormChange}
                  className="w-5 h-5 rounded border-border bg-surface2 text-primary focus:ring-primary/20"
                />
                <label htmlFor="is_free" className="font-semibold text-sm cursor-pointer select-none">
                  This is a Free Course
                </label>
              </div>

              {!courseForm.is_free && (
                <>
                  <div className="space-y-1">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      name="price"
                      min={0}
                      step={0.01}
                      value={courseForm.price}
                      onChange={handleFormChange}
                      className="form-input"
                      placeholder="e.g. 49.99"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="form-label">Currency</label>
                    <select
                      name="currency"
                      value={courseForm.currency}
                      onChange={handleFormChange}
                      className="form-select"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-1">
                <label className="form-label">Difficulty Level</label>
                <select
                  name="level"
                  value={courseForm.level}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="form-label">Language</label>
                <input
                  type="text"
                  name="language"
                  value={courseForm.language}
                  onChange={handleFormChange}
                  className="form-input"
                  placeholder="e.g. English, Hindi, Spanish"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={courseForm.tags}
                  onChange={handleFormChange}
                  className="form-input"
                  placeholder="e.g. react, webdev, javascript"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-primary">Prerequisites & Learning Goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="form-label">Requirements (one per line)</label>
                <textarea
                  name="requirements"
                  value={courseForm.requirements}
                  onChange={handleFormChange}
                  rows={4}
                  className="form-input py-2"
                  placeholder="Basic computer skills&#10;No programming experience required"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">What You Will Learn (one per line)</label>
                <textarea
                  name="what_you_learn"
                  value={courseForm.what_you_learn}
                  onChange={handleFormChange}
                  rows={4}
                  className="form-input py-2"
                  placeholder="Build 5 full projects&#10;Learn advanced JavaScript concepts"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveCourseMutation.isPending}
            >
              <Save size={18} /> {isEditMode ? 'Save Course Details' : 'Create Course & Continue'}
            </button>
          </div>
        </form>
      )}

      {/* Curriculum Builder Tab */}
      {isEditMode && activeTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Module Creator form */}
          <form onSubmit={handleAddModule} className="card flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="form-label font-heading">Create New Module</label>
              <input
                type="text"
                value={moduleTitleForm}
                onChange={(e) => setModuleTitleForm(e.target.value)}
                className="form-input"
                placeholder="e.g. Module 1: Getting Started with React"
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary w-full md:w-auto h-[46px]"
              disabled={addModuleMutation.isPending}
            >
              <Plus size={18} /> Add Module
            </button>
          </form>

          {/* Module List Accordion */}
          <div className="space-y-4">
            {modules?.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <AlertCircle className="mx-auto mb-2 text-primary" size={32} />
                No modules created yet. Start by adding a module above.
              </div>
            ) : (
              modules?.map((mod, modIdx) => (
                <div key={mod.id} className="border border-border rounded-2xl overflow-hidden bg-surface">
                  {/* Module Header */}
                  <div className="flex items-center justify-between p-4 bg-surface2 border-b border-border">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="flex items-center gap-3 bg-transparent border-0 text-left text-white font-semibold cursor-pointer flex-1"
                    >
                      {expandedModules.has(mod.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>{mod.title}</span>
                    </button>
                    <span className="text-xs text-gray-500 mr-4 font-mono">Module {modIdx + 1}</span>
                  </div>

                  {/* Module Body (Lessons) */}
                  {expandedModules.has(mod.id) && (
                    <div className="p-4 space-y-4 bg-bg/50">
                      {/* List lessons */}
                      <div className="space-y-2">
                        {mod.lessons?.map((lesson, _lessonIdx) => (
                          <div key={lesson.id} className="flex flex-col p-4 bg-surface rounded-xl border border-border gap-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {lesson.lesson_type === 'video' ? (
                                  <PlayCircle size={18} className="text-primary" />
                                ) : (
                                  <FileText size={18} className="text-gray-400" />
                                )}
                                <div>
                                  <div className="font-semibold text-sm flex items-center gap-2">
                                    {lesson.title}
                                    {lesson.is_preview && (
                                      <span className="bg-green-500/10 text-secondary text-[10px] px-2 py-0.5 rounded font-bold font-heading">
                                        PREVIEW
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    Type: {lesson.lesson_type} · Duration: {lesson.duration_minutes} min
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditLesson(lesson)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '6px 10px' }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '6px 10px' }}
                                  disabled={deleteLessonMutation.isPending}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Media File Upload Container */}
                            <div className="border-t border-border/50 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                {lesson.is_published ? (
                                  <span className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                                    <CheckCircle size={14} /> Content Uploaded
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                                    <AlertCircle size={14} /> Missing Content
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4 flex-1 justify-end max-w-md">
                                {uploadProgress[lesson.id] !== undefined && (
                                  <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>Uploading file...</span>
                                      <span className="font-semibold font-mono">{uploadProgress[lesson.id]}%</span>
                                    </div>
                                    <div className="progress-bar">
                                      <div
                                        className="progress-fill"
                                        style={{ width: `${uploadProgress[lesson.id]}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {uploadError[lesson.id] && (
                                  <div className="text-xs text-accent font-semibold flex items-center gap-1">
                                    <AlertCircle size={12} /> {uploadError[lesson.id]}
                                  </div>
                                )}

                                <label className="btn btn-secondary btn-sm cursor-pointer select-none">
                                  <Upload size={14} /> {lesson.is_published ? 'Replace File' : 'Upload File'}
                                  <input
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, lesson.id)}
                                    className="hidden"
                                    accept={lesson.lesson_type === 'video' ? 'video/mp4,video/webm' : 'application/pdf,application/msword'}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add/Edit Lesson Panel */}
                      <div className="border border-dashed border-border/80 rounded-xl p-4 bg-surface/30">
                        <h4 className="text-sm font-semibold text-primary mb-3">
                          {editingLessonId ? 'Edit Lesson Details' : 'Add Lesson to Module'}
                        </h4>
                        <form
                          onSubmit={(e) => handleLessonSubmit(e, mod.id, editingLessonId)}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="form-label">Lesson Title *</label>
                              <input
                                type="text"
                                value={lessonForm.title}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                className="form-input"
                                placeholder="e.g. Introduction to JSX"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="form-label">Type</label>
                              <select
                                value={lessonForm.lesson_type}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, lesson_type: e.target.value }))}
                                className="form-select"
                              >
                                <option value="video">Video Lecture</option>
                                <option value="document">Document / PDF</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="form-label">Duration (minutes)</label>
                              <input
                                type="number"
                                min={0}
                                value={lessonForm.duration_minutes}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                                className="form-input"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                              <input
                                type="checkbox"
                                id={`is_preview_${mod.id}`}
                                checked={lessonForm.is_preview}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, is_preview: e.target.checked }))}
                                className="w-4 h-4 rounded border-border bg-surface2 text-primary"
                              />
                              <label htmlFor={`is_preview_${mod.id}`} className="font-semibold text-xs select-none cursor-pointer">
                                Allow free preview (before enrollment)
                              </label>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="form-label">Lesson Description</label>
                              <input
                                type="text"
                                value={lessonForm.description}
                                onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                                className="form-input"
                                placeholder="Brief summary of what is covered in this lesson."
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            {editingLessonId && (
                              <button
                                type="button"
                                onClick={() => setEditingLessonId(null)}
                                className="btn btn-ghost btn-sm"
                              >
                                Cancel Edit
                              </button>
                            )}
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm font-heading"
                              disabled={saveLessonMutation.isPending}
                            >
                              {editingLessonId ? 'Save Lesson' : 'Add Lesson'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
