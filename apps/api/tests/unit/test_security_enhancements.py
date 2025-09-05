"""Tests for security and validation enhancements."""

import pytest
import warnings
from unittest.mock import patch, MagicMock
import os

from app.api.chat.act import ActRequest
from app.core.config import Settings


class TestSecurityEnhancements:
    """Test security and validation enhancements."""
    
    def test_cors_configuration_secure(self):
        """Test CORS configuration is secure (not wildcard)."""
        settings = Settings()
        
        # Check that wildcard is not in CORS origins
        assert "*" not in settings.cors_origins
        
        # Check that default origins are reasonable
        expected_origins = [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
        ]
        for origin in expected_origins:
            assert origin in settings.cors_origins
    
    def test_environment_validation_warns_on_missing_api_key(self):
        """Test environment validation warns when API key is missing."""
        # Test the validator directly
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            # Call the validator directly with an empty key
            result = Settings.validate_anthropic_api_key("")
            
            # Should have a warning about API key
            api_key_warnings = [warning for warning in w if "ANTHROPIC_API_KEY" in str(warning.message)]
            assert len(api_key_warnings) > 0
    
    @pytest.mark.parametrize("dangerous_instruction", [
        "rm -rf /",
        "sudo rm -rf /home",  
        "chmod 777 /etc/passwd",
        "format c:",
        "dd if=/dev/zero of=/dev/sda",
    ])
    def test_instruction_validation_blocks_dangerous_patterns(self, dangerous_instruction):
        """Test instruction validation blocks dangerous patterns."""
        with pytest.raises(ValueError) as exc_info:
            ActRequest(instruction=dangerous_instruction)
        
        assert "dangerous pattern" in str(exc_info.value).lower()
    
    def test_instruction_validation_accepts_safe_commands(self):
        """Test instruction validation accepts safe commands."""
        safe_instructions = [
            "List files in current directory",
            "Help me create a new React component", 
            "Show me the project structure",
            "Install npm dependencies",
        ]
        
        for instruction in safe_instructions:
            # Should not raise exception
            request = ActRequest(instruction=instruction)
            assert request.instruction == instruction
    
    def test_cli_preference_validation(self):
        """Test CLI preference validation."""
        # Valid CLI preferences should pass
        valid_preferences = ['claude', 'cursor', 'codex', 'qwen', 'gemini']
        
        for pref in valid_preferences:
            request = ActRequest(instruction="help me", cli_preference=pref)
            assert request.cli_preference == pref
        
        # Invalid CLI preference should fail validation
        with pytest.raises(ValueError) as exc_info:
            ActRequest(instruction="help me", cli_preference="invalid_cli")
        
        assert "Invalid CLI preference" in str(exc_info.value)
    
    def test_instruction_length_validation(self):
        """Test instruction length validation."""
        # Very long instruction should be rejected
        long_instruction = "a" * 50001
        
        with pytest.raises(ValueError) as exc_info:
            ActRequest(instruction=long_instruction)
        
        # Check that it's rejected for being too long (either custom or Pydantic message)
        error_message = str(exc_info.value).lower()
        assert "too long" in error_message or "at most" in error_message
    
    def test_empty_instruction_validation(self):
        """Test empty instruction validation."""
        empty_instructions = ["", "   ", "\n\t  "]
        
        for instruction in empty_instructions:
            with pytest.raises(ValueError) as exc_info:
                ActRequest(instruction=instruction)
            
            error_message = str(exc_info.value).lower()
            # Accept either custom validation message or Pydantic's built-in message
            assert ("cannot be empty" in error_message or 
                    "at least 1 character" in error_message or
                    "string_too_short" in error_message)
    
    def test_instruction_field_constraints(self):
        """Test instruction field constraints via Pydantic."""
        # Test minimum length constraint
        with pytest.raises(ValueError):
            ActRequest(instruction="")
        
        # Test maximum length constraint (via Field validation)
        # This will be caught by our custom validator first, but testing the constraint exists
        very_long = "x" * 50001
        with pytest.raises(ValueError):
            ActRequest(instruction=very_long)