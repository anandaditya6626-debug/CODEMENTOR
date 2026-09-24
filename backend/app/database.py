from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from app.config import settings

import sqlite3
import json
import uuid

# SQLite compatibility shims for PostgreSQL-specific types
@compiles(ARRAY, 'sqlite')
def compile_array(element, compiler, **kw):
    return 'JSON'

@compiles(UUID, 'sqlite')
def compile_uuid(element, compiler, **kw):
    return 'CHAR(36)'

sqlite3.register_adapter(list, json.dumps)
sqlite3.register_adapter(uuid.UUID, lambda u: str(u))
sqlite3.register_converter('json', json.loads)

# Patch UUID.bind_processor to accept string representations gracefully
_orig_uuid_bind_processor = UUID.bind_processor
def _safe_uuid_bind_processor(self, dialect):
    proc = _orig_uuid_bind_processor(self, dialect)
    if proc is None:
        return None
    def process(value):
        if isinstance(value, str):
            try:
                value = uuid.UUID(value)
            except Exception:
                pass
        return proc(value)
    return process

UUID.bind_processor = _safe_uuid_bind_processor

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        echo=False
    )

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

AsyncSessionLocal = async_session_maker

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

