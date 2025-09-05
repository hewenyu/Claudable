from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Ensure data directory exists
db_path = settings.database_url.replace("sqlite:///", "")
Path(db_path).parent.mkdir(parents=True, exist_ok=True)

# Create engine with SQLite-specific settings
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=10,              # Connection pool size
    max_overflow=20,           # Maximum overflow connections
    pool_recycle=3600,         # Connection recycle time (1 hour)
    echo=False                 # Disable SQL logging in production
)

# Enable foreign key constraints for SQLite
if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
