import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { verifyCertificate } from '../services/api'
import { CheckCircle, XCircle, Award, Calendar, BookOpen, User, Loader2, ArrowLeft } from 'lucide-react'

export default function CertificatePage() {
  const { certId } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['verify-cert', certId],
    queryFn: () => verifyCertificate(certId),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="cert-page">
        <div className="cert-loading">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="text-gray-400 mt-4">Verifying certificate&hellip;</p>
        </div>
      </div>
    )
  }

  if (error || !data?.valid) {
    return (
      <div className="cert-page">
        <div className="cert-card cert-card--invalid">
          <div className="cert-status-icon cert-status-icon--invalid">
            <XCircle size={48} />
          </div>
          <h1 className="cert-title">Certificate Not Found</h1>
          <p className="cert-subtitle">
            This certificate ID is invalid or does not exist in our system.
          </p>
          <Link to="/" className="btn btn-secondary mt-6">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cert-page">
      <div className="cert-card cert-card--valid animate-fade-in">
        {/* Verified banner */}
        <div className="cert-verified-banner">
          <CheckCircle size={20} />
          <span>Verified Certificate</span>
        </div>

        {/* Logo */}
        <div className="cert-logo">Polaris</div>
        <div className="cert-heading">Certificate of Completion</div>

        {/* Divider */}
        <div className="cert-divider" />

        {/* Student name */}
        <p className="cert-label">This certifies that</p>
        <h1 className="cert-student-name">{data.student_name}</h1>

        <p className="cert-label">has successfully completed the course</p>
        <h2 className="cert-course-title">{data.course_title}</h2>

        {/* Meta */}
        <div className="cert-meta">
          <div className="cert-meta-item">
            <Calendar size={14} />
            <span>Completed: {data.completed_at ? new Date(data.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
          </div>
          <div className="cert-meta-item">
            <Award size={14} />
            <span>ID: {certId?.slice(0, 12).toUpperCase()}</span>
          </div>
        </div>

        <div className="cert-divider" />

        <p className="text-xs text-gray-500 text-center">
          This certificate was issued by the Polaris Online Learning Platform and can be
          verified at this URL.
        </p>

        <Link to="/" className="btn btn-primary mt-6">
          <BookOpen size={16} /> Explore Polaris
        </Link>
      </div>
    </div>
  )
}
