# Smart Inspections — Setup & Execution Guide

AI-Assisted FDA 483 & EIR Document Generation Platform

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.x, FastAPI, Uvicorn |
| **AI/LLM** | LangChain, Google Gemini (or OpenAI GPT-4) |
| **OCR** | PyMuPDF (PDF), Tesseract + OpenCV (images) |
| **Document Generation** | python-docx (Form 483, EIR .docx) |
| **Database** | SQLite (default) or PostgreSQL |
| **Frontend (Full App)** | React, Vite, TypeScript, TailwindCSS, React Query, Axios |
| **Frontend (Auth/Dashboard)** | Next.js 14, React, TypeScript, TailwindCSS |
| **Auth** | JWT, bcrypt, PostgreSQL (users), nodemailer (verification) |

---

## Main Execution Steps

### Prerequisites

- **Python 3.10+** with venv
- **Node.js 18+** and npm
- **Tesseract OCR** installed ([Windows](https://github.com/UB-Mannheim/tesseract/wiki) | [Mac](https://formulae.brew.sh/formula/tesseract))
- **PostgreSQL** (optional, for auth; SQLite used for backend by default)
- **Google API Key** (or OpenAI) for AI generation

---

### Step 1: Backend (Port 8000)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
GOOGLE_MODEL=gemini-2.5-flash
DATABASE_URL=sqlite:///./smart_inspections.db
DATA_DIR=../data
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Run the backend:

```powershell
uvicorn app.main:app --reload --port 8000
```

---

### Step 2: Frontend — Full App (Port 5173)

**Use this for the full workflow: inspection input → OCR → AI → Form 483 → save to library.**

```powershell
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

Run the frontend:

```powershell
npm run dev
```

Open **http://localhost:5173**

---

### Step 3: Frontend — Auth & Dashboard (Port 3000, Optional)

For landing page, login, signup, and JWT-protected dashboard:

```powershell
cd src/gui
npm install
```

Configure `src/gui/.env` (PostgreSQL, JWT, SMTP for email verification).

Run:

```powershell
npm run dev
```

Open **http://localhost:3000**

---

## End-to-End Flow: Observation Input → OCR → Form 483 → Library

### 1. Inspection Observation Input

- **Upload**: PDF or images (handwritten or typed) → OCR extracts text
- **Type**: Manually enter inspection notes
- **Checklist**: Structured area/condition/evidence/CFR entries

### 2. OCR Processing

- **Endpoint**: `POST /api/ocr`
- **Input**: File (PDF/image) + `is_handwritten` flag
- **Output**: `{ text_blocks, full_text, low_confidence_blocks }`
- **Tech**: PyMuPDF (PDF), Tesseract + OpenCV (images)

### 3. AI Observation Generation

- **Endpoint**: `POST /api/ai/generate-observations`
- **Input**: `raw_notes`, `establishment_type`, `cfr_parts`
- **Output**: Draft observations with CFR citations, evidence, confidence
- **Tech**: LangChain + Google Gemini / OpenAI

### 4. Form 483 Generation

- **Endpoint**: `POST /api/documents/generate-483`
- **Input**: `form_data` (inspection metadata) + `observations`
- **Output**: FDA 483 .docx file
- **Tech**: python-docx

### 5. Save to Library

- **Endpoint**: `POST /api/library`
- **Input**: firm_name, fei_number, observations, metadata, document_type
- **Output**: Saved document record (SQLite/PostgreSQL)

---

## Quick Start (Minimal)

1. **Backend**: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`
2. **Frontend**: `cd frontend && npm run dev`
3. Open **http://localhost:5173** → New Inspection → Upload/type notes → Generate → Download 483 / Save to Library

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ocr` | POST | Process PDF/image → extract text |
| `/api/ai/generate-observations` | POST | Raw notes → AI draft observations |
| `/api/ai/refine-observation` | POST | Refine observation with feedback |
| `/api/documents/generate-483` | POST | Generate Form FDA 483 .docx |
| `/api/documents/generate-eir` | POST | Generate EIR narrative .docx |
| `/api/documents/generate-both` | POST | Generate 483 + EIR as ZIP |
| `/api/library` | GET/POST | List / save documents |
| `/api/library/{id}` | GET/DELETE | Get / delete saved document |
| `/api/observations` | GET/POST | List / add observations (Excel) |
| `/api/health` | GET | Health check |

---

## Troubleshooting

- **OCR fails**: Ensure Tesseract is installed and on PATH
- **AI fails**: Check `GOOGLE_API_KEY` or `OPENAI_API_KEY` in `backend/.env`
- **CORS errors**: Add your frontend origin to `CORS_ORIGINS` in `backend/.env`
- **Database**: Backend uses SQLite by default; no PostgreSQL needed for core features
