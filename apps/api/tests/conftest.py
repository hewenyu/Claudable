"""
Test configuration and fixtures for the Claudable API
"""
import os
import tempfile
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(scope="session")
def temp_db_file() -> Generator[str, None, None]:
    """Create a temporary SQLite database file for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temp_file:
        yield temp_file.name
    os.unlink(temp_file.name)


@pytest.fixture(scope="session") 
def test_engine(temp_db_file: str):
    """Create a test database engine."""
    database_url = f"sqlite:///{temp_db_file}"
    engine = create_engine(
        database_url, 
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def test_db_session(test_engine):
    """Create a test database session with transaction rollback."""
    TestingSessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=test_engine
    )
    
    # Start a transaction
    connection = test_engine.connect()
    transaction = connection.begin()
    
    # Create session bound to transaction
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(test_db_session) -> TestClient:
    """Create a test client with dependency overrides."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client(test_db_session) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_project_data():
    """Sample project data for testing."""
    return {
        "id": "test_project_1",
        "name": "Test Project",
        "description": "A test project for unit testing",
        "status": "idle",
        "template_type": "nextjs",
        "initial_prompt": "Create a simple Next.js app"
    }


@pytest.fixture
def sample_chat_message():
    """Sample chat message for testing."""
    return {
        "content": "Hello, this is a test message",
        "role": "user",
        "timestamp": "2024-01-01T00:00:00Z"
    }