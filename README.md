# 🎓 Polaris — Online Learning Platform

> A production-grade, cloud-native e-learning platform built with **FastAPI** + **React** + **PostgreSQL** — designed for rapid development with zero external infrastructure dependencies.
>
> **Prepared by:** Adithyan Raj &nbsp;|&nbsp; **Timeline:** 4 Weeks &nbsp;|&nbsp; **Date:** May 2026

---

## 🚀 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + Vite + TailwindCSS + Zustand + React Query | Modular, decoupled client state |
| **Backend** | FastAPI (Python 3.12, async) | Native async WebSocket support |
| **Database** | PostgreSQL 16 + SQLAlchemy (asyncpg) + Alembic | Single source of truth |
| **Search** | PostgreSQL Full-Text Search (`tsvector` + GIN index) | No sync infrastructure needed |
| **Real-time** | FastAPI WebSockets (in-memory `ConnectionManager`) | Zero-dependency per-course rooms |
| **File Storage** | AWS S3 Pre-signed URLs | Direct-to-bucket, short-TTL uploads |
| **Payments** | Stripe Sandbox (webhook-verified) | Cryptographic signature enforcement |
| **Auth** | JWT — Access (15 min) + Refresh (7 d, HttpOnly cookie) | Stateless, secure session model |
| **Deployment** | Docker Compose → Railway / Render | Managed Postgres, instant deploys |

---

## 📁 Project Structure

```
final-project/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # All API routers
│   │   │   ├── auth.py      # Register, login, refresh, logout
│   │   │   ├── courses.py   # CRUD + approve/reject workflow
│   │   │   ├── lessons.py   # S3 presigned upload + stream URLs
│   │   │   ├── enrollments.py
│   │   │   ├── payments.py  # Stripe checkout + webhook
│   │   │   ├── reviews.py
│   │   │   ├── qa.py        # REST + WebSocket
│   │   │   ├── search.py    # PostgreSQL FTS
│   │   │   ├── notifications.py
│   │   │   └── admin.py
│   │   ├── core/
│   │   │   ├── config.py    # pydantic-settings
│   │   │   ├── database.py  # Async SQLAlchemy engine
│   │   │   ├── security.py  # JWT + bcrypt
│   │   │   └── deps.py      # Auth dependency guards
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── websockets/
│   │   │   └── qa_manager.py  # In-memory ConnectionManager
│   │   └── main.py
│   ├── alembic/             # Schema migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Login.jsx  /  Register.jsx
│       │   ├── CourseList.jsx  /  CourseDetail.jsx
│       │   ├── Learn.jsx        # Video player + progress
│       │   ├── Checkout.jsx     # Stripe Elements
│       │   ├── dashboard/
│       │   │   ├── StudentDashboard.jsx
│       │   │   ├── MentorDashboard.jsx
│       │   │   └── AdminDashboard.jsx
│       │   └── mentor/CourseEditor.jsx
│       ├── components/layout/
│       ├── store/authStore.js   # Zustand
│       └── services/api.js     # Axios + silent refresh
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone & Configure

```bash
git clone <repo>
cd final-project
cp .env.example .env
# Fill in: SECRET_KEY, AWS_*, STRIPE_*
```

### 2. Start with Docker

```bash
docker-compose up -d
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |

### 3. Run Migrations

```bash
docker exec Polaris_backend alembic upgrade head
```

### 4. Frontend (standalone)

```bash
cd frontend
npm install
npm run dev
```

### 5. Backend (standalone)

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 🔐 Auth Flow

```
POST /api/v1/auth/register  →  Create account (student / mentor / admin)
POST /api/v1/auth/login     →  access_token (15 min, Bearer) + refresh cookie (7 d, HttpOnly)
POST /api/v1/auth/refresh   →  New access_token — called silently by Axios interceptor
POST /api/v1/auth/logout    →  Clears HttpOnly cookie; access token expires naturally
GET  /api/v1/auth/me        →  Current user info
```

---

## 🏗️ Roles & Permissions

| Role | Capabilities |
|------|-------------|
| `student` | Browse, search, enroll, stream lessons, track progress, Q&A, review |
| `mentor` | Create/manage courses, upload content to S3, respond in Q&A, view analytics |
| `admin` | Approve mentors & courses, moderate reviews, process refunds, platform stats |

---

## 💡 Key API Endpoints

| Feature | Method | Endpoint |
|---------|--------|----------|
| Course listing + FTS | `GET` | `/api/v1/courses` |
| Search (Postgres FTS) | `GET` | `/api/v1/search/courses?q=python&level=beginner` |
| Autocomplete | `GET` | `/api/v1/search/autocomplete?q=py` |
| Enroll (free) | `POST` | `/api/v1/enrollments/{course_id}` |
| S3 upload URL | `POST` | `/api/v1/lessons/{id}/upload-url` |
| Stream lesson | `GET` | `/api/v1/lessons/{id}/stream` |
| Stripe checkout | `POST` | `/api/v1/payments/checkout` |
| Stripe webhook | `POST` | `/api/v1/payments/webhook/stripe` |
| Q&A messages | `GET/POST` | `/api/v1/qa/{course_id}/messages` |
| Q&A real-time | `WS` | `ws://host/api/v1/qa/ws/{course_id}?token=...` |
| Notifications | `WS` | `ws://host/api/v1/notifications/ws?token=...` |

---

## 🔍 How Search Works

PostgreSQL Full-Text Search — no Elasticsearch cluster required.

```sql
-- Equivalent of what SQLAlchemy generates:
SELECT * FROM courses
WHERE to_tsvector('english', title || ' ' || short_description || ' ' || tags)
      @@ plainto_tsquery('english', 'machine learning python')
  AND status = 'published';
```

A **GIN index** on the tsvector column (added via Alembic migration) keeps this sub-10 ms at scale.

---

## 🔌 Real-time Architecture

WebSocket rooms are pure in-memory — no Redis broker needed.

```
Client A ──WS connect──► ConnectionManager._rooms[course_id].add(ws_A)
Client B ──WS connect──► ConnectionManager._rooms[course_id].add(ws_B)

Client A sends message:
  1. Persist QAMessage to PostgreSQL
  2. manager.broadcast(course_id, payload)
     └── sends to ws_A + ws_B directly
```

---

## 💳 Payment Flow

```
1. POST /payments/checkout  →  Stripe creates hosted Checkout Session
2. User completes payment on Stripe's page
3. Stripe → POST /payments/webhook/stripe  (signature-verified)
4. Webhook atomically creates Enrollment record
5. Dispute → enrollment suspended; Refund → enrollment revoked
```

---

## 🗓️ Development Roadmap

| Week | Focus | Status |
|------|-------|--------|
| **1** | Foundation — FastAPI, DB models, JWT auth, React scaffold | ✅ Complete |
| **2** | Courses, Lessons (S3 streaming), Enrollments, Stripe checkout | ✅ Complete |
| **3** | Q&A WebSocket rooms, Postgres FTS search, Reviews, Notifications | ✅ Complete |
| **4** | Quiz engine, Certificates, Admin user management, Docker, tests | ✅ Complete |

---

## ☁️ Deployment (Railway / Render)

```bash
# Railway CLI
railway login
railway init
railway up

# Or push to GitHub → connect repo in Railway dashboard
# Set environment variables in Railway dashboard from .env.example
```

For AWS EC2 (alternative):
```bash
docker-compose build
docker-compose push
# SSH into EC2, pull images, docker-compose up -d
```

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v --asyncio-mode=auto
```

---

## 📄 License

MIT
