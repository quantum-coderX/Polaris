# 🎓 Polaris — Online Learning Platform

> A production-grade, cloud-native e-learning platform built with **FastAPI** + **React 18** + **PostgreSQL**,
> featuring real-time Q&A, video/PDF streaming, Stripe payments, certificates, gamification, and a full admin panel.
>
> **Author:** Adithyan Raj &nbsp;|&nbsp; **Version:** 1.0.0 &nbsp;|&nbsp; **Date:** June 2026

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Feature Matrix](#feature-matrix)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Authentication & Security](#authentication--security)
7. [Real-time Architecture](#real-time-architecture)
8. [Payment Flow](#payment-flow)
9. [Email Notifications](#email-notifications)
10. [Search System](#search-system)
11. [Gamification System](#gamification-system)
12. [Frontend Pages](#frontend-pages)
13. [Environment Variables](#environment-variables)
14. [Quick Start](#quick-start)
15. [Docker Compose](#docker-compose)
16. [Alembic Migrations](#alembic-migrations)
17. [Deployment](#deployment)
18. [Testing](#testing)

---

## 🚀 Tech Stack

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | FastAPI | ≥ 0.111 | Async HTTP + WebSocket server |
| Runtime | Python | 3.12 | Type-safe async/await |
| ORM | SQLAlchemy (async) | ≥ 2.0.30 | Database access |
| DB Driver | asyncpg | ≥ 0.30 | PostgreSQL async driver |
| Migrations | Alembic | ≥ 1.13 | Schema versioning |
| Auth | PyJWT + passlib/bcrypt | ≥ 2.8 | Token signing + password hashing |
| 2FA | pyotp + qrcode | ≥ 2.9 | TOTP authenticator |
| Payments | Stripe | ≥ 9.5 | Checkout + webhooks |
| Storage | AWS S3 + boto3 | ≥ 1.34 | Media & certificate hosting |
| PDFs | ReportLab | ≥ 4.1 | Certificate generation |
| Email | aiosmtplib | ≥ 3.0 | Async SMTP delivery |
| Rate Limiting | slowapi | ≥ 0.1.9 | Per-endpoint limits |
| Validation | Pydantic v2 | ≥ 2.7 | Request/response schemas |

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 18 | UI rendering |
| Bundler | Vite | latest | HMR dev server + prod build |
| Styling | TailwindCSS + Vanilla CSS | 3.x | Design system |
| State | Zustand | latest | Auth + theme store |
| Server State | TanStack Query (React Query) | v5 | Data fetching + caching |
| HTTP | Axios | latest | API client + silent token refresh |
| Routing | React Router DOM | v6 | SPA navigation |
| Icons | Lucide React | latest | Icon system |
| Notifications | react-hot-toast | latest | Toast UI |

### Infrastructure

| Service | Technology | Role |
|---|---|---|
| Database | PostgreSQL 16 Alpine | Primary data store |
| Cache / Broker | Redis 7 Alpine | Rate-limiter backend, future pub/sub |
| Container | Docker + Docker Compose | Local dev environment |
| Cloud Deploy | Railway / Render / AWS EC2 | Production hosting |
| Object Storage | AWS S3 (ap-south-1) | Videos, PDFs, certificates |

---

## ✅ Feature Matrix

### Core Learning

| Feature | Status | Notes |
|---|---|---|
| JWT Auth (access + refresh tokens) | ✅ | 15-min access, 7-day HttpOnly refresh cookie |
| 2FA / TOTP (enable, verify, disable, QR code) | ✅ | Google Authenticator / Authy compatible |
| Role-based access (Student / Mentor / Admin) | ✅ | FastAPI `Depends` guards |
| User registration + login | ✅ | Rate-limited: 3/min register, 5/min login |
| Profile management (avatar, bio, username) | ✅ | `PATCH /users/me` |
| Course CRUD (modules, lessons, attachments) | ✅ | Draft → Pending → Published workflow |
| Video / PDF / document lesson types | ✅ | S3 pre-signed URLs + streaming |
| Enrollment (free + paid) | ✅ | Status: active, completed, suspended, refunded |
| Lesson progress tracking | ✅ | Per-lesson completion + overall `progress_percent` |
| Quiz engine (multiple choice + short answer) | ✅ | Graded attempts, pass threshold |
| Certificate generation | ✅ | PDF via ReportLab → S3, public verify URL |

### Payments

| Feature | Status | Notes |
|---|---|---|
| Stripe Checkout (hosted page) | ✅ | Sandbox mode |
| Stripe Webhook verification | ✅ | Cryptographic signature, atomic enrollment |
| Admin-issued refunds | ✅ | `POST /payments/refund` with reason |
| Dispute → enrollment suspension | ✅ | `charge.dispute.created` webhook |
| Admin payments dashboard | ✅ | List all transactions, issue refunds from UI |

### Communication

| Feature | Status | Notes |
|---|---|---|
| Real-time Q&A (WebSocket) | ✅ | Per-course rooms, threaded replies, pinning |
| Q&A persistence | ✅ | All messages saved to PostgreSQL |
| Real-time in-app notifications | ✅ | Per-user WebSocket push |
| Notification DB persistence | ✅ | Read/unread state |
| **Email — enrollment confirmation** | ✅ | Triggered on free + paid enrollment |
| **Email — Q&A reply** | ✅ | Sent to original question author |
| **Email — refund confirmation** | ✅ | Sent to student on admin refund |
| Email — new lesson published | ✅ | Template ready, trigger in lessons endpoint |

### Search & Discovery

| Feature | Status | Notes |
|---|---|---|
| Full-text search (ILIKE on title, description, tags) | ✅ | GIN-index ready on PostgreSQL |
| Autocomplete (prefix match) | ✅ | Returns up to 8 title suggestions |
| Filters: level, language, price range | ✅ | |
| Filters: duration, is_free | ✅ | |
| **Filter: min_rating** | ✅ | Subquery join on reviews table |
| **Sort: price_asc, price_desc, newest** | ✅ | |

### Admin Panel

| Feature | Status | Notes |
|---|---|---|
| Platform stats (users, courses, revenue) | ✅ | |
| Approve / reject pending courses | ✅ | |
| Approve pending mentor accounts | ✅ | |
| Content moderation (reviews) | ✅ | |
| **Reported reviews management** | ✅ | Keep or remove flagged reviews |
| **Admin payments list** | ✅ | Status filter + revenue totals |
| **Refund UI with reason modal** | ✅ | |
| **CSV export: users / enrollments / revenue** | ✅ | Streamed download |
| User management (list, deactivate) | ✅ | |

### Gamification

| Feature | Status | Notes |
|---|---|---|
| Daily learning streaks | ✅ | Streak freeze mechanic |
| Points ledger (append-only) | ✅ | Earned on: lesson complete, quiz pass, etc. |
| Leaderboard | ✅ | Global + per-course, weekly/monthly/all-time |

### Analytics

| Feature | Status | Notes |
|---|---|---|
| Admin aggregate stats | ✅ | |
| **Mentor per-course analytics** | ✅ | Enrollments, completion rate, revenue, avg rating |
| **Mentor aggregate analytics** | ✅ | Across all published courses |

---

## 📁 Project Structure

```
final-project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py           # Register, login, 2FA, refresh, logout
│   │   │       ├── courses.py        # CRUD, approve/reject, per-course analytics
│   │   │       ├── lessons.py        # S3 presigned upload + stream URLs
│   │   │       ├── enrollments.py    # Enroll, progress, my-enrollments
│   │   │       ├── payments.py       # Stripe checkout, webhook, refund
│   │   │       ├── reviews.py        # CRUD, 1-per-student, report abuse
│   │   │       ├── qa.py             # REST + WebSocket per-course rooms
│   │   │       ├── search.py         # ILIKE FTS + min_rating filter + sort
│   │   │       ├── notifications.py  # WebSocket push + DB persistence
│   │   │       ├── admin.py          # Stats, moderation, CSV export, payments
│   │   │       ├── users.py          # Profile CRUD, admin user management
│   │   │       ├── certificates.py   # PDF generation → S3, public verify
│   │   │       ├── gamification.py   # Streaks, points, leaderboard
│   │   │       └── quiz.py           # Quiz engine, attempts, grading
│   │   ├── core/
│   │   │   ├── config.py             # pydantic-settings (.env loading)
│   │   │   ├── database.py           # Async SQLAlchemy engine + session factory
│   │   │   ├── security.py           # JWT sign/verify, bcrypt hashing
│   │   │   ├── deps.py               # Auth dependency guards (require_admin, etc.)
│   │   │   ├── email.py              # Async SMTP helper + HTML email templates
│   │   │   └── gamification_service.py  # award_points, record_activity helpers
│   │   ├── models/
│   │   │   ├── user.py               # User, UserRole
│   │   │   ├── course.py             # Course, Module
│   │   │   ├── lesson.py             # Lesson, LessonAttachment
│   │   │   ├── enrollment.py         # Enrollment, LessonProgress
│   │   │   ├── payment.py            # Payment, PaymentProvider, PaymentStatus
│   │   │   ├── review.py             # Review
│   │   │   ├── qa.py                 # QAMessage
│   │   │   ├── quiz.py               # Quiz, QuizQuestion, QuizAttempt
│   │   │   ├── notification.py       # Notification
│   │   │   ├── gamification.py       # Streak, PointsLedger, LeaderboardEntry
│   │   │   └── __init__.py           # Import-all for Alembic discovery
│   │   ├── schemas/                  # Pydantic v2 request/response models
│   │   ├── websockets/
│   │   │   ├── qa_manager.py         # QAConnectionManager (in-memory rooms)
│   │   │   └── notification_manager.py  # Per-user WebSocket registry
│   │   └── main.py                   # FastAPI app, routers, CORS, rate limiter
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 0001_initial.py       # Full initial schema migration
│   │   └── env.py                    # Async Alembic environment
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx              # Hero, discipline cards, features section
│       │   ├── Login.jsx             # Login + 2FA code entry
│       │   ├── Register.jsx          # Role selection
│       │   ├── CourseList.jsx        # Browse + filter courses
│       │   ├── CourseDetail.jsx      # Course detail + enroll CTA
│       │   ├── Learn.jsx             # Video/PDF player + progress + Q&A + Quiz
│       │   ├── Checkout.jsx          # Stripe Elements checkout
│       │   ├── Profile.jsx           # Avatar, bio, 2FA setup, account info
│       │   ├── CertificatePage.jsx   # Certificate download + public verify
│       │   └── dashboard/
│       │       ├── StudentDashboard.jsx   # Enrollments, progress, certs, gamification
│       │       ├── MentorDashboard.jsx    # Per-course analytics rows (expandable)
│       │       ├── AdminDashboard.jsx     # 6-tab: Overview/Courses/Mentors/Reviews/Payments/Reports
│       │       └── AdminUsers.jsx         # Full user list management
│       │
│       ├── components/
│       │   └── layout/
│       │       └── DashboardLayout.jsx    # Sidebar + theme toggle + mobile drawer
│       ├── store/
│       │   ├── authStore.js          # Zustand: user, accessToken, login, logout, setUser
│       │   └── themeStore.js         # Zustand: dark/light theme
│       └── services/
│           └── api.js                # Axios instance + silent refresh interceptor + helpers
│
├── docker-compose.yml                # PostgreSQL + Redis + Backend + Frontend
├── .env.example                      # All required env vars documented
└── README.md                         # This file
```

---

## 🗄️ Database Schema

### 15 Tables

```
users
├── id, email (unique), username (unique), full_name
├── hashed_password, role (student|mentor|admin)
├── avatar_url, bio
├── is_active, is_verified, is_approved, is_2fa_enabled
├── totp_secret
└── created_at, updated_at

courses
├── id, title, slug (unique), description, short_description
├── thumbnail_url, promo_video_url
├── price, currency, is_free
├── level (beginner|intermediate|advanced)
├── language, tags, requirements, what_you_learn
├── total_duration_minutes, total_lessons
├── status (draft|pending|published|rejected|archived)
├── mentor_id → users.id
└── created_at, updated_at

modules          → course_id
lessons          → module_id (video|pdf|document|text)
lesson_attachments → lesson_id

enrollments
├── student_id → users.id
├── course_id  → courses.id
├── status (active|completed|suspended|refunded)
├── progress_percent, certificate_url
└── enrolled_at, completed_at

lesson_progress
├── enrollment_id → enrollments.id
├── lesson_id     → lessons.id
├── is_completed, watch_time_seconds
└── completed_at

payments
├── student_id, course_id, enrollment_id
├── provider (stripe|paypal|free)
├── provider_session_id, provider_payment_id
├── amount, currency
├── status (pending|completed|refunded|failed|disputed)
└── refund_reason, refunded_at, created_at

reviews
├── student_id, course_id
├── rating (1–5), body
├── is_approved, is_reported, report_reason
└── created_at

qa_messages
├── course_id, author_id
├── parent_id (self-reference for threaded replies)
├── body, is_pinned, is_deleted, upvotes
└── created_at

quizzes           → lesson_id
quiz_questions    → quiz_id
quiz_attempts     → quiz_id, student_id

notifications
├── user_id, type, title, message, action_url
└── is_read, created_at

streaks          → user_id (current, longest, freeze)
points_ledger    → user_id (append-only transaction log)
leaderboard_entries → user_id (scope, period, rank)
```

---

## 📡 API Reference

Base URL: `http://localhost:8000/api/v1`  
Interactive docs: `http://localhost:8000/docs`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account (student/mentor/admin) |
| `POST` | `/auth/login` | — | Returns access_token + sets refresh cookie |
| `POST` | `/auth/refresh` | Cookie | Silent token refresh |
| `POST` | `/auth/logout` | Bearer | Clears refresh cookie |
| `GET`  | `/auth/me` | Bearer | Current user profile |
| `POST` | `/auth/2fa/enable` | Bearer | Generate TOTP secret + QR code |
| `POST` | `/auth/2fa/verify` | Bearer | Confirm code to activate 2FA |
| `POST` | `/auth/2fa/disable` | Bearer | Disable 2FA with current code |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `PATCH` | `/users/me` | Bearer | Update profile (name, username, bio, avatar) |
| `GET`   | `/users/{id}` | — | Public profile |
| `GET`   | `/users/` | Admin | List all users |
| `POST`  | `/users/{id}/approve` | Admin | Approve a mentor account |
| `DELETE`| `/users/{id}` | Admin | Deactivate a user |

### Courses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`   | `/courses/` | — | List published courses (with filters) |
| `POST`  | `/courses/` | Mentor | Create new course |
| `GET`   | `/courses/mine` | Mentor | My courses |
| `GET`   | `/courses/{id}` | — | Course detail by ID or slug |
| `PATCH` | `/courses/{id}` | Mentor | Update course |
| `DELETE`| `/courses/{id}` | Mentor | Archive course |
| `POST`  | `/courses/{id}/submit` | Mentor | Submit for admin review |
| `POST`  | `/courses/{id}/approve` | Admin | Publish course |
| `POST`  | `/courses/{id}/reject` | Admin | Reject course |
| `GET`   | `/courses/{id}/analytics` | Mentor | Per-course analytics |
| `POST`  | `/courses/{id}/modules` | Mentor | Add module |
| `GET`   | `/courses/{id}/modules` | — | List modules with lessons |

### Lessons

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/lessons/` | Mentor | Create lesson |
| `PATCH` | `/lessons/{id}` | Mentor | Update lesson |
| `POST` | `/lessons/{id}/upload-url` | Mentor | S3 pre-signed PUT URL |
| `GET`  | `/lessons/{id}/stream` | Student | S3 pre-signed GET URL |
| `POST` | `/lessons/{id}/attachments` | Mentor | Upload attachment |

### Enrollments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/enrollments/{course_id}` | Student | Enroll in free course |
| `GET`  | `/enrollments/my` | Student | My active enrollments |
| `GET`  | `/enrollments/{course_id}` | Student | Single enrollment |
| `POST` | `/enrollments/{course_id}/progress` | Student | Update lesson progress |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/checkout` | Student | Create Stripe checkout session |
| `POST` | `/payments/webhook/stripe` | — | Stripe webhook receiver |
| `POST` | `/payments/refund` | Admin | Issue refund |

### Search

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search/courses` | — | Full-text search with filters |
| `GET` | `/search/autocomplete` | — | Prefix autocomplete |

**Search parameters:** `q`, `level`, `language`, `min_price`, `max_price`, `min_duration`, `max_duration`, `is_free`, `min_rating`, `sort_by`, `skip`, `limit`

### Q&A

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/qa/{course_id}/messages` | Student | List Q&A messages |
| `POST` | `/qa/{course_id}/messages` | Student | Post message or reply |
| `POST` | `/qa/{course_id}/messages/{id}/pin` | Mentor | Pin a message |
| `DELETE`| `/qa/{course_id}/messages/{id}` | Student | Soft-delete own message |
| `WS`   | `/qa/ws/{course_id}?token=…` | Bearer WS | Real-time Q&A stream |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/reviews/{course_id}` | Student | Submit review (1 per student) |
| `GET`  | `/reviews/{course_id}` | — | List approved reviews |
| `POST` | `/reviews/{id}/report` | Student | Report a review |
| `PATCH`| `/reviews/{id}/moderate` | Admin | Approve or remove reported review |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`  | `/notifications/` | Bearer | List notifications |
| `POST` | `/notifications/{id}/read` | Bearer | Mark as read |
| `POST` | `/notifications/read-all` | Bearer | Mark all as read |
| `WS`   | `/notifications/ws?token=…` | Bearer WS | Real-time push stream |

### Certificates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/certificates/{course_id}` | Student | Generate/retrieve certificate |
| `GET`  | `/certificates/verify/{cert_id}` | — | Public certificate verification |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | Admin | Platform-wide stats |
| `GET` | `/admin/courses/pending` | Admin | Courses awaiting review |
| `GET` | `/admin/reviews/reported` | Admin | Reported reviews |
| `GET` | `/admin/users/pending-mentors` | Admin | Mentors awaiting approval |
| `GET` | `/admin/users` | Admin | All users (search + role filter) |
| `GET` | `/admin/payments` | Admin | All payments (status filter) |
| `GET` | `/admin/reports/export?type=users\|enrollments\|revenue` | Admin | CSV download |
| `GET` | `/admin/mentors/{id}/analytics` | Admin | Mentor aggregate analytics |

### Gamification

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/gamification/streak` | Bearer | My streak info |
| `GET` | `/gamification/points` | Bearer | Points balance + history |
| `GET` | `/gamification/leaderboard` | Bearer | Global leaderboard |
| `POST`| `/gamification/streak/freeze` | Bearer | Use streak freeze |

---

## 🔐 Authentication & Security

### JWT Flow

```
1. POST /auth/login  →  access_token (Bearer, 15 min) + refresh_token (HttpOnly cookie, 7 days)
2. Axios interceptor silently calls POST /auth/refresh before every 401
3. POST /auth/logout  →  server clears cookie; access token expires naturally
```

### Dependency Guards

```python
require_student  = require_role(UserRole.student, UserRole.mentor, UserRole.admin)
require_mentor   = require_role(UserRole.mentor, UserRole.admin)
require_admin    = require_role(UserRole.admin)
```

### Rate Limits (slowapi)

| Endpoint | Limit |
|---|---|
| `POST /auth/register` | 3/minute |
| `POST /auth/login` | 5/minute |
| All others | 60/minute |

### 2FA / TOTP

```
1. POST /auth/2fa/enable   →  returns { secret, qr_code_image_b64 }
2. User scans QR with Google Authenticator / Authy
3. POST /auth/2fa/verify  { code: "123456" }  →  2FA activated
4. Future logins prompt for 6-digit code after password
5. POST /auth/2fa/disable  { code: "123456" }  →  2FA deactivated
```

---

## 🔌 Real-time Architecture

WebSocket rooms run fully in-memory — no Redis broker required for single-server deployments.

```
Q&A WebSocket
─────────────
Client A  ──WS──►  /qa/ws/{course_id}?token=...
Client B  ──WS──►  /qa/ws/{course_id}?token=...

                    QAConnectionManager._rooms[course_id] = {ws_A, ws_B}

Client A posts message:
  1. QAMessage saved to PostgreSQL
  2. manager.broadcast(course_id, payload)
     └── Sends JSON to ws_A + ws_B directly

Notifications WebSocket
───────────────────────
Each user gets a personal channel:
  _user_sockets[user_id] = {ws_1, ws_2, ...}

Server events call:
  await notification_manager.send(user_id, payload)
```

> **Multi-server scaling:** Replace `_rooms` dict with Redis Pub/Sub.  
> Redis is already provisioned in docker-compose as `REDIS_URL=redis://redis:6379/0`.

---

## 💳 Payment Flow

```
Student Flow:
  1. POST /payments/checkout  →  Stripe creates hosted Checkout Session
  2. Frontend redirects student to Stripe's payment page
  3. Student completes payment on Stripe
  4. Stripe → POST /payments/webhook/stripe  (HMAC-SHA256 signature verified)
  5. Webhook atomically:
       a. Marks Payment.status = completed
       b. Creates Enrollment record
       c. Links enrollment to payment
       d. Sends enrollment confirmation email to student

Dispute / Fraud:
  charge.dispute.created  →  Enrollment suspended (access revoked)

Admin Refund:
  POST /payments/refund { payment_id, reason }
  →  Stripe refund API call
  →  Enrollment.status = refunded
  →  Refund confirmation email to student
```

---

## 📧 Email Notifications

Emails are sent via `aiosmtplib` from `app/core/email.py`.  
All are **non-blocking** (wrapped in `try/except`) and **never break the calling flow**.

**Dev mode:** When `SMTP_HOST` is empty, emails are printed to the logger console — zero config needed for local development.

| Trigger | Subject | Template |
|---|---|---|
| Free or paid enrollment | `"You're enrolled in {course} – Polaris"` | `enrollment_email()` |
| Stripe webhook enrollment | `"Enrolled in {course} – Polaris"` | `enrollment_email()` |
| Q&A reply to your question | `"Your question in {course} was answered"` | `qa_answer_email()` |
| Admin refund processed | `"Refund Processed for {course} – Polaris"` | `refund_email()` |

All emails use a **dark-themed branded HTML template** matching the Polaris UI.

To enable email delivery, set in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM=noreply@polaris.io
```

---

## 🔍 Search System

Search uses PostgreSQL ILIKE with GIN indexing — no Elasticsearch required.

```sql
-- Full-text search equivalent:
SELECT * FROM courses
WHERE (title ILIKE '%python%' OR short_description ILIKE '%python%' OR tags ILIKE '%python%')
  AND status = 'published'
  AND level = 'beginner'
  AND price >= 0 AND price <= 100
  -- Rating filter (subquery join):
  AND id IN (
    SELECT course_id FROM reviews
    WHERE is_approved = true
    GROUP BY course_id
    HAVING AVG(rating) >= 4.0
  )
ORDER BY created_at DESC
LIMIT 20;
```

**GIN Index** (add via Alembic for production performance):
```sql
CREATE INDEX CONCURRENTLY idx_courses_fts
ON courses USING GIN (to_tsvector('english', title || ' ' || COALESCE(short_description,'') || ' ' || COALESCE(tags,'')));
```

**Autocomplete** returns up to 8 prefix-matched course titles in < 5 ms.

---

## 🎮 Gamification System

| Component | Table | Description |
|---|---|---|
| **Streaks** | `streaks` | Daily activity tracking, longest streak, freeze mechanism |
| **Points** | `points_ledger` | Immutable append-only log of all point transactions |
| **Leaderboard** | `leaderboard_entries` | Denormalized rankings (global, per-course, weekly/monthly/all-time) |

### Point Events

| Event | Points |
|---|---|
| Complete a lesson | +10 |
| Pass a quiz | +25 |
| Q&A contribution | +5 |
| Daily login streak | +2 |
| Streak milestone bonus | Variable |

### Streak Rules
- Activity must occur on consecutive calendar days
- **Streak freeze** can be purchased with points to skip one day
- `longest_streak` is never reduced

---

## 🖥️ Frontend Pages

| Route | Page | Roles | Description |
|---|---|---|---|
| `/` | `Home.jsx` | All | Hero, features, discipline cards |
| `/login` | `Login.jsx` | — | Email/password + 2FA code step |
| `/register` | `Register.jsx` | — | Role selection + form |
| `/courses` | `CourseList.jsx` | All | Browse with search/filter sidebar |
| `/courses/:slug` | `CourseDetail.jsx` | All | Preview, rating, enroll CTA |
| `/learn/:courseId` | `Learn.jsx` | Student | Video/PDF + progress + Q&A + Quiz |
| `/checkout/:courseId` | `Checkout.jsx` | Student | Stripe Elements |
| `/dashboard` | `StudentDashboard.jsx` | Student | Enrollments, progress, certs, streak, points |
| `/profile` | `Profile.jsx` | All | Avatar, bio, 2FA setup, account info |
| `/mentor` | `MentorDashboard.jsx` | Mentor | Expandable per-course analytics rows |
| `/mentor/courses/new` | `CourseEditor.jsx` | Mentor | Full CRUD: modules + lessons + attachments |
| `/mentor/courses/:id/edit` | `CourseEditor.jsx` | Mentor | Edit existing course |
| `/admin` | `AdminDashboard.jsx` | Admin | 6-tab: Overview/Courses/Mentors/Reviews/Payments/Reports |
| `/admin/users` | `AdminUsers.jsx` | Admin | User list + approve/deactivate |
| `/certificates/verify/:id` | `CertificatePage.jsx` | All | Public certificate verification |

### Admin Dashboard Tabs

| Tab | Features |
|---|---|
| **Overview** | Metric cards + quick-action banners |
| **Courses** | Approve / Reject pending courses |
| **Mentors** | Approve pending mentor accounts |
| **Reported Reviews** | Keep or Remove flagged reviews with abuse reason |
| **Payments** | All transactions list + **Refund modal** (reason required) |
| **Reports** | Download CSV — Users / Enrollments / Revenue |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in values:

```env
# ── App ──────────────────────────────────────────────────────────────────────
APP_NAME=Polaris API
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=false
FRONTEND_URL=http://localhost:5173

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/Polaris

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── JWT ───────────────────────────────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── AWS S3 ────────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=polaris-media
AWS_REGION=ap-south-1

# ── Stripe (Sandbox) ──────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
# Leave SMTP_HOST empty to disable email sending (dev mode: emails → console log)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAILS_FROM=noreply@polaris.io

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# ── Rate Limits ───────────────────────────────────────────────────────────────
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_REGISTER=3/minute
RATE_LIMIT_DEFAULT=60/minute
```

---

## ⚡ Quick Start

### Prerequisites

- Docker Desktop 4.x (recommended)
- OR: Python 3.12 + Node.js 20 + PostgreSQL 16

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone and configure
git clone <repo>
cd final-project
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY and STRIPE_* keys

# 2. Start all services
docker-compose up -d

# 3. Run database migrations
docker exec Polaris_backend alembic upgrade head

# 4. Open the app
# Frontend:  http://localhost:5173
# API Docs:  http://localhost:8000/docs
```

### Option B — Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 🐳 Docker Compose

```yaml
services:
  postgres:   # PostgreSQL 16 on :5432
  redis:      # Redis 7 Alpine on :6379
  backend:    # FastAPI on :8000 (hot-reload via volume mount)
  frontend:   # React/Vite on :5173 (hot-reload via volume mount)
```

All services include healthchecks. Backend waits for both Postgres and Redis to be healthy before starting.

```bash
docker-compose up -d          # Start all services
docker-compose logs -f backend  # Follow backend logs
docker-compose down -v          # Stop and remove volumes
```

---

## 🗃️ Alembic Migrations

```bash
# Apply all migrations (initial schema)
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "add xyz column"

# Check current migration state
alembic current

# Rollback one revision
alembic downgrade -1
```

Migration file: [`alembic/versions/0001_initial.py`](backend/alembic/versions/0001_initial.py)  
Covers all 15 tables with indexes, foreign keys, and PostgreSQL enum types.

---

## ☁️ Deployment

### Railway (Recommended)

```bash
railway login
railway init
railway up
# Set environment variables in Railway dashboard
```

Railway auto-detects the Dockerfile and builds the image. Add a PostgreSQL plugin and Redis plugin from the dashboard.

### Render

1. Create a new Web Service → connect GitHub repo → `./backend` root
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add PostgreSQL and Redis as add-ons

### AWS EC2

```bash
# On EC2 instance (Ubuntu 22.04)
sudo apt-get install -y docker.io docker-compose-plugin
git clone <repo> && cd final-project
cp .env.example .env && nano .env   # fill in production values
docker-compose up -d
```

**Recommended:** Put an Nginx reverse proxy in front for SSL termination:
```nginx
server {
    listen 443 ssl;
    server_name api.polaris.io;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🧪 Testing

```bash
cd backend

# Run all tests
pytest tests/ -v --asyncio-mode=auto

# With coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_auth.py -v
```

Tests use `aiosqlite` (in-memory SQLite) for a zero-infrastructure test database. The Pytest fixtures provide a fully isolated async session per test.

---

## 📦 Python Dependencies Summary

```
fastapi, uvicorn           # Web framework + server
sqlalchemy, asyncpg        # ORM + async PostgreSQL driver
alembic                    # Migrations
pydantic-settings, pydantic # Settings + validation
PyJWT, passlib, bcrypt     # Auth + password hashing
pyotp, qrcode, Pillow      # 2FA / TOTP + QR generation
slowapi                    # Rate limiting
boto3                      # AWS S3
stripe                     # Payment processing
reportlab                  # PDF certificate generation
python-multipart           # File upload support
aiosmtplib                 # Async email delivery
pytest, pytest-asyncio, httpx, aiosqlite  # Testing
```

---

## 📝 Notes

- **WebSocket Scaling:** Current implementation uses in-memory managers (single-server). Redis Pub/Sub is provisioned and ready for drop-in replacement when horizontal scaling is needed.
- **Search at Scale:** ILIKE + GIN index handles millions of rows efficiently on PostgreSQL. Elasticsearch is not needed unless requirements change.
- **Email in Dev:** Leave `SMTP_HOST` empty — emails are logged to the console. No email service setup required for development.
- **Certificate Verify URL:** Public endpoint `/certificates/verify/{cert_id}` — shareable, no auth required.
- **Stripe Webhook:** Must be registered in Stripe dashboard pointing to `{API_URL}/api/v1/payments/webhook/stripe`.

---

## 📄 License

MIT © 2025 Adithyan Raj
