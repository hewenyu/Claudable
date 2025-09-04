"""
Unit tests for Environment Variables API
"""
import pytest
from fastapi import status

from app.models.env_vars import EnvVar
from app.models.projects import Project


@pytest.mark.integration
class TestEnvAPI:
    """Test cases for the Environment Variables API"""

    def test_get_env_vars_empty(self, client, db_session):
        """Test getting environment variables when none exist"""
        # Create a project first
        project = Project(
            id="test-project",
            name="Test Project",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.get("/api/env/test-project")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []

    def test_create_env_var_success(self, client, db_session):
        """Test creating an environment variable"""
        # Create a project first
        project = Project(
            id="test-project",
            name="Test Project",
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        env_var_data = {
            "key": "DATABASE_URL",
            "value": "postgresql://localhost:5432/test",
            "scope": "runtime",
            "var_type": "string",
            "is_secret": True,
            "description": "Database connection string"
        }
        
        response = client.post("/api/env/test-project", json=env_var_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["key"] == "DATABASE_URL"
        assert data["scope"] == "runtime"
        assert data["var_type"] == "string"
        assert data["is_secret"] is True
        assert data["description"] == "Database connection string"
        # Value should be encrypted for secrets
        assert data["value"] != "postgresql://localhost:5432/test"

    def test_create_env_var_project_not_found(self, client):
        """Test creating env var for non-existent project"""
        env_var_data = {
            "key": "TEST_VAR",
            "value": "test_value",
        }
        
        response = client.post("/api/env/nonexistent-project", json=env_var_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_env_vars_with_data(self, client, db_session):
        """Test getting environment variables when they exist"""
        # Create a project
        project = Project(
            id="test-project",
            name="Test Project", 
            is_local_repo=True
        )
        db_session.add(project)
        db_session.commit()
        
        # Create environment variables directly in database
        env_vars = [
            EnvVar(
                id="env-1",
                project_id="test-project",
                key="VAR1",
                value="value1",
                scope="runtime",
                var_type="string",
                is_secret=False
            ),
            EnvVar(
                id="env-2",
                project_id="test-project",
                key="VAR2",
                value="value2",
                scope="build",
                var_type="string", 
                is_secret=True
            )
        ]
        
        for env_var in env_vars:
            db_session.add(env_var)
        db_session.commit()
        
        response = client.get("/api/env/test-project")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2
        keys = [item["key"] for item in data]
        assert "VAR1" in keys
        assert "VAR2" in keys

    def test_update_env_var_success(self, client, db_session):
        """Test updating an environment variable"""
        # Create project and env var
        project = Project(
            id="test-project",
            name="Test Project",
            is_local_repo=True
        )
        db_session.add(project)
        
        env_var = EnvVar(
            id="env-1",
            project_id="test-project",
            key="TEST_VAR",
            value="old_value",
            scope="runtime",
            var_type="string",
            is_secret=False
        )
        db_session.add(env_var)
        db_session.commit()
        
        update_data = {"value": "new_value"}
        response = client.put("/api/env/test-project/env-1", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["value"] == "new_value"

    def test_delete_env_var_success(self, client, db_session):
        """Test deleting an environment variable"""
        # Create project and env var
        project = Project(
            id="test-project",
            name="Test Project",
            is_local_repo=True
        )
        db_session.add(project)
        
        env_var = EnvVar(
            id="env-1",
            project_id="test-project",
            key="TEST_VAR",
            value="test_value",
            scope="runtime",
            var_type="string",
            is_secret=False
        )
        db_session.add(env_var)
        db_session.commit()
        
        response = client.delete("/api/env/test-project/env-1")
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify it's deleted
        deleted_env_var = db_session.query(EnvVar).filter(EnvVar.id == "env-1").first()
        assert deleted_env_var is None

    def test_delete_env_var_not_found(self, client):
        """Test deleting non-existent environment variable"""
        response = client.delete("/api/env/test-project/nonexistent-env")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND