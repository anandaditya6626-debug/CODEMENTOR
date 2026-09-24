import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import engine, Base, get_db
from app.models.problem import Topic
from app.api import (
    execution,
    ai,
    completion,
    problems,
    submissions,
    auth,
    users,
    learning,
    analytics,
    bookmarks,
    notes,
    social,
    admin,
    replay,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: safely attempt database initialization
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Warning: Database startup init error: {e}")
    yield
    # Shutdown
    try:
        await engine.dispose()
    except Exception:
        pass

app = FastAPI(
    title='CodeMentor API',
    description='AI-Powered Coding Learning Platform',
    version='1.0.0',
    lifespan=lifespan
)

# CORS: allow configured FRONTEND_URL, local dev, and all Vercel domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Register all API routers
app.include_router(execution.router, prefix='/api/v1/execute', tags=['Execution'])
app.include_router(ai.router, prefix='/api/v1/ai', tags=['AI Mentor'])
app.include_router(completion.router, prefix='/api/v1/completion', tags=['Completion'])
app.include_router(replay.router, prefix='/api/v1/replay', tags=['Replay'])
app.include_router(problems.router, prefix='/api/v1/problems', tags=['Problems'])
app.include_router(submissions.router, prefix='/api/v1/submissions', tags=['Submissions'])
app.include_router(auth.router, prefix='/api/v1/auth', tags=['Authentication'])
app.include_router(users.router, prefix='/api/v1/users', tags=['Users'])
app.include_router(learning.router, prefix='/api/v1/learning', tags=['Learning'])
app.include_router(analytics.router, prefix='/api/v1/analytics', tags=['Analytics'])
app.include_router(bookmarks.router, prefix='/api/v1/bookmarks', tags=['Bookmarks'])
app.include_router(notes.router, prefix='/api/v1/notes', tags=['Notes'])
app.include_router(social.router, prefix='/api/v1/social', tags=['Social'])
app.include_router(admin.router, prefix='/api/v1/admin', tags=['Admin'])

# Compatibility alias for frontend /api/v1/topics
@app.get('/api/v1/topics', tags=['Problems'])
async def get_topics_alias(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Topic))
    return result.scalars().all()

@app.get('/api/v1/health')
@app.get('/health')
async def health_check():
    return {'status': 'healthy', 'service': 'CodeMentor API'}

