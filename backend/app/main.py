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

# Register all API routers under both /api/v1 and /v1 (for flexible reverse-proxy compatibility)
_router_list = [
    (execution.router, '/execute', ['Execution']),
    (ai.router, '/ai', ['AI Mentor']),
    (completion.router, '/completion', ['Completion']),
    (replay.router, '/replay', ['Replay']),
    (problems.router, '/problems', ['Problems']),
    (submissions.router, '/submissions', ['Submissions']),
    (auth.router, '/auth', ['Authentication']),
    (users.router, '/users', ['Users']),
    (learning.router, '/learning', ['Learning']),
    (analytics.router, '/analytics', ['Analytics']),
    (bookmarks.router, '/bookmarks', ['Bookmarks']),
    (notes.router, '/notes', ['Notes']),
    (social.router, '/social', ['Social']),
    (admin.router, '/admin', ['Admin']),
]

for r, path_prefix, tags in _router_list:
    app.include_router(r, prefix=f'/api/v1{path_prefix}', tags=tags)
    app.include_router(r, prefix=f'/v1{path_prefix}', tags=tags)

# Compatibility alias for frontend /api/v1/topics and /v1/topics
@app.get('/api/v1/topics', tags=['Problems'])
@app.get('/v1/topics', tags=['Problems'])
async def get_topics_alias(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Topic))
    return result.scalars().all()

@app.get('/api/v1/health')
@app.get('/v1/health')
@app.get('/health')
async def health_check():
    return {'status': 'healthy', 'service': 'CodeMentor API'}

