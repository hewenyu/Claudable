"""
Unit tests for Workspace API endpoints
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
@pytest.mark.api
def test_list_workspaces_empty(client: TestClient):
    """Test listing workspaces when none exist."""
    response = client.get("/api/workspace/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.unit
@pytest.mark.api
def test_get_workspace_branches_not_found(client: TestClient):
    """Test getting branches for non-existent workspace."""
    response = client.get("/api/workspace/non-existent/branches")
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_delete_workspace_not_found(client: TestClient):
    """Test deleting non-existent workspace."""
    response = client.delete("/api/workspace/non-existent")
    assert response.status_code == 404


@pytest.mark.unit
@pytest.mark.api
def test_switch_branch_workspace_not_found(client: TestClient):
    """Test switching branch for non-existent workspace."""
    branch_data = {
        "branch_name": "main"
    }
    
    response = client.post("/api/workspace/non-existent/switch-branch", json=branch_data)
    assert response.status_code == 404


# Note: Create workspace test would require actual Git repository setup
# which is better suited for integration tests