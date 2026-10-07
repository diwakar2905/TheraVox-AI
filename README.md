<div align="center">

# 🧠 TheraVox AI

### **Next-Generation Multimodal Emotion Recognition & Digital Mental Health Platform**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br />

> **TheraVox AI** bridges artificial intelligence and clinical psychology by decoding human emotions through **Text**, **Speech Audio**, and **Facial Video Streams**. Equipped with real-time crisis escalation, interactive Cognitive Behavioral Therapy (CBT) modules, clinician dashboards, data portability, and multi-language support.

</div>

---

## 🎭 The 7-Emotion Spectrum Engine

TheraVox AI unifies deep learning models to classify 7 fundamental emotional states:

| Emotion | Visual Badge | Text Classifier | Speech SER | Facial DeepFace |
|:---:|:---:|:---:|:---:|:---:|
| **Joy / Happiness** | 😄 `JOY` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Sadness** | 😢 `SADNESS` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Anger** | 😡 `ANGER` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Fear / Anxiety** | 😨 `FEAR` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Disgust** | 🤢 `DISGUST` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Surprise** | 😮 `SURPRISE` | DistilRoBERTa | Wav2Vec2 XLS-R | MediaPipe / OpenCV |
| **Neutral** | 😐 `NEUTRAL` | Lexicon Fallback | Acoustic Pitch | Frame Smoothing |

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Web & Mobile PWA)"]
        UI["React 19 SPA (Vite + TS)"]
        SW["Service Worker (PWA & Offline Cache)"]
        i18n["i18next (EN / HI / ES)"]
    end

    subgraph API ["FastAPI Backend Engine"]
        Gateway["FastAPI Async Gateway"]
        Auth["JWT & OAuth 2.0 (Google / GitHub)"]
        RateLimiter["SlowAPI Rate Limiter"]
    end

    subgraph AI ["Multimodal Emotion & AI Services"]
        TextNLP["DistilRoBERTa NLP Service"]
        AudioSER["Wav2Vec2 XLS-R Speech Model"]
        VisionFace["DeepFace + MediaPipe Vision"]
        CompanionAI["Groq AI Llama 3.1 8B"]
        CrisisEngine["Regex Safety & Crisis Scanner"]
    end

    subgraph Safety ["Escalation & Monitoring"]
        SMS["Twilio SMS Emergency Alert"]
        SMTP["Async Email Escalation"]
        PostHog["Anonymized PostHog Telemetry"]
        Sentry["Sentry Error Tracking"]
    end

    subgraph Storage ["Persistence Layer"]
        DB[(PostgreSQL 16 / SQLite Async)]
        Export["ZIP Data Export Generator"]
    end

    UI --> Gateway
    Gateway --> Auth
    Gateway --> TextNLP
    Gateway --> AudioSER
    Gateway --> VisionFace
    Gateway --> CompanionAI
    Gateway --> CrisisEngine
    CrisisEngine --> SMS
    CrisisEngine --> SMTP
    Gateway --> DB
    Gateway --> Export
    UI --> PostHog
    Gateway --> Sentry
```

---

## ✨ Key Feature Matrix

### 🧠 1. Multimodal Emotion Recognition
- **Text Emotion NLP**: Transformer-based model (`j-hartmann/emotion-english-distilroberta-base`) with rule-based fallback handling emoji intensity, negation, and lexicon scoring.
- **Speech Emotion Recognition (SER)**: PyTorch Wav2Vec2 XLS-R acoustic processor supporting real-time microphone recording and WAV/MP3 uploads.
- **Facial Vision Analysis**: DeepFace frame processing with CLAHE lighting normalization and 3-frame temporal smoothing.

### 🤖 2. Mindful AI Companion & Guided Journaling
- **MindfulMind AI Chatbot**: Empathetic conversational partner powered by Groq Llama 3.1 8B. Automatically summarizes chat sessions into key themes, action items, and mood arcs.
- **AI Journaling**: Context-aware prompts generated dynamically based on your 14-day mood score trends.

### 🛡️ 3. Safety & Emergency Crisis Escalation
- Real-time safety scanner analyzing suicidal ideation, self-harm, and severe distress (~40 patterns).
- **Automated Escalation**: When severity is `HIGH` or `CRITICAL`, immediate Twilio SMS alerts are sent to emergency contacts, and encrypted reports are emailed to clinical admins.

### 📚 4. Therapeutic Programs (CBT & Mindfulness)
- Curated evidence-based courses: *CBT Thought Restructuring Mastery*, *7-Day Mindful Breathing*, and *Building Emotional Resilience*.
- Step-by-step interactive player, progress tracking, and unlockable achievement badges.

### 📊 5. Personalization & Data Portability
- **Smart Recommendations**: Rule-based engine recommending daily exercises based on recent mood logs.
- **User Data Export**: Download your complete account data as a structured `.zip` archive (`profile.json`, `wellness_entries.json`, `chat_sessions.json`, `crisis_alerts.json`, `feedback_history.json`).
- **PostHog Telemetry**: SHA-256 anonymized distinct user tracking (`hash(user_id)`).

### 👨‍⚕️ 6. Professional Therapist Portal
- Role-Based Access Control (`user`, `therapist`, `admin`).
- Secure 6-character patient invitation linking (`TherapistClientLink`).
- Patient mood trends and crisis alerts viewable strictly upon client digital consent (`consent_shared = True`).

### 🌐 7. Global i18n & Mobile PWA
- **Localization**: Full translation support in **English (EN)**, **Hindi (HI)**, and **Spanish (ES)**.
- **PWA Mobile**: Web App Manifest (`manifest.json`) and Cache-First Service Worker (`sw.js`) enabling offline access and daily Web Push check-in reminders.

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.11 or 3.12** (TensorFlow/MediaPipe wheels are not available for 3.13 yet)
- **Node.js 20.19+** (required by Vite 7) — only needed to rebuild or develop the frontend
- **PostgreSQL 16** (optional; without `DATABASE_URL` development uses a local SQLite file)

### 1️⃣ Backend (also serves the web UI)

```bash
git clone https://github.com/diwakar2905/TheraVox-AI.git
cd TheraVox-AI

python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .\.venv\Scripts\Activate.ps1   # Windows PowerShell

pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env             # optional — add GROQ_API_KEY for the full AI companion
python main.py
```

Open `http://localhost:8000`. No database or secrets are needed for local use: the app creates
`theravox_dev.db` (SQLite) and a temporary JWT key, and logs a warning about each.

### 2️⃣ Frontend dev server (optional, for live-reload while editing UI code)

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies /api to :8000)
```

### 🎬 Preparing a demo

```bash
python scripts/warmup_models.py  # one-time: downloads text, speech and face models (needs internet)
python main.py                   # start the app
python scripts/demo_check.py     # in a second terminal: checks every feature end-to-end
```

- The AI companion uses Groq when `GROQ_API_KEY` is set (free key at https://console.groq.com);
  without it, chat and session summaries use a built-in offline companion instead of failing.
- Text and voice analysis fall back to lexicon/acoustic analysis if their models are not available.
- Use Chrome or Edge for the Vision and Audio pages and allow camera/microphone access.

---

## 🧪 Testing & Verification

TheraVox AI comes with a comprehensive test suite covering API endpoints, services, authentication, and database CRUD:

```bash
# Run backend pytest suite (32 tests)
pytest -v tests/
```

Expected Output:
```text
================== 26 passed, 6 skipped, 1 warning in 6.76s ===================
```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the root directory:

```env
# Server & Database
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/theravox_db

# Security & Auth
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Models & APIs
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Telemetry & Safety
POSTHOG_API_KEY=phc_your_posthog_key_here
SENTRY_DSN=https://your_sentry_dsn_here
TWILIO_ACCOUNT_SID=AC_your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_PHONE=+15550199

# Notifications & Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@theravox.ai
SMTP_PASSWORD=your_smtp_password
NOTIFY_EMAIL=admin@theravox.ai
```

---

## 📖 Documentation & Compliance

- 📖 **[Official User & Therapist Guide](file:///c:/Users/diwak/Downloads/TheraVox-AI-phase-2-final/TheraVox-AI-phase-2-final/docs/USER_GUIDE.md)**
- 🚀 **[Staging & Production Deployment Guide](file:///c:/Users/diwak/Downloads/TheraVox-AI-phase-2-final/TheraVox-AI-phase-2-final/docs/DEPLOYMENT.md)**
- 🔒 **[Privacy & Telemetry Policy](file:///c:/Users/diwak/Downloads/TheraVox-AI-phase-2-final/TheraVox-AI-phase-2-final/docs/PRIVACY.md)**
- 🏥 **[Clinical Trial Validation Framework](file:///c:/Users/diwak/Downloads/TheraVox-AI-phase-2-final/TheraVox-AI-phase-2-final/docs/CLINICAL_VALIDATION.md)**
- 🛡️ **[HIPAA & GDPR Technical Safeguards](file:///c:/Users/diwak/Downloads/TheraVox-AI-phase-2-final/TheraVox-AI-phase-2-final/docs/HIPAA_COMPLIANCE.md)**

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">
  <sub>Built with ❤️ by the TheraVox AI Engineering Team.</sub>
</div>