"""
Unit tests for database models
"""
import pytest
from sqlalchemy.orm import Session

from app.models.projects import Project


@pytest.mark.unit
@pytest.mark.models
def test_project_model_creation(test_db_session: Session):
    """Test creating a Project model instance."""
    project_data = {
        "id": "test_project_1",
        "name": "Test Project", 
        "description": "A test project",
        "status": "idle",
        "template_type": "nextjs",
        "initial_prompt": "Create a simple app"
    }
    
    project = Project(**project_data)
    test_db_session.add(project)
    test_db_session.commit()
    test_db_session.refresh(project)
    
    assert project.id == "test_project_1"
    assert project.name == "Test Project"
    assert project.status == "idle"
    assert project.template_type == "nextjs"
    assert project.is_local_repo is True  # default value


@pytest.mark.unit
@pytest.mark.models
def test_project_model_defaults(test_db_session: Session):
    """Test Project model default values."""
    project = Project(id="test_2", name="Test Project 2")
    test_db_session.add(project)
    test_db_session.commit()
    test_db_session.refresh(project)
    
    assert project.status == "idle"  # default status
    assert project.is_local_repo is True  # default value
    assert project.description is None
    assert project.preview_url is None
    assert project.preview_port is None


@pytest.mark.unit
@pytest.mark.models
def test_project_model_git_fields(test_db_session: Session):
    """Test Project model git-related fields."""
    project = Project(
        id="test_git",
        name="Git Test Project",
        git_url="https://github.com/test/repo.git",
        current_branch="main",
        is_local_repo=False,
        branches={"main": "abc123", "develop": "def456"}
    )
    
    test_db_session.add(project)
    test_db_session.commit()
    test_db_session.refresh(project)
    
    assert project.git_url == "https://github.com/test/repo.git"
    assert project.current_branch == "main"
    assert project.is_local_repo is False
    assert project.branches == {"main": "abc123", "develop": "def456"}


@pytest.mark.unit
@pytest.mark.models
def test_project_model_session_fields(test_db_session: Session):
    """Test Project model CLI session fields."""
    project = Project(
        id="test_sessions",
        name="Session Test Project",
        active_claude_session_id="claude_123",
        active_cursor_session_id="cursor_456"
    )
    
    test_db_session.add(project)
    test_db_session.commit()
    test_db_session.refresh(project)
    
    assert project.active_claude_session_id == "claude_123"
    assert project.active_cursor_session_id == "cursor_456"


@pytest.mark.unit
@pytest.mark.models
def test_project_query_by_status(test_db_session: Session):
    """Test querying projects by status."""
    # Create projects with different statuses
    projects = [
        Project(id="idle_1", name="Idle Project 1", status="idle"),
        Project(id="running_1", name="Running Project 1", status="running"),
        Project(id="idle_2", name="Idle Project 2", status="idle"),
    ]
    
    for project in projects:
        test_db_session.add(project)
    test_db_session.commit()
    
    # Query idle projects
    idle_projects = test_db_session.query(Project).filter(Project.status == "idle").all()
    assert len(idle_projects) == 2
    assert all(p.status == "idle" for p in idle_projects)
    
    # Query running projects
    running_projects = test_db_session.query(Project).filter(Project.status == "running").all()
    assert len(running_projects) == 1
    assert running_projects[0].name == "Running Project 1"