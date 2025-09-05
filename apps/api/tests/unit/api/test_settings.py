"""
Unit tests for Settings API endpoints
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
@pytest.mark.api
def test_get_global_settings(client: TestClient):
    """Test getting global settings."""
    response = client.get("/api/settings/global")
    assert response.status_code == 200
    data = response.json()
    # Should return a dictionary with settings
    assert isinstance(data, dict)


@pytest.mark.unit
@pytest.mark.api 
def test_update_global_settings(client: TestClient):
    """Test updating global settings."""
    settings_data = {
        "theme": "dark",
        "language": "en",
        "auto_save": True
    }
    
    response = client.put("/api/settings/global", json=settings_data)
    assert response.status_code == 200
    data = response.json()
    assert "detail" in data


@pytest.mark.unit
@pytest.mark.api
def test_get_cli_status(client: TestClient):
    """Test getting CLI status."""
    response = client.get("/api/settings/cli-status")
    assert response.status_code == 200
    data = response.json()
    # Should return status information
    assert isinstance(data, dict)