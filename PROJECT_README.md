# Smart Inspections: AI-Drafted FDA 483s & EIRs

AI-assisted platform for FDA investigators to draft Form FDA 483 inspectional observations and Establishment Inspection Reports (EIRs) from raw inspection notes.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   React + Vite  │  HTTP   │  FastAPI Backend  │
│   (port 5173)   │ ──────► │  (port 8000)      │
│                 │         │                    │
│  - Dashboard    │         │  /api/observations │ ◄─── Excel FY2025
│  - New 483      │         │  /api/ai           │ ◄─── OpenAI GPT-4o
│  - Observations │         │  /api/documents    │ ◄─── python-docx
│  - Library      │         │  /api/ocr          │ ◄─── Tesseract OCR
│  - Settings     │         │  /api/library      │ ◄─── SQLite
│                 │         │                    │
│  Tailwind CSS   │         │  LangChain + FAISS │ ◄─── IOM/PDFs
└─────────────────┘         └──────────────────┘
```

## Data Sources

Place these files in the `/data` directory:

| File | Description |
|------|-------------|
| `InvestigationsOperationsManualComplete.pdf` | FDA IOM — regulatory knowledge base |
| `inspection-observation-manual.pdf` | 483a completion instructions (Exhibit 5-18) |
| `Inspection-Observations.pdf` | Able Laboratories 483 example |
| `inspection_observations_fiscal_year_2025_0.xlsx` | FY2025 observations dataset |
| `FDA_483a_Word_Template.docx` | Official Form FDA 483 template |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# Edit .env → set OPENAI_API_KEY

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Docker

```bash
docker compose -f docker-compose.new.yml up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + KB status |
| GET | `/api/observations` | List FY2025 observations (paginated) |
| GET | `/api/observations/stats` | Summary statistics |
| GET | `/api/observations/search?q=…` | Full-text search |
| POST | `/api/observations` | Add observation to Excel |
| GET | `/api/observations/export` | Download filtered Excel |
| POST | `/api/ai/generate-observations` | AI-generate 483 observations |
| POST | `/api/ai/generate-eir` | AI-generate EIR narrative |
| POST | `/api/ai/refine-observation` | Refine observation with feedback |
| POST | `/api/ai/validate-observation` | Validate observation |
| POST | `/api/ocr` | OCR file upload |
| POST | `/api/documents/generate-483` | Generate FDA 483 .docx |
| POST | `/api/documents/generate-eir` | Generate EIR .docx |
| POST | `/api/documents/generate-both` | Generate both as .zip |
| GET | `/api/library` | List saved documents |
| POST | `/api/library` | Save document to library |
| DELETE | `/api/library/{id}` | Delete saved document |

## Workflow

1. **Input metadata** — firm info, FEI, dates, investigators
2. **Provide notes** — upload files (OCR), type notes, or use structured checklist
3. **AI generation** — GPT-4o generates draft observations grounded in IOM + 21 CFR
4. **Review & edit** — confidence scores, review flags, source traceability
5. **Generate documents** — download Form FDA 483 and/or EIR as .docx

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, LangChain, OpenAI, FAISS, PyMuPDF, python-docx, openpyxl, SQLAlchemy/SQLite
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts, Axios
- **AI**: GPT-4o with IOM-trained system prompt, few-shot examples, regulatory knowledge base

## License

Apache 2.0
