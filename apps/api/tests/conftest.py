"""
Test configuration and fixtures for the API tests
"""
import os
import tempfile
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database session for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Set up test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    session = TestingSessionLocal()
    
    # Override the dependency to use this session
    app.dependency_overrides[get_db] = lambda: session
    
    yield session
    
    # Cleanup
    session.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Create a test client"""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def temp_directory():
    """Create a temporary directory for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def mock_project_data():
    """Mock project data for testing"""
    return {
        "project_id": "test-project-123",
        "name": "Test Project",
        "initial_prompt": "Create a simple web app",
        "preferred_cli": "claude",
        "selected_model": "sonnet-4",
        "fallback_enabled": True
    }


@pytest.fixture
def mock_github_token():
    """Mock GitHub token for testing"""
    return "ghp_test_token_123456789"


@pytest.fixture
def mock_user_info():
    """Mock user info for GitHub API testing"""
    return {
        "valid": True,
        "username": "testuser",
        "name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345"
    }