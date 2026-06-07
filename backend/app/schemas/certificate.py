"""
Certificate schemas — responses for /certificates endpoints.
"""
from pydantic import BaseModel
from datetime import datetime


class CertificateResponse(BaseModel):
    certificate_url: str
    certificate_id: str
    download_url: str


class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate_id: str
    student_name: str
    course_title: str
    completed_at: datetime
