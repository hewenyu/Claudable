"""
Unit tests for GitHub service
"""
from unittest.mock import AsyncMock, patch

import pytest
import httpx

from app.services.github_service import GitHubService, GitHubAPIError


@pytest.mark.unit
class TestGitHubService:
    """Test cases for the GitHub service"""

    def test_github_service_initialization(self, mock_github_token):
        """Test GitHub service initialization"""
        service = GitHubService(mock_github_token)
        
        assert service.token == mock_github_token
        assert service.BASE_URL == "https://api.github.com"
        assert service.headers["Authorization"] == f"token {mock_github_token}"
        assert service.headers["Accept"] == "application/vnd.github.v3+json"
        assert service.headers["User-Agent"] == "Clovable/1.0"

    @pytest.mark.asyncio
    async def test_check_token_validity_success(self, mock_github_token, mock_user_info):
        """Test successful token validation"""
        mock_response_json = {
            "login": "testuser",
            "name": "Test User", 
            "email": "test@example.com",
            "avatar_url": "https://avatars.githubusercontent.com/u/12345"
        }
        
        with patch("app.services.github_service.httpx.AsyncClient") as mock_client:
            # Create a mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_json
            
            # Create a mock async context manager
            mock_context = AsyncMock()
            mock_context.get.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_client.return_value.__aexit__.return_value = None
            
            service = GitHubService(mock_github_token)
            result = await service.check_token_validity()
            
            assert result["valid"] is True
            assert result["username"] == "testuser"
            assert result["name"] == "Test User"
            assert result["email"] == "test@example.com"
            assert result["avatar_url"] == "https://avatars.githubusercontent.com/u/12345"

    @pytest.mark.asyncio
    async def test_check_token_validity_invalid_token(self, mock_github_token):
        """Test token validation with invalid token"""
        mock_response = AsyncMock()
        mock_response.status_code = 401
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_token_validity()
            
            assert result["valid"] is False
            assert result["error"] == "Invalid or expired token"

    @pytest.mark.asyncio
    async def test_check_token_validity_api_error(self, mock_github_token):
        """Test token validation with API error"""
        mock_response = AsyncMock()
        mock_response.status_code = 500
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_token_validity()
            
            assert result["valid"] is False
            assert "GitHub API error: 500" in result["error"]

    @pytest.mark.asyncio
    async def test_check_token_validity_network_error(self, mock_github_token):
        """Test token validation with network error"""
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(side_effect=httpx.RequestError("Network error"))
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_token_validity()
            
            assert result["valid"] is False
            assert "Network error" in result["error"]

    @pytest.mark.asyncio
    async def test_check_repository_exists_true(self, mock_github_token):
        """Test checking if repository exists (returns True)"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_repository_exists("test-repo", "testuser")
            
            assert result is True

    @pytest.mark.asyncio
    async def test_check_repository_exists_false(self, mock_github_token):
        """Test checking if repository exists (returns False)"""
        mock_response = AsyncMock()
        mock_response.status_code = 404
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_repository_exists("nonexistent-repo", "testuser")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_check_repository_exists_network_error(self, mock_github_token):
        """Test checking repository existence with network error"""
        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_context.get = AsyncMock(side_effect=httpx.RequestError("Network error"))
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)
            
            service = GitHubService(mock_github_token)
            result = await service.check_repository_exists("test-repo", "testuser")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_create_repository_invalid_token(self, mock_github_token):
        """Test creating repository with invalid token"""
        # Mock check_token_validity to return invalid token
        with patch.object(GitHubService, 'check_token_validity') as mock_check:
            mock_check.return_value = {"valid": False, "error": "Invalid token"}
            
            service = GitHubService(mock_github_token)
            
            with pytest.raises(GitHubAPIError) as exc_info:
                await service.create_repository("test-repo")
            
            assert exc_info.value.status_code == 401
            assert "Invalid GitHub token" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_repository_already_exists(self, mock_github_token, mock_user_info):
        """Test creating repository that already exists"""
        # Mock successful token validation
        with patch.object(GitHubService, 'check_token_validity') as mock_check:
            mock_check.return_value = mock_user_info
            
            # Mock repository exists check
            with patch.object(GitHubService, 'check_repository_exists') as mock_exists:
                mock_exists.return_value = True
                
                service = GitHubService(mock_github_token)
                
                with pytest.raises(GitHubAPIError) as exc_info:
                    await service.create_repository("existing-repo")
                
                assert exc_info.value.status_code == 409
                assert "already exists" in str(exc_info.value)