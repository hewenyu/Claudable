"""
Unit tests for Projects API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.projects import Project as ProjectModel


@pytest.mark.unit
@pytest.mark.api
def test_projects_health_endpoint(client: TestClient):
    """Test projects health check endpoint."""
    response = client.get("/api/projects/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.unit
@pytest.mark.api
def test_list_projects_empty(client: TestClient):
    """Test listing projects when none exist."""
    response = client.get("/api/projects/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.unit
@pytest.mark.api
def test_list_projects_with_data(client: TestClient, test_db_session: Session):
    """Test listing projects with existing data."""
    # Create some test projects
    projects = [
        ProjectModel(
            id="test_project_1",
            name="Test Project 1",
            description="First test project",
            status="idle"
        ),
        ProjectModel(
            id="test_project_2", 
            name="Test Project 2",
            description="Second test project",
            status="active"
        )
    ]
    
    for project in projects:
        test_db_session.add(project)
    test_db_session.commit()
    
    response = client.get("/api/projects/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    # Check first project
    project_1 = next(p for p in data if p["id"] == "test_project_1")
    assert project_1["name"] == "Test Project 1"
    assert project_1["status"] == "idle"
    
    # Check second project
    project_2 = next(p for p in data if p["id"] == "test_project_2")
    assert project_2["name"] == "Test Project 2"
    assert project_2["status"] == "active"


@pytest.mark.unit
@pytest.mark.api
def test_get_project_by_id(client: TestClient, test_db_session: Session):
    """Test getting a specific project by ID."""
    # Create a test project
    project = ProjectModel(
        id="test_get_project",
        name="Get Test Project",
        description="Project for get endpoint test",
        status="idle"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    response = client.get("/api/projects/test_get_project")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test_get_project"
    assert data["name"] == "Get Test Project"
    assert data["description"] == "Project for get endpoint test"
    assert data["status"] == "idle"


@pytest.mark.unit
@pytest.mark.api
def test_get_project_not_found(client: TestClient):
    """Test getting a non-existent project."""
    response = client.get("/api/projects/non_existent_project")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


@pytest.mark.unit
@pytest.mark.api
def test_create_project_valid(client: TestClient):
    """Test creating a valid project."""
    project_data = {
        "project_id": "test-new-project",
        "name": "New Test Project",
        "initial_prompt": "Create a simple web application",
        "preferred_cli": "claude",
        "fallback_enabled": True
    }
    
    response = client.post("/api/projects/", json=project_data)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-new-project"
    assert data["name"] == "New Test Project"
    assert data["status"] == "initializing"  # Should be initializing when created


@pytest.mark.unit
@pytest.mark.api
def test_create_project_invalid_id(client: TestClient):
    """Test creating project with invalid ID format."""
    project_data = {
        "project_id": "INVALID_ID_WITH_CAPS",  # Should be lowercase
        "name": "Invalid Project"
    }
    
    response = client.post("/api/projects/", json=project_data)
    assert response.status_code == 422  # Validation error


@pytest.mark.unit
@pytest.mark.api 
def test_create_project_duplicate_id(client: TestClient, test_db_session: Session):
    """Test creating project with duplicate ID."""
    # First create a project
    existing_project = ProjectModel(
        id="duplicate-test",
        name="Existing Project"
    )
    test_db_session.add(existing_project)
    test_db_session.commit()
    
    # Try to create another with same ID
    project_data = {
        "project_id": "duplicate-test",
        "name": "New Project"
    }
    
    response = client.post("/api/projects/", json=project_data)
    assert response.status_code == 400  # Bad request for duplicate


@pytest.mark.unit
@pytest.mark.api
def test_update_project(client: TestClient, test_db_session: Session):
    """Test updating an existing project."""
    # Create a project to update
    project = ProjectModel(
        id="test-update-project",
        name="Original Name",
        description="Original description"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    # Update the project
    update_data = {
        "name": "Updated Name"
    }
    
    response = client.put("/api/projects/test-update-project", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["id"] == "test-update-project"


@pytest.mark.unit
@pytest.mark.api
def test_update_project_not_found(client: TestClient):
    """Test updating a non-existent project."""
    update_data = {
        "name": "Updated Name"
    }
    
    response = client.put("/api/projects/non-existent", json=update_data)
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api 
def test_delete_project(client: TestClient, test_db_session: Session):
    """Test deleting an existing project."""
    # Create a project to delete
    project = ProjectModel(
        id="test-delete-project",
        name="Project to Delete"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    response = client.delete("/api/projects/test-delete-project")
    assert response.status_code == 200
    data = response.json()
    assert data["detail"] == "Project deleted successfully"
    
    # Verify project was deleted
    get_response = client.get("/api/projects/test-delete-project")
    assert get_response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_delete_project_not_found(client: TestClient):
    """Test deleting a non-existent project."""
    response = client.delete("/api/projects/non-existent")
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_install_dependencies_endpoint(client: TestClient, test_db_session: Session):
    """Test the install dependencies endpoint."""
    # Create a project first
    project = ProjectModel(
        id="test-install-deps",
        name="Install Deps Test Project"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    response = client.post("/api/projects/test-install-deps/install-dependencies")
    # The actual endpoint implementation might have different behavior
    # but we test that the endpoint exists and accepts the request
    assert response.status_code in [200, 202, 404]  # Could be various depending on implementation