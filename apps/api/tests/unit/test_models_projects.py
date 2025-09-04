"""
Unit tests for Project model
"""
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.projects import Project


@pytest.mark.unit
class TestProjectModel:
    """Test cases for the Project model"""

    def test_create_project_with_required_fields(self, db_session):
        """Test creating a project with only required fields"""
        project = Project(
            id="test-project-1",
            name="Test Project",
            is_local_repo=True
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        assert project.id == "test-project-1"
        assert project.name == "Test Project"
        assert project.status == "idle"  # default value
        assert project.is_local_repo is True
        assert project.preferred_cli == "claude"  # default value
        assert project.fallback_enabled is True  # default value
        assert isinstance(project.created_at, datetime)
        assert isinstance(project.updated_at, datetime)

    def test_create_project_with_all_fields(self, db_session):
        """Test creating a project with all fields"""
        project = Project(
            id="test-project-2",
            name="Full Test Project",
            description="A comprehensive test project",
            status="running",
            preview_url="http://localhost:3000",
            preview_port=3000,
            repo_path="/tmp/test-project",
            initial_prompt="Create a React app",
            template_type="nextjs",
            git_url="https://github.com/user/repo.git",
            branches={"main": "abc123", "dev": "def456"},
            current_branch="main",
            is_local_repo=False,
            active_claude_session_id="claude-session-123",
            active_cursor_session_id="cursor-session-456",
            preferred_cli="cursor",
            selected_model="sonnet-4",
            fallback_enabled=False,
            settings={"theme": "dark", "ai_generated": True}
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        assert project.id == "test-project-2"
        assert project.name == "Full Test Project"
        assert project.description == "A comprehensive test project"
        assert project.status == "running"
        assert project.preview_url == "http://localhost:3000"
        assert project.preview_port == 3000
        assert project.repo_path == "/tmp/test-project"
        assert project.initial_prompt == "Create a React app"
        assert project.template_type == "nextjs"
        assert project.git_url == "https://github.com/user/repo.git"
        assert project.branches == {"main": "abc123", "dev": "def456"}
        assert project.current_branch == "main"
        assert project.is_local_repo is False
        assert project.active_claude_session_id == "claude-session-123"
        assert project.active_cursor_session_id == "cursor-session-456"
        assert project.preferred_cli == "cursor"
        assert project.selected_model == "sonnet-4"
        assert project.fallback_enabled is False
        assert project.settings == {"theme": "dark", "ai_generated": True}

    def test_project_id_cannot_be_null(self, db_session):
        """Test that project ID cannot be null"""
        project = Project(
            name="Test Project",
            is_local_repo=True
        )
        
        db_session.add(project)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_project_name_cannot_be_null(self, db_session):
        """Test that project name cannot be null"""
        project = Project(
            id="test-project-3",
            is_local_repo=True
        )
        
        db_session.add(project)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_project_is_local_repo_has_default(self, db_session):
        """Test that is_local_repo has a default value"""
        project = Project(
            id="test-project-4",
            name="Test Project"
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        # Should have default value
        assert project.is_local_repo is True

    def test_duplicate_project_id_raises_error(self, db_session):
        """Test that duplicate project IDs raise an error"""
        project1 = Project(
            id="duplicate-id",
            name="Project 1",
            is_local_repo=True
        )
        project2 = Project(
            id="duplicate-id",
            name="Project 2",
            is_local_repo=True
        )
        
        db_session.add(project1)
        db_session.commit()
        
        db_session.add(project2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_project_status_defaults(self, db_session):
        """Test project status and other defaults"""
        project = Project(
            id="test-defaults",
            name="Default Test",
            is_local_repo=True
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        assert project.status == "idle"
        assert project.preferred_cli == "claude"
        assert project.fallback_enabled is True
        assert project.description is None
        assert project.preview_url is None
        assert project.git_url is None

    def test_project_json_fields(self, db_session):
        """Test JSON fields (branches, settings)"""
        project = Project(
            id="test-json",
            name="JSON Test",
            is_local_repo=True,
            branches={"main": "commit1", "feature": "commit2"},
            settings={"enabled": True, "count": 42, "data": ["a", "b", "c"]}
        )
        
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        assert project.branches == {"main": "commit1", "feature": "commit2"}
        assert project.settings == {"enabled": True, "count": 42, "data": ["a", "b", "c"]}