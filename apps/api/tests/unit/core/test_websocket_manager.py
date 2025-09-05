"""
Tests for WebSocket Connection Manager
"""
import json
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import WebSocket

from app.core.websocket.manager import ConnectionManager


class TestConnectionManager:
    """Test cases for WebSocket connection manager"""

    @pytest.fixture
    def manager(self):
        """Create a connection manager instance for testing"""
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket for testing"""
        websocket = Mock(spec=WebSocket)
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.close = AsyncMock()
        return websocket

    @pytest.mark.asyncio
    async def test_connect_new_project(self, manager, mock_websocket):
        """Test connecting to a new project"""
        project_id = "test-project"
        
        await manager.connect(mock_websocket, project_id)
        
        # Verify websocket was accepted
        mock_websocket.accept.assert_called_once()
        
        # Verify connection was added
        assert project_id in manager.active_connections
        assert mock_websocket in manager.active_connections[project_id]
        assert len(manager.active_connections[project_id]) == 1

    @pytest.mark.asyncio
    async def test_connect_existing_project(self, manager, mock_websocket):
        """Test connecting additional client to existing project"""
        project_id = "test-project"
        
        # Connect first websocket
        first_websocket = Mock(spec=WebSocket)
        first_websocket.accept = AsyncMock()
        await manager.connect(first_websocket, project_id)
        
        # Connect second websocket
        await manager.connect(mock_websocket, project_id)
        
        # Verify both connections exist
        assert len(manager.active_connections[project_id]) == 2
        assert first_websocket in manager.active_connections[project_id]
        assert mock_websocket in manager.active_connections[project_id]

    def test_disconnect_existing_connection(self, manager, mock_websocket):
        """Test disconnecting an existing connection"""
        project_id = "test-project"
        
        # Set up initial connection
        manager.active_connections[project_id] = [mock_websocket]
        
        manager.disconnect(mock_websocket, project_id)
        
        # Verify connection was removed and project cleaned up
        assert project_id not in manager.active_connections

    def test_disconnect_one_of_multiple_connections(self, manager, mock_websocket):
        """Test disconnecting one connection when multiple exist"""
        project_id = "test-project"
        other_websocket = Mock(spec=WebSocket)
        
        # Set up multiple connections
        manager.active_connections[project_id] = [mock_websocket, other_websocket]
        
        manager.disconnect(mock_websocket, project_id)
        
        # Verify only the specific connection was removed
        assert project_id in manager.active_connections
        assert mock_websocket not in manager.active_connections[project_id]
        assert other_websocket in manager.active_connections[project_id]
        assert len(manager.active_connections[project_id]) == 1

    def test_disconnect_nonexistent_connection(self, manager, mock_websocket):
        """Test disconnecting a connection that doesn't exist"""
        project_id = "test-project"
        
        # Should not raise an exception
        manager.disconnect(mock_websocket, project_id)
        
        # Nothing should be in connections
        assert project_id not in manager.active_connections

    @pytest.mark.asyncio
    async def test_send_message_to_project(self, manager, mock_websocket):
        """Test sending message to all connections for a project"""
        project_id = "test-project"
        message_data = {"type": "test", "content": "Hello World"}
        
        # Set up connection
        manager.active_connections[project_id] = [mock_websocket]
        
        await manager.send_message(project_id, message_data)
        
        # Verify message was sent
        expected_message = json.dumps(message_data)
        mock_websocket.send_text.assert_called_once_with(expected_message)

    @pytest.mark.asyncio
    async def test_send_message_to_multiple_connections(self, manager):
        """Test sending message to multiple connections for a project"""
        project_id = "test-project"
        message_data = {"type": "broadcast", "content": "Hello All"}
        
        # Create multiple mock websockets
        websocket1 = Mock(spec=WebSocket)
        websocket1.send_text = AsyncMock()
        websocket2 = Mock(spec=WebSocket)
        websocket2.send_text = AsyncMock()
        
        manager.active_connections[project_id] = [websocket1, websocket2]
        
        await manager.send_message(project_id, message_data)
        
        # Verify message was sent to both connections
        expected_message = json.dumps(message_data)
        websocket1.send_text.assert_called_once_with(expected_message)
        websocket2.send_text.assert_called_once_with(expected_message)

    @pytest.mark.asyncio
    async def test_send_message_no_connections(self, manager):
        """Test sending message when no connections exist for project"""
        project_id = "test-project"
        message_data = {"type": "test", "content": "Hello"}
        
        # Should not raise an exception
        await manager.send_message(project_id, message_data)
        
        # Nothing should happen, no connections to send to

    @pytest.mark.asyncio
    async def test_send_message_failed_connection_cleanup(self, manager):
        """Test that failed connections are cleaned up during message sending"""
        project_id = "test-project"
        message_data = {"type": "test", "content": "Hello"}
        
        # Create websockets - one working, one failing
        good_websocket = Mock(spec=WebSocket)
        good_websocket.send_text = AsyncMock()
        
        bad_websocket = Mock(spec=WebSocket)
        bad_websocket.send_text = AsyncMock(side_effect=Exception("Connection failed"))
        
        manager.active_connections[project_id] = [good_websocket, bad_websocket]
        
        await manager.send_message(project_id, message_data)
        
        # Verify good connection received message
        good_websocket.send_text.assert_called_once()
        
        # Verify bad connection was removed from active connections
        assert bad_websocket not in manager.active_connections[project_id]
        assert good_websocket in manager.active_connections[project_id]