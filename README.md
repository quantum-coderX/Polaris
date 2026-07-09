# 🎓 Polaris — Online Learning Platform

> A production-grade, cloud-native e-learning platform built with **FastAPI microservices** + **React** + **PostgreSQL** — 4 independently deployable backend services fronted by an **Nginx API Gateway**.
>
> **Prepared by:** Adithyan Raj &nbsp;|&nbsp; **Timeline:** 4 Weeks &nbsp;|&nbsp; **Date:** May 2026

---

## 🚀 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + Vite + TailwindCSS + Zustand + React Query | Modular, decoupled client state |
| **API Gateway** | Nginx 1.27 | URL-prefix routing to 4 backend services |
| **Auth Service** | FastAPI (Python 3.12, async) · port 8001 | Identity & session isolation |
| **Payment Service** | FastAPI · Stripe Sandbox · port 8003 | Billing domain isolation |
| **Notif Service** | FastAPI · WebSockets · port 8002 | Real-time push + cross-service HTTP |
| **Core Service** | FastAPI · port 8000 | Courses, lessons, enrollments, Q&A, search |
| **Database** | PostgreSQL 16 + SQLAlchemy (asyncpg) + Alembic | Shared DB — single source of truth |
| **Search** | PostgreSQL Full-Text Search (`tsvector` + GIN index) | No sync infrastructure needed |
| **Real-time** | FastAPI WebSockets (in-memory `ConnectionManager`) | Zero-dependency per-course rooms |
| **File Storage** | AWS S3 Pre-signed URLs | Direct-to-bucket, short-TTL uploads |
| **Payments** | Stripe Sandbox (webhook-verified) | Cryptographic signature enforcement |
| **Auth** | JWT — Access (15 min) + Refresh (7 d, HttpOnly cookie) | Stateless, secure session model |
| **Deployment** | Docker Compose (6 containers) → Railway / Render | Managed Postgres, instant deploys |

---

## 🏗️ Microservice Architecture

```
                   ┌───────────────────────────────────────┐
  Browser          │         Nginx Gateway  :80             │
  Frontend ───────►│  Single entry point — routes by prefix │
                   └────┬───────────┬───────────┬──────────┘
                        │           │           │          │
               /auth/*  │  /pay/*   │  /notif/* │  rest    │
               /users/* │           │           │          │
                        │           │           │          │
                ┌───────▼──┐  ┌─────▼────┐  ┌──▼────┐  ┌──▼────────┐
                │  auth-   │  │ payment- │  │ notif-│  │  core-    │
                │ service  │  │ service  │  │service│  │  service  │
                │  :8001   │  │  :8003   │  │ :8002 │  │  :8000    │
                └──────────┘  └────┬─────┘  └───────┘  └───────────┘
                                   │  HTTP /internal/notify
                                   └──────────────►│
                              (after Stripe webhook confirmed)
                                                   │
                 ┌─────────────────────────────────▼──────────┐
                 │               PostgreSQL  :5432             │
                 └────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Domain |
|---|---|---|
| **auth-service** | 8001 | `/auth/*`, `/users/*` — JWT, 2FA, user profile |
| **payment-service** | 8003 | `/payments/*` — Stripe checkout, webhooks, refunds |
| **notif-service** | 8002 | `/notifications/*` + WS — push notifications |
| **core-service** | 8000 | courses, lessons, enrollments, Q&A, search, quizzes, certs, admin |

### Cross-Service Communication

After a Stripe `checkout.session.completed` webhook is verified by **payment-service**,
it fires an async HTTP call to **notif-service** `/internal/notify`:

```
Stripe webhook → payment-service
                      │  httpx POST /internal/notify
                      └──────────────► notif-service
                                            │  persists Notification to DB
                                            │  pushes WebSocket message to user
                                            ▼
                                     User sees: "Enrollment Confirmed! 🎉"
```

This endpoint is **not routed through Nginx**, so it is only reachable within
the Docker network — effectively an internal service bus over HTTP.

---

## 📁 Project Structure

```
final-project/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # All API routers (shared by all services)
│   │   │   ├── auth.py      # Register, login, refresh, logout
│   │   │   ├── courses.py   # CRUD + approve/reject workflow
│   │   │   ├── lessons.py   # S3 presigned upload + stream URLs
│   │   │   ├── enrollments.py
│   │   │   ├── payments.py  # Stripe checkout + webhook → notif-service call
│   │   │   ├── reviews.py
│   │   │   ├── qa.py        # REST + WebSocket
│   │   │   ├── search.py    # PostgreSQL FTS
│   │   │   ├── notifications.py  # WS push + /internal/notify handler
│   │   │   └── admin.py
│   │   ├── core/
│   │   ├── models/
│   │   ├── websockets/
│   │   └── main.py          # ← core-service entrypoint
│   ├── auth_main.py         # ← auth-service entrypoint
│   ├── notif_main.py        # ← notif-service entrypoint
│   ├── payment_main.py      # ← payment-service entrypoint
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile           # Shared image — CMD overridden per service
├── nginx/
│   ├── nginx.conf           # URL-prefix routing rules
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── store/authStore.js
│       └── services/api.js  # Points to http://localhost/api/v1 (Nginx)
├── docker-compose.yml       # 6-container orchestration
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

### 2. Start all 6 containers

```bash
docker-compose up -d
```

| Service | Container | URL |
|---------|-----------|-----|
| API Gateway | Polaris_nginx | http://localhost:80 |
| Auth Service | Polaris_auth | http://localhost:8001/docs |
| Payment Service | Polaris_payment | http://localhost:8003/docs |
| Notif Service | Polaris_notif | http://localhost:8002/docs |
| Core Service | Polaris_core | http://localhost:8000/docs |
| Frontend | Polaris_frontend | http://localhost:5173 |

### 3. Run Migrations

```bash
docker exec Polaris_core alembic upgrade head
```

### 4. Frontend (standalone)

```bash
cd frontend
npm install
npm run dev
```

### 5. Backend services (standalone, without Docker)

```bash
cd backend
python -m venv venv
pip install -r requirements.txt

# Run each service in a separate terminal:
uvicorn app.main:app     --port 8000 --reload  # core-service
uvicorn auth_main:app    --port 8001 --reload  # auth-service
uvicorn notif_main:app   --port 8002 --reload  # notif-service
uvicorn payment_main:app --port 8003 --reload  # payment-service
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
