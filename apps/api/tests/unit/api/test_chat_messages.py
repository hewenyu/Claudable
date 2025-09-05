"""
Unit tests for Chat Messages API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.projects import Project as ProjectModel
from app.models.messages import Message as MessageModel
from app.models.sessions import Session as SessionModel


@pytest.mark.unit
@pytest.mark.api
def test_get_messages_project_not_found(client: TestClient):
    """Test getting messages for non-existent project."""
    response = client.get("/api/chat/non-existent-project/messages")
    assert response.status_code == 404


@pytest.mark.unit  
@pytest.mark.api
def test_get_messages_empty(client: TestClient, test_db_session: Session):
    """Test getting messages for a project with no messages."""
    # Create a project first directly via the API to ensure it's in the main database
    project_data = {
        "project_id": "test-messages-empty",
        "name": "Test Messages Project"
    }
    
    # Create project via API to ensure it's in the same database session
    create_response = client.post("/api/projects/", json=project_data)
    assert create_response.status_code == 200
    
    response = client.get("/api/chat/test-messages-empty/messages")
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.unit
@pytest.mark.api
def test_create_message(client: TestClient):
    """Test creating a new message."""
    # Create project via API first
    project_data = {
        "project_id": "test-create-message",
        "name": "Test Create Message Project"
    }
    create_response = client.post("/api/projects/", json=project_data)
    assert create_response.status_code == 200
    
    message_data = {
        "content": "This is a test message",
        "role": "user"
    }
    
    response = client.post("/api/chat/test-create-message/messages", json=message_data)
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "This is a test message"
    assert data["role"] == "user"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.unit
@pytest.mark.api
def test_create_message_project_not_found(client: TestClient):
    """Test creating message for non-existent project."""
    message_data = {
        "content": "This is a test message",
        "role": "user"
    }
    
    response = client.post("/api/chat/non-existent/messages", json=message_data)
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_get_active_session_project_not_found(client: TestClient):
    """Test getting active session for non-existent project."""
    response = client.get("/api/chat/non-existent/active-session")
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_get_active_requests_project_not_found(client: TestClient):
    """Test getting active requests for non-existent project."""
    response = client.get("/api/chat/non-existent/requests/active")
    assert response.status_code == 404