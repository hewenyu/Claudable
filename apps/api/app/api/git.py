from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
from app.core.config import settings
from app.api.deps import get_db
from sqlalchemy.orm import Session
from app.models.projects import Project as ProjectModel
from app.services.git_ops import (
    get_status, get_file_diff, stage_file, unstage_file, 
    discard_changes, stage_all, unstage_all, commit_staged
)

router = APIRouter(prefix="/api/git", tags=["git"])


class GitStatus(BaseModel):
    modified: List[str]
    staged: List[str]
    untracked: List[str]


class GitOperation(BaseModel):
    success: bool
    error: Optional[str] = None


class StageFileRequest(BaseModel):
    file_path: str


class CommitRequest(BaseModel):
    message: str


@router.get("/{project_id}/status", response_model=GitStatus)
async def get_git_status(project_id: str, db: Session = Depends(get_db)) -> GitStatus:
    """Get Git status for the project"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    status = get_status(repo)
    return GitStatus(**status)


@router.get("/{project_id}/diff/{file_path:path}")
async def get_git_diff(
    project_id: str, 
    file_path: str, 
    staged: bool = False,
    db: Session = Depends(get_db)
):
    """Get diff for a specific file"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    diff = get_file_diff(repo, file_path, staged)
    return {"diff": diff, "file_path": file_path, "staged": staged}


@router.post("/{project_id}/stage")
async def stage_file_endpoint(
    project_id: str,
    request: StageFileRequest,
    db: Session = Depends(get_db)
):
    """Stage a specific file"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = stage_file(repo, request.file_path)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"success": True}


@router.post("/{project_id}/unstage")
async def unstage_file_endpoint(
    project_id: str,
    request: StageFileRequest,
    db: Session = Depends(get_db)
):
    """Unstage a specific file"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = unstage_file(repo, request.file_path)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"success": True}


@router.post("/{project_id}/discard")
async def discard_changes_endpoint(
    project_id: str,
    request: StageFileRequest,
    db: Session = Depends(get_db)
):
    """Discard changes for a specific file"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = discard_changes(repo, request.file_path)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"success": True}


@router.post("/{project_id}/stage-all")
async def stage_all_endpoint(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Stage all changes"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = stage_all(repo)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"success": True}


@router.post("/{project_id}/unstage-all")
async def unstage_all_endpoint(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Unstage all changes"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = unstage_all(repo)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"success": True}


@router.post("/{project_id}/commit")
async def commit_staged_endpoint(
    project_id: str,
    request: CommitRequest,
    db: Session = Depends(get_db)
):
    """Commit staged changes"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repo = os.path.join(settings.projects_root, project_id, "repo")
    if not os.path.exists(repo):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    result = commit_staged(repo, request.message)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {
        "success": True,
        "commit_hash": result["commit_hash"],
        "message": result["message"]
    }