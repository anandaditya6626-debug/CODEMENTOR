# CodeMentor

**Learn to code. Think like an engineer.**

Your personalized AI mentor for coding, DSA and technical interviews.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- A Judge0 API key (RapidAPI) or self-hosted Judge0

### 1. Start Services
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp ../.env.example .env  # Edit with your keys
alembic upgrade head
python -m seed.run
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp ../.env.example .env.local  # Edit with your keys
npm run dev
```

### 4. Open
Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor
- **Backend**: FastAPI, Python, SQLAlchemy (async)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Code Execution**: Judge0 (sandboxed)
- **AI**: Provider-independent (OpenAI / Gemini / Anthropic)

## Project Structure
```
├── frontend/          # Next.js 14 App Router
│   ├── src/
│   │   ├── app/       # Pages and layouts
│   │   ├── components/# UI components
│   │   ├── lib/       # Utilities and API client
│   │   ├── stores/    # Zustand state management
│   │   └── types/     # TypeScript types
│   └── public/
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic
│   │   └── middleware/ # Auth, rate limiting
│   ├── alembic/       # Database migrations
│   └── seed/          # Seed data
└── docker-compose.yml
```
