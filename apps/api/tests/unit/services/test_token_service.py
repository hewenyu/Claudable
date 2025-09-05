"""
Unit tests for Token Service
"""
import pytest
from sqlalchemy.orm import Session

from app.services.token_service import (
    save_service_token,
    get_service_token,
    get_token
)
from app.models.tokens import ServiceToken


@pytest.mark.unit
@pytest.mark.services
def test_save_service_token(test_db_session: Session):
    """Test saving a new service token."""
    token = save_service_token(
        db=test_db_session,
        provider="github",
        token="ghp_test_token_123",
        name="GitHub Token"
    )
    
    assert token.provider == "github"
    assert token.token == "ghp_test_token_123"
    assert token.name == "GitHub Token"
    assert token.id is not None
    assert token.created_at is not None


@pytest.mark.unit
@pytest.mark.services
def test_save_service_token_replaces_existing(test_db_session: Session):
    """Test that saving a new token replaces existing token for same provider."""
    # Save first token
    token1 = save_service_token(
        db=test_db_session,
        provider="github",
        token="old_token",
        name="Old GitHub Token"
    )
    
    # Save second token for same provider
    token2 = save_service_token(
        db=test_db_session,
        provider="github",
        token="new_token", 
        name="New GitHub Token"
    )
    
    # Should be different tokens
    assert token1.id != token2.id
    
    # Only the new token should exist
    all_tokens = test_db_session.query(ServiceToken).filter_by(provider="github").all()
    assert len(all_tokens) == 1
    assert all_tokens[0].token == "new_token"
    assert all_tokens[0].name == "New GitHub Token"


@pytest.mark.unit
@pytest.mark.services
def test_get_service_token_exists(test_db_session: Session):
    """Test getting an existing service token."""
    # Save a token first
    saved_token = save_service_token(
        db=test_db_session,
        provider="vercel",
        token="vercel_token_123",
        name="Vercel Token"
    )
    
    # Retrieve the token
    retrieved_token = get_service_token(test_db_session, "vercel")
    
    assert retrieved_token is not None
    assert retrieved_token.id == saved_token.id
    assert retrieved_token.provider == "vercel"
    assert retrieved_token.token == "vercel_token_123"
    assert retrieved_token.name == "Vercel Token"


@pytest.mark.unit
@pytest.mark.services
def test_get_service_token_not_exists(test_db_session: Session):
    """Test getting a non-existent service token."""
    token = get_service_token(test_db_session, "nonexistent")
    assert token is None


@pytest.mark.unit
@pytest.mark.services
def test_get_token_plain_text_exists(test_db_session: Session):
    """Test getting plain text token for existing provider."""
    # Save a token first
    save_service_token(
        db=test_db_session,
        provider="test_provider",
        token="plain_text_token_123",
        name="Test Token"
    )
    
    # Get plain text token
    token = get_token(test_db_session, "test_provider")
    
    assert token == "plain_text_token_123"


@pytest.mark.unit
@pytest.mark.services
def test_get_token_plain_text_not_exists(test_db_session: Session):
    """Test getting plain text token for non-existent provider."""
    token = get_token(test_db_session, "nonexistent")
    assert token is None


@pytest.mark.unit
@pytest.mark.services
def test_multiple_providers(test_db_session: Session):
    """Test managing tokens for multiple providers."""
    # Save tokens for different providers
    github_token = save_service_token(
        db=test_db_session,
        provider="github",
        token="github_token",
        name="GitHub Token"
    )
    
    vercel_token = save_service_token(
        db=test_db_session,
        provider="vercel",
        token="vercel_token",
        name="Vercel Token"
    )
    
    # Verify both tokens exist independently
    assert get_token(test_db_session, "github") == "github_token"
    assert get_token(test_db_session, "vercel") == "vercel_token"
    
    # Verify we can get the full token objects
    github_obj = get_service_token(test_db_session, "github")
    vercel_obj = get_service_token(test_db_session, "vercel")
    
    assert github_obj.name == "GitHub Token"
    assert vercel_obj.name == "Vercel Token"