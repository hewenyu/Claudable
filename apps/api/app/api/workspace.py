"""
Git Project Workspace API
Links Claudable projects with local Git repositories and manages workspace sessions
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.projects import Project as ProjectModel
from app.api.git_projects import get_git_info
from pathlib import Path
from app.core.config import settings


router = APIRouter(prefix="/api/workspace", tags=["workspace"])


class WorkspaceProject(BaseModel):
    """A Claudable project linked to a local Git repository"""
    id: str
    name: str
    local_git_project_name: str
    local_git_project_path: str
    current_branch: str
    available_branches: List[str]
    git_url: Optional[str] = None
    last_active_at: Optional[datetime] = None
    created_at: datetime


class WorkspaceCreateRequest(BaseModel):
    """Request to create a new workspace from a local Git project"""
    local_git_project_name: str
    branch_name: str
    workspace_name: Optional[str] = None


@router.get("/", response_model=List[WorkspaceProject])
async def list_workspaces(db: Session = Depends(get_db)) -> List[WorkspaceProject]:
    """List all workspaces (Claudable projects linked to local Git repos)"""
    
    projects = db.query(ProjectModel).filter(
        ProjectModel.local_git_project_name.isnot(None)
    ).all()
    
    workspaces = []
    for project in projects:
        if not project.local_git_project_name:
            continue
            
        # Get current Git info
        project_path = Path(settings.local_git_projects_root).expanduser() / project.local_git_project_name
        if project_path.exists():
            git_info = get_git_info(str(project_path))
            
            workspace = WorkspaceProject(
                id=project.id,
                name=project.name,
                local_git_project_name=project.local_git_project_name,
                local_git_project_path=str(project_path),
                current_branch=project.current_branch or git_info.get("current_branch", "main"),
                available_branches=git_info.get("branches", []),
                git_url=git_info.get("remote_url"),
                last_active_at=project.last_active_at,
                created_at=project.created_at
            )
            workspaces.append(workspace)
    
    return workspaces


@router.post("/create", response_model=WorkspaceProject)
async def create_workspace(
    request: WorkspaceCreateRequest,
    db: Session = Depends(get_db)
) -> WorkspaceProject:
    """Create a new workspace linked to a local Git project and branch"""
    
    # Verify the local Git project exists
    project_path = Path(settings.local_git_projects_root).expanduser() / request.local_git_project_name
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Local Git project not found")
    
    if not project_path.joinpath(".git").exists():
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    # Get Git info
    git_info = get_git_info(str(project_path))
    if not git_info.get("is_git"):
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    # Verify branch exists
    available_branches = git_info.get("branches", [])
    if request.branch_name not in available_branches:
        raise HTTPException(
            status_code=400, 
            detail=f"Branch '{request.branch_name}' not found. Available branches: {available_branches}"
        )
    
    # Check if workspace already exists for this project + branch
    existing = db.query(ProjectModel).filter(
        ProjectModel.local_git_project_name == request.local_git_project_name,
        ProjectModel.current_branch == request.branch_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Workspace already exists for {request.local_git_project_name}:{request.branch_name}"
        )
    
    # Create workspace name
    workspace_name = request.workspace_name or f"{request.local_git_project_name} ({request.branch_name})"
    
    # Generate unique project ID
    import uuid
    project_id = f"workspace-{uuid.uuid4().hex[:12]}"
    
    # Create new project record
    project = ProjectModel(
        id=project_id,
        name=workspace_name,
        local_git_project_name=request.local_git_project_name,
        local_git_project_path=str(project_path),
        current_branch=request.branch_name,
        git_url=git_info.get("remote_url"),
        branches={"all": available_branches, "current": request.branch_name},
        is_local_repo=False,  # This is a workspace, not a standard Claudable project
        status="active",
        created_at=datetime.utcnow(),
        preferred_cli="claude",  # Default
        selected_model="claude-sonnet-4"  # Default
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return WorkspaceProject(
        id=project.id,
        name=project.name,
        local_git_project_name=project.local_git_project_name,
        local_git_project_path=project.local_git_project_path,
        current_branch=project.current_branch,
        available_branches=available_branches,
        git_url=project.git_url,
        last_active_at=project.last_active_at,
        created_at=project.created_at
    )


@router.post("/{workspace_id}/switch-branch")
async def switch_workspace_branch(
    workspace_id: str,
    branch_name: str,
    db: Session = Depends(get_db)
):
    """Switch workspace to a different branch"""
    
    project = db.query(ProjectModel).filter(ProjectModel.id == workspace_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if not project.local_git_project_name:
        raise HTTPException(status_code=400, detail="Not a Git workspace")
    
    # Verify branch exists
    project_path = Path(project.local_git_project_path)
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Local Git project path not found")
    
    git_info = get_git_info(str(project_path))
    available_branches = git_info.get("branches", [])
    
    if branch_name not in available_branches:
        raise HTTPException(
            status_code=400,
            detail=f"Branch '{branch_name}' not found. Available branches: {available_branches}"
        )
    
    # Update workspace branch
    project.current_branch = branch_name
    project.branches = {"all": available_branches, "current": branch_name}
    project.last_active_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"Workspace switched to branch '{branch_name}'",
        "workspace_id": workspace_id,
        "branch": branch_name
    }


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, db: Session = Depends(get_db)):
    """Delete a workspace (does not delete the underlying Git project)"""
    
    project = db.query(ProjectModel).filter(ProjectModel.id == workspace_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if not project.local_git_project_name:
        raise HTTPException(status_code=400, detail="Not a Git workspace")
    
    # Delete the workspace project (this will cascade delete messages, etc.)
    db.delete(project)
    db.commit()
    
    return {"message": f"Workspace '{workspace_id}' deleted successfully"}