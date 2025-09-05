"""
Tests for the CLI Session Manager service
"""
from unittest.mock import Mock

import pytest
from sqlalchemy.orm import Session

from app.models.projects import Project
from app.services.cli.base import CLIType
from app.services.cli_session_manager import CLISessionManager


class TestCLISessionManager:
    """Test cases for CLI session manager"""

    def test_get_session_id_from_cache(self, test_db_session: Session):
        """Test getting session ID from cache"""
        manager = CLISessionManager(test_db_session)
        
        # Set up cache
        manager._session_cache = {
            "test-project": {
                CLIType.CLAUDE: "claude-session-123"
            }
        }
        
        result = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert result == "claude-session-123"

    def test_get_session_id_from_database(self, test_db_session: Session):
        """Test getting session ID from database when not in cache"""
        # Create test project with session ID
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id="claude-session-db",
            active_cursor_session_id="cursor-session-db"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        # Test Claude session
        result = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert result == "claude-session-db"
        
        # Test Cursor session
        result = manager.get_session_id("test-project", CLIType.CURSOR)
        assert result == "cursor-session-db"
        
        # Verify cache was updated
        assert manager._session_cache["test-project"][CLIType.CLAUDE] == "claude-session-db"
        assert manager._session_cache["test-project"][CLIType.CURSOR] == "cursor-session-db"

    def test_get_session_id_project_not_found(self, test_db_session: Session):
        """Test getting session ID for non-existent project"""
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_session_id("non-existent-project", CLIType.CLAUDE)
        assert result is None

    def test_get_session_id_no_session_stored(self, test_db_session: Session):
        """Test getting session ID when project has no session stored"""
        # Create project without session IDs
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id=None,
            active_cursor_session_id=None
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert result is None

    def test_set_session_id_success(self, test_db_session: Session):
        """Test setting session ID successfully"""
        # Create test project
        project = Project(
            id="test-project",
            name="Test Project"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        # Set Claude session
        result = manager.set_session_id("test-project", CLIType.CLAUDE, "new-claude-session")
        assert result is True
        
        # Verify it was saved to database
        updated_project = test_db_session.get(Project, "test-project")
        assert updated_project.active_claude_session_id == "new-claude-session"
        
        # Verify cache was updated
        assert manager._session_cache["test-project"][CLIType.CLAUDE] == "new-claude-session"

    def test_set_session_id_project_not_found(self, test_db_session: Session):
        """Test setting session ID for non-existent project"""
        manager = CLISessionManager(test_db_session)
        
        result = manager.set_session_id("non-existent", CLIType.CLAUDE, "session-123")
        assert result is False

    def test_clear_session_success(self, test_db_session: Session):
        """Test clearing session successfully"""
        # Create project with session
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id="claude-session-to-clear"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        # Set up cache
        manager._session_cache = {
            "test-project": {
                CLIType.CLAUDE: "claude-session-to-clear"
            }
        }
        
        result = manager.clear_session_id("test-project", CLIType.CLAUDE)
        assert result is True
        
        # Verify session was cleared in database
        updated_project = test_db_session.get(Project, "test-project")
        assert updated_project.active_claude_session_id is None
        
        # Verify cache was cleared
        assert manager._session_cache["test-project"][CLIType.CLAUDE] is None

    def test_clear_session_project_not_found(self, test_db_session: Session):
        """Test clearing session for non-existent project"""
        manager = CLISessionManager(test_db_session)
        
        result = manager.clear_session_id("non-existent", CLIType.CLAUDE)
        assert result is False

    def test_has_active_session_true(self, test_db_session: Session):
        """Test checking for active session when it exists"""
        # Create project with session
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id="active-session"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert result == "active-session"

    def test_has_active_session_false(self, test_db_session: Session):
        """Test checking for active session when it doesn't exist"""
        # Create project without session
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id=None
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert result is None

    def test_get_all_sessions(self, test_db_session: Session):
        """Test getting all sessions for a project"""
        # Create project with multiple sessions
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id="claude-session",
            active_cursor_session_id="cursor-session"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_all_sessions("test-project")
        expected = {
            CLIType.CLAUDE: "claude-session",
            CLIType.CURSOR: "cursor-session"
        }
        assert result == expected

    def test_get_all_sessions_project_not_found(self, test_db_session: Session):
        """Test getting all sessions for non-existent project"""
        manager = CLISessionManager(test_db_session)
        
        result = manager.get_all_sessions("non-existent")
        assert result == {}

    def test_cache_invalidation(self, test_db_session: Session):
        """Test that cache is properly invalidated when sessions are updated"""
        # Create project
        project = Project(
            id="test-project",
            name="Test Project",
            active_claude_session_id="initial-session"
        )
        test_db_session.add(project)
        test_db_session.commit()
        
        manager = CLISessionManager(test_db_session)
        
        # Get session to populate cache
        session_id = manager.get_session_id("test-project", CLIType.CLAUDE)
        assert session_id == "initial-session"
        
        # Update session
        manager.set_session_id("test-project", CLIType.CLAUDE, "updated-session")
        
        # Verify cache was updated
        cached_session = manager._session_cache["test-project"][CLIType.CLAUDE]
        assert cached_session == "updated-session"
        
        # Clear session
        manager.clear_session_id("test-project", CLIType.CLAUDE)
        
        # Verify cache was cleared
        cached_session = manager._session_cache["test-project"][CLIType.CLAUDE]
        assert cached_session is None