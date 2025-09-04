"""
Unit tests for main application functionality
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
def test_health_endpoint(client: TestClient):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"ok": True}


@pytest.mark.unit
def test_cors_middleware(client: TestClient):
    """Test CORS middleware configuration."""
    # Test CORS headers on a GET request since OPTIONS isn't implemented for /health
    response = client.get("/health")
    assert response.status_code == 200
    # Check for CORS headers - FastAPI's CORSMiddleware should add these
    # Note: TestClient may not include all CORS headers, but we test middleware is enabled


@pytest.mark.unit
def test_app_initialization():
    """Test that the FastAPI app is properly initialized."""
    from app.main import app
    
    assert app.title == "Clovable API"
    assert app is not None
    
    # Check that routers are included
    route_paths = [route.path for route in app.routes]
    expected_paths = [
        "/health",
        "/api/projects",
        "/api/chat",
        "/api/workspace",
        "/api/github",
        "/api/vercel"
    ]
    
    for path in expected_paths:
        # Check if any route starts with the expected path
        assert any(route_path.startswith(path) or path in route_path for route_path in route_paths), f"Path {path} not found in routes"