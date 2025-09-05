"""
Git Source Control API
Handles Git source control operations like status, staging, commit, push for projects
Similar to VS Code's source control interface
"""

import os
import subprocess
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.projects import Project as ProjectModel
from app.services.git_ops import (
    _run, list_commits, commit_all, push_to_remote, 
    get_current_branch, get_remote_url
)

router = APIRouter(prefix="/api/projects", tags=["git-source-control"])


class GitFileStatus(BaseModel):
    """Represents the status of a file in Git"""
    path: str
    status: str  # 'M' (modified), 'A' (added), 'D' (deleted), 'R' (renamed), 'U' (untracked), 'S' (staged)
    staged: bool
    
    
class GitStatusResponse(BaseModel):
    """Git status response"""
    current_branch: str
    remote_url: Optional[str] = None
    ahead: int = 0  # commits ahead of remote
    behind: int = 0  # commits behind remote
    has_changes: bool = False
    modified_files: List[GitFileStatus] = []
    staged_files: List[GitFileStatus] = []
    untracked_files: List[GitFileStatus] = []


class GitCommitRequest(BaseModel):
    """Request to commit changes"""
    message: str
    files: Optional[List[str]] = None  # Specific files to commit, None for all staged


class GitStageRequest(BaseModel):
    """Request to stage/unstage files"""
    files: List[str]
    unstage: bool = False


def run_git_command(cwd: str, *args) -> tuple[bool, str]:
    """Run a git command and return success status and output"""
    try:
        result = subprocess.run(
            ["git"] + list(args),
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0, result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
    except subprocess.TimeoutExpired:
        return False, "Git command timed out"
    except Exception as e:
        return False, str(e)


def get_git_status(repo_path: str) -> GitStatusResponse:
    """Get comprehensive Git status information"""
    # Check if it's a Git repository
    if not os.path.exists(os.path.join(repo_path, ".git")):
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    # Get current branch
    current_branch = get_current_branch(repo_path)
    
    # Get remote URL
    remote_url = get_remote_url(repo_path)
    
    # Get status with porcelain format for easier parsing
    success, status_output = run_git_command(repo_path, "status", "--porcelain")
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to get Git status: {status_output}")
    
    modified_files = []
    staged_files = []
    untracked_files = []
    
    # Parse git status output
    for line in status_output.split('\n'):
        if not line.strip():
            continue
            
        # First two characters indicate index and working tree status
        index_status = line[0] if len(line) > 0 else ' '
        worktree_status = line[1] if len(line) > 1 else ' '
        file_path = line[3:] if len(line) > 3 else ''
        
        # Handle rename cases (contains " -> ")
        if " -> " in file_path:
            file_path = file_path.split(" -> ")[1]  # Use new name
        
        # Determine file status
        if index_status != ' ':
            # File is staged
            status_char = index_status
            staged = True
            staged_files.append(GitFileStatus(
                path=file_path,
                status=status_char,
                staged=True
            ))
        
        if worktree_status != ' ':
            # File has working tree changes
            status_char = worktree_status
            if worktree_status == '?':
                # Untracked file
                untracked_files.append(GitFileStatus(
                    path=file_path,
                    status='U',  # Untracked
                    staged=False
                ))
            else:
                # Modified file
                modified_files.append(GitFileStatus(
                    path=file_path,
                    status=status_char,
                    staged=False
                ))
    
    # Get ahead/behind information
    ahead = 0
    behind = 0
    if remote_url:
        try:
            # Fetch latest info (silently)
            run_git_command(repo_path, "fetch", "--quiet")
            
            # Get ahead count
            success, ahead_output = run_git_command(repo_path, "rev-list", "--count", f"origin/{current_branch}..HEAD")
            if success:
                ahead = int(ahead_output.strip()) if ahead_output.strip().isdigit() else 0
            
            # Get behind count 
            success, behind_output = run_git_command(repo_path, "rev-list", "--count", f"HEAD..origin/{current_branch}")
            if success:
                behind = int(behind_output.strip()) if behind_output.strip().isdigit() else 0
        except:
            # Ignore errors for ahead/behind calculation
            pass
    
    has_changes = len(modified_files) > 0 or len(staged_files) > 0 or len(untracked_files) > 0
    
    return GitStatusResponse(
        current_branch=current_branch,
        remote_url=remote_url,
        ahead=ahead,
        behind=behind,
        has_changes=has_changes,
        modified_files=modified_files,
        staged_files=staged_files,
        untracked_files=untracked_files
    )


@router.get("/{project_id}/git/status", response_model=GitStatusResponse)
async def get_project_git_status(project_id: str, db: Session = Depends(get_db)):
    """Get Git status for a project"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    return get_git_status(repo_path)


@router.get("/{project_id}/git/history")
async def get_project_git_history(project_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Get Git commit history for a project"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        commits = list_commits(repo_path, limit)
        return {"commits": commits}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get commit history: {str(e)}")


@router.post("/{project_id}/git/stage")
async def stage_files(project_id: str, request: GitStageRequest, db: Session = Depends(get_db)):
    """Stage or unstage files"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        if request.unstage:
            # Unstage files
            for file_path in request.files:
                success, output = run_git_command(repo_path, "reset", "HEAD", file_path)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to unstage {file_path}: {output}")
        else:
            # Stage files
            for file_path in request.files:
                success, output = run_git_command(repo_path, "add", file_path)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to stage {file_path}: {output}")
        
        return {"message": f"Successfully {'unstaged' if request.unstage else 'staged'} {len(request.files)} file(s)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stage operation failed: {str(e)}")


@router.post("/{project_id}/git/commit")
async def commit_changes(project_id: str, request: GitCommitRequest, db: Session = Depends(get_db)):
    """Commit staged changes"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        if request.files:
            # Stage specific files first
            for file_path in request.files:
                success, output = run_git_command(repo_path, "add", file_path)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to stage {file_path}: {output}")
        
        # Commit the changes
        result = commit_all(repo_path, request.message)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Commit failed: {result.get('error', 'Unknown error')}")
        
        return {
            "message": "Commit successful",
            "commit_hash": result["commit_hash"],
            "commit_message": request.message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Commit failed: {str(e)}")


@router.post("/{project_id}/git/push")
async def push_to_remote_endpoint(project_id: str, db: Session = Depends(get_db)):
    """Push commits to remote repository"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    # Get current branch
    current_branch = get_current_branch(repo_path)
    
    try:
        result = push_to_remote(repo_path, "origin", current_branch)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Push failed: {result.get('error', 'Unknown error')}")
        
        return {
            "message": "Push successful",
            "remote": result["remote"],
            "branch": result["branch"],
            "output": result.get("output", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Push failed: {str(e)}")


@router.get("/{project_id}/git/diff/{file_path:path}")
async def get_file_diff(project_id: str, file_path: str, staged: bool = False, db: Session = Depends(get_db)):
    """Get diff for a specific file"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        if staged:
            # Get diff for staged changes
            success, diff_output = run_git_command(repo_path, "diff", "--cached", file_path)
        else:
            # Get diff for working tree changes
            success, diff_output = run_git_command(repo_path, "diff", file_path)
        
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to get diff: {diff_output}")
        
        return {"diff": diff_output, "file_path": file_path, "staged": staged}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get diff: {str(e)}")


@router.post("/{project_id}/git/discard")
async def discard_changes(project_id: str, request: GitStageRequest, db: Session = Depends(get_db)):
    """Discard changes in working directory for specific files"""
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use the actual repo_path from the database
    repo_path = row.repo_path
    if not repo_path or not os.path.exists(repo_path):
        # Fallback to old structure for backward compatibility
        fallback_path = os.path.join(settings.projects_root, project_id, "repo")
        if os.path.exists(fallback_path):
            repo_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    try:
        for file_path in request.files:
            # Check if file is tracked
            success, _ = run_git_command(repo_path, "ls-files", "--error-unmatch", file_path)
            if success:
                # File is tracked, restore from HEAD
                success, output = run_git_command(repo_path, "checkout", "HEAD", "--", file_path)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to discard changes for {file_path}: {output}")
            else:
                # File is untracked, just delete it
                file_full_path = os.path.join(repo_path, file_path)
                if os.path.exists(file_full_path):
                    os.remove(file_full_path)
        
        return {"message": f"Successfully discarded changes for {len(request.files)} file(s)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discard operation failed: {str(e)}")