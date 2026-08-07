# TheraVox AI - Staging Deployment & Operations Guide

This guide describes how to deploy and operate the TheraVox AI backend and frontend in a Staging environment.

---

## 1. Environment Variables Reference

### Backend Environment Variables (Render / Host)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | Async PostgreSQL Connection String | `postgresql+asyncpg://user:pass@host:5432/theravox` |
| `JWT_SECRET_KEY` | **Yes** | 32+ char secret for JWT token signing | `c8a9f...` |
| `GROQ_API_KEY` | **Yes** | Groq AI API key for chatbot companion | `gsk_...` |
| `SENTRY_DSN` | Optional | Backend Sentry DSN for error tracking | `https://key@sentry.io/12345` |
| `ENVIRONMENT` | **Yes** | Application environment | `staging` / `production` |
| `FRONTEND_URL` | **Yes** | Allowed CORS origins for Web UI | `https://theravox-staging.vercel.app` |

### Frontend Environment Variables (Vercel)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | URL of backend API service | `https://theravox-backend.onrender.com` |
| `VITE_SENTRY_DSN` | Optional | Frontend Sentry DSN | `https://key@sentry.io/67890` |

---

## 2. Deploying Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` and create:
   - PostgreSQL Database instance (`theravox-db`)
   - Web Service instance (`theravox-ai-backend`)
5. In Web Service settings, enter your `GROQ_API_KEY` and optional `SENTRY_DSN`.
6. Deployments will automatically trigger on pushes to `main` branch.

---

## 3. Deploying Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository and select the `frontend/` directory as project root.
4. Set Environment Variables: `VITE_API_BASE_URL` and `VITE_SENTRY_DSN`.
5. Click **Deploy**. Vercel will create preview deployments for pull requests and production builds on `main`.

---

## 4. Local Log Aggregation (ELK Stack)

To run local Elasticsearch, Logstash, and Kibana:

```bash
docker-compose -f docker-compose.elk.yml up -d
```

- Kibana Dashboard: `http://localhost:5601`
- Logstash UDP Port: `5000`
- Elasticsearch API: `http://localhost:9200`
