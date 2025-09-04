"""
Integration tests for Projects API
"""
import json
from unittest.mock import patch, AsyncMock

import pytest
from fastapi import status

from app.models.projects import Project


@pytest.mark.integration
class TestProjectsAPI:
    """Integration tests for the Projects API endpoints"""

    def test_health_endpoint(self, client):
        """Test the health endpoint"""
        response = client.get("/api/projects/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["router"] == "projects"

    def test_list_projects_empty(self, client):
        """Test listing projects when none exist"""
        response = client.get("/api/projects/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []

    def test_create_project_success(self, client, mock_project_data):
        """Test successful project creation"""
        with patch('app.api.projects.crud.initialize_project_background') as mock_init:
            mock_init.return_value = None
            
            response = client.post("/api/projects/", json=mock_project_data)
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert data["id"] == mock_project_data["project_id"]
            assert data["name"] == mock_project_data["name"]
            assert data["status"] == "initializing"
            assert data["initial_prompt"] == mock_project_data["initial_prompt"]
            assert data["services"]["github"]["connected"] is False
            assert data["services"]["vercel"]["connected"] is False
            assert data["tech_stack"] == ["Next.js", "React", "TypeScript"]

    def test_create_project_duplicate_id(self, client, mock_project_data, db_session):
        """Test creating a project with duplicate ID"""
        # Create first project directly in database
        project = Project(
            id=mock_project_data["project_id"],
            name="Existing Project",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        # Try to create project with same ID
        response = client.post("/api/projects/", json=mock_project_data)
        
        assert response.status_code == status.HTTP_409_CONFLICT
        data = response.json()
        assert "already exists" in data["detail"]

    def test_create_project_invalid_id(self, client, mock_project_data):
        """Test creating a project with invalid ID format"""
        invalid_data = mock_project_data.copy()
        invalid_data["project_id"] = "Invalid Project ID!"
        
        response = client.post("/api/projects/", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_project_success(self, client, db_session):
        """Test getting a specific project"""
        # Create a project in database
        project = Project(
            id="test-get-project",
            name="Test Get Project",
            status="active",
            initial_prompt="Test prompt",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.get("/api/projects/test-get-project")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == "test-get-project"
        assert data["name"] == "Test Get Project"
        assert data["status"] == "active"
        assert data["initial_prompt"] == "Test prompt"

    def test_get_project_not_found(self, client):
        """Test getting a non-existent project"""
        response = client.get("/api/projects/non-existent-project")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["detail"] == "Project not found"

    def test_list_projects_with_data(self, client, db_session):
        """Test listing projects when projects exist"""
        # Create test projects
        projects = [
            Project(
                id="project-1",
                name="Project 1",
                status="active",
                is_local_repo=True
            ),
            Project(
                id="project-2",
                name="Project 2",
                status="idle",
                is_local_repo=True
            )
        ]
        
        for project in projects:
            db_session.add(project)
        db_session.commit()
        
        response = client.get("/api/projects/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2
        project_ids = [p["id"] for p in data]
        assert "project-1" in project_ids
        assert "project-2" in project_ids

    def test_update_project_success(self, client, db_session):
        """Test updating a project"""
        # Create a project
        project = Project(
            id="test-update",
            name="Original Name",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        # Update the project
        update_data = {"name": "Updated Name"}
        response = client.put("/api/projects/test-update", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == "test-update"
        assert data["name"] == "Updated Name"

    def test_update_project_not_found(self, client):
        """Test updating a non-existent project"""
        update_data = {"name": "Updated Name"}
        response = client.put("/api/projects/non-existent", json=update_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["detail"] == "Project not found"

    def test_delete_project_success(self, client, db_session):
        """Test deleting a project"""
        # Create a project
        project = Project(
            id="test-delete",
            name="Test Delete",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        # Mock the cleanup function
        with patch('app.services.project.initializer.cleanup_project') as mock_cleanup:
            mock_cleanup.return_value = True
            
            response = client.delete("/api/projects/test-delete")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "deleted successfully" in data["message"]
        
        # Verify project is deleted from database
        deleted_project = db_session.query(Project).filter(Project.id == "test-delete").first()
        assert deleted_project is None

    def test_delete_project_not_found(self, client):
        """Test deleting a non-existent project"""
        response = client.delete("/api/projects/non-existent")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["detail"] == "Project not found"

    def test_install_dependencies_success(self, client, db_session):
        """Test installing project dependencies"""
        # Create a project with repo path
        project = Project(
            id="test-install",
            name="Test Install",
            repo_path="/tmp/test-project",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.post("/api/projects/test-install/install-dependencies")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["project_id"] == "test-install"
        assert "started in background" in data["message"]

    def test_install_dependencies_no_repo_path(self, client, db_session):
        """Test installing dependencies for project without repo path"""
        # Create a project without repo path
        project = Project(
            id="test-no-path",
            name="Test No Path",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.post("/api/projects/test-no-path/install-dependencies")
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "repository path not found" in data["detail"]

    def test_install_dependencies_project_not_found(self, client):
        """Test installing dependencies for non-existent project"""
        response = client.post("/api/projects/non-existent/install-dependencies")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data["detail"] == "Project not found"