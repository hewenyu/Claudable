"""Tests for CLI base class enhancements."""

import pytest
import asyncio
from unittest.mock import AsyncMock

from app.services.cli.base import BaseCLI, CLIType, CLIError, CLIErrorType


class MockCLI(BaseCLI):
    """Mock CLI implementation for testing."""
    
    def __init__(self):
        super().__init__(CLIType.CLAUDE)
    
    async def check_availability(self):
        return {"available": True, "configured": True}
    
    async def execute_with_streaming(self, instruction, project_path, **kwargs):
        yield {"test": "message"}
    
    async def get_session_id(self, project_id):
        return "test-session"
    
    async def set_session_id(self, project_id, session_id):
        pass


@pytest.mark.asyncio
class TestCLIBaseEnhancements:
    """Test enhanced CLI base functionality."""
    
    async def test_instruction_validation_valid(self):
        """Test valid instruction passes validation."""
        cli = MockCLI()
        # Should not raise exception
        cli.validate_instruction("List files in current directory")
    
    async def test_instruction_validation_empty(self):
        """Test empty instruction is rejected."""
        cli = MockCLI()
        
        with pytest.raises(CLIError) as exc_info:
            cli.validate_instruction("")
        
        assert exc_info.value.error_type == CLIErrorType.VALIDATION_ERROR
        assert "cannot be empty" in str(exc_info.value)
    
    async def test_instruction_validation_dangerous_pattern(self):
        """Test dangerous patterns are rejected."""
        cli = MockCLI()
        
        dangerous_commands = [
            "rm -rf /",
            "sudo rm -rf /home",
            "chmod 777 /etc/passwd",
            "format c:",
        ]
        
        for cmd in dangerous_commands:
            with pytest.raises(CLIError) as exc_info:
                cli.validate_instruction(cmd)
            
            assert exc_info.value.error_type == CLIErrorType.VALIDATION_ERROR
            assert "dangerous pattern" in str(exc_info.value).lower()
    
    async def test_instruction_validation_too_long(self):
        """Test overly long instructions are rejected."""
        cli = MockCLI()
        
        # Create instruction longer than 50KB
        long_instruction = "a" * 50001
        
        with pytest.raises(CLIError) as exc_info:
            cli.validate_instruction(long_instruction)
        
        assert exc_info.value.error_type == CLIErrorType.VALIDATION_ERROR
        assert "too long" in str(exc_info.value)
    
    async def test_execute_with_retry_success(self):
        """Test retry mechanism with successful operation."""
        cli = MockCLI()
        
        async def mock_operation():
            return "success"
        
        result = await cli.execute_with_retry(mock_operation, max_retries=3)
        assert result == "success"
    
    async def test_execute_with_retry_cli_error_retries(self):
        """Test retry mechanism with retryable CLI errors."""
        cli = MockCLI()
        call_count = 0
        
        async def mock_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise CLIError(CLIErrorType.CONNECTION_ERROR, "Connection failed")
            return "success"
        
        result = await cli.execute_with_retry(mock_operation, max_retries=3)
        assert result == "success"
        assert call_count == 3
    
    async def test_execute_with_retry_auth_error_no_retry(self):
        """Test authentication errors are not retried."""
        cli = MockCLI()
        
        async def mock_operation():
            raise CLIError(CLIErrorType.AUTHENTICATION_ERROR, "Auth failed")
        
        with pytest.raises(CLIError) as exc_info:
            await cli.execute_with_retry(mock_operation, max_retries=3)
        
        assert exc_info.value.error_type == CLIErrorType.AUTHENTICATION_ERROR
    
    async def test_track_performance_context_manager(self):
        """Test performance tracking context manager."""
        cli = MockCLI()
        
        async with cli.track_performance("test operation"):
            # Simulate some work
            await asyncio.sleep(0.01)
        
        # Should complete without error
        assert True