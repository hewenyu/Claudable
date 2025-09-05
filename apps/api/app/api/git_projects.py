"""
Git Projects Management API
Handles local Git project operations like listing, cloning, and Git operations
"""

import os
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.projects import Project as ProjectModel


router = APIRouter(prefix="/api/git-projects", tags=["git-projects"])


class GitProject(BaseModel):
    """Represents a local Git project"""
    name: str
    path: str
    is_git: bool
    current_branch: Optional[str] = None
    branches: List[str] = []
    remote_url: Optional[str] = None
    last_commit: Optional[str] = None
    last_modified: Optional[datetime] = None


class GitBranch(BaseModel):
    """Represents a Git branch"""
    name: str
    is_current: bool
    is_remote: bool
    last_commit: Optional[str] = None


class CloneRequest(BaseModel):
    """Request to clone a Git repository"""
    git_url: str
    project_name: Optional[str] = None


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


def get_git_info(project_path: str) -> Dict[str, Any]:
    """Get Git information for a project"""
    if not os.path.exists(os.path.join(project_path, ".git")):
        return {"is_git": False}
    
    info = {"is_git": True}
    
    # Get current branch
    success, output = run_git_command(project_path, "branch", "--show-current")
    if success:
        info["current_branch"] = output
    
    # Get all branches
    success, output = run_git_command(project_path, "branch", "-a")
    if success:
        branches = []
        for line in output.split('\n'):
            line = line.strip()
            if line and not line.startswith('remotes/origin/HEAD'):
                branch_name = line.replace('* ', '').replace('remotes/origin/', '')
                if branch_name not in branches:
                    branches.append(branch_name)
        info["branches"] = branches
    
    # Get remote URL
    success, output = run_git_command(project_path, "remote", "get-url", "origin")
    if success:
        info["remote_url"] = output
    
    # Get last commit
    success, output = run_git_command(project_path, "log", "-1", "--format=%H %s")
    if success:
        info["last_commit"] = output
    
    return info


@router.get("/", response_model=List[GitProject])
async def list_local_git_projects() -> List[GitProject]:
    """List all local Git projects in the configured root directory"""
    root_path = Path(settings.local_git_projects_root).expanduser()
    
    if not root_path.exists():
        # Create the directory if it doesn't exist
        os.makedirs(root_path, exist_ok=True)
        return []
    
    projects = []
    
    try:
        for item in root_path.iterdir():
            if item.is_dir() and not item.name.startswith('.'):
                project_path = str(item)
                git_info = get_git_info(project_path)
                
                # Get last modified time
                last_modified = None
                try:
                    last_modified = datetime.fromtimestamp(item.stat().st_mtime)
                except:
                    pass
                
                project = GitProject(
                    name=item.name,
                    path=project_path,
                    is_git=git_info.get("is_git", False),
                    current_branch=git_info.get("current_branch"),
                    branches=git_info.get("branches", []),
                    remote_url=git_info.get("remote_url"),
                    last_commit=git_info.get("last_commit"),
                    last_modified=last_modified
                )
                projects.append(project)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list projects: {str(e)}")
    
    # Sort by last modified time (most recent first)
    projects.sort(key=lambda p: p.last_modified or datetime.min, reverse=True)
    return projects


@router.get("/{project_name}/branches", response_model=List[GitBranch])
async def get_project_branches(project_name: str) -> List[GitBranch]:
    """Get all branches for a specific project"""
    project_path = Path(settings.local_git_projects_root).expanduser() / project_name
    
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project_path.joinpath(".git").exists():
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    branches = []
    
    # Get current branch
    success, current_branch = run_git_command(str(project_path), "branch", "--show-current")
    current = current_branch if success else None
    
    # Get local branches
    success, output = run_git_command(str(project_path), "branch")
    if success:
        for line in output.split('\n'):
            line = line.strip()
            if line:
                is_current = line.startswith('* ')
                branch_name = line.replace('* ', '')
                branches.append(GitBranch(
                    name=branch_name,
                    is_current=is_current,
                    is_remote=False
                ))
    
    # Get remote branches
    success, output = run_git_command(str(project_path), "branch", "-r")
    if success:
        for line in output.split('\n'):
            line = line.strip()
            if line and not line.startswith('origin/HEAD'):
                branch_name = line.replace('origin/', '')
                # Don't add if we already have this branch locally
                if not any(b.name == branch_name for b in branches):
                    branches.append(GitBranch(
                        name=branch_name,
                        is_current=False,
                        is_remote=True
                    ))
    
    return branches


@router.post("/{project_name}/fetch")
async def fetch_project(project_name: str):
    """Perform git fetch for a project to update remote branch information"""
    project_path = Path(settings.local_git_projects_root).expanduser() / project_name
    
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project_path.joinpath(".git").exists():
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    success, output = run_git_command(str(project_path), "fetch", "origin")
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Git fetch failed: {output}")
    
    return {"message": "Fetch completed successfully", "output": output}


@router.post("/{project_name}/checkout")
async def checkout_branch(project_name: str, branch_name: str):
    """Switch to a specific branch in the project"""
    project_path = Path(settings.local_git_projects_root).expanduser() / project_name
    
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project_path.joinpath(".git").exists():
        raise HTTPException(status_code=400, detail="Not a Git repository")
    
    # Check if branch exists locally
    success, _ = run_git_command(str(project_path), "show-ref", "--verify", f"refs/heads/{branch_name}")
    
    if not success:
        # Branch doesn't exist locally, try to create it from remote
        success, output = run_git_command(str(project_path), "checkout", "-b", branch_name, f"origin/{branch_name}")
    else:
        # Branch exists locally, just checkout
        success, output = run_git_command(str(project_path), "checkout", branch_name)
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Checkout failed: {output}")
    
    return {"message": f"Successfully switched to branch '{branch_name}'", "output": output}


async def clone_repository_background(git_url: str, project_name: str, clone_path: str):
    """Clone repository in background task"""
    try:
        # Run git clone
        result = subprocess.run(
            ["git", "clone", git_url, clone_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            print(f"Failed to clone repository: {result.stderr}")
            # Clean up partial clone
            if os.path.exists(clone_path):
                import shutil
                shutil.rmtree(clone_path)
        else:
            print(f"Successfully cloned {git_url} to {clone_path}")
    
    except subprocess.TimeoutExpired:
        print(f"Clone operation timed out for {git_url}")
        # Clean up partial clone
        if os.path.exists(clone_path):
            import shutil
            shutil.rmtree(clone_path)
    except Exception as e:
        print(f"Error during clone operation: {e}")
        # Clean up partial clone
        if os.path.exists(clone_path):
            import shutil
            shutil.rmtree(clone_path)


@router.post("/clone")
async def clone_repository(
    request: CloneRequest,
    background_tasks: BackgroundTasks
):
    """Clone a Git repository to the local projects directory"""
    root_path = Path(settings.local_git_projects_root).expanduser()
    
    # Create root directory if it doesn't exist
    os.makedirs(root_path, exist_ok=True)
    
    # Determine project name
    if request.project_name:
        project_name = request.project_name
    else:
        # Extract project name from Git URL
        # e.g., git@github.com:user/repo.git -> repo
        url_parts = request.git_url.rstrip('.git').split('/')
        project_name = url_parts[-1]
    
    clone_path = root_path / project_name
    
    # Check if project already exists
    if clone_path.exists():
        raise HTTPException(
            status_code=409, 
            detail=f"Project '{project_name}' already exists"
        )
    
    # Validate Git URL format (basic validation)
    if not (request.git_url.startswith('git@') or 
            request.git_url.startswith('https://') or 
            request.git_url.startswith('http://')):
        raise HTTPException(
            status_code=400,
            detail="Invalid Git URL format"
        )
    
    # Start cloning in background
    background_tasks.add_task(
        clone_repository_background, 
        request.git_url, 
        project_name, 
        str(clone_path)
    )
    
    return {
        "message": f"Cloning repository '{request.git_url}' to '{project_name}' started in background",
        "project_name": project_name,
        "clone_path": str(clone_path)
    }


@router.delete("/{project_name}")
async def delete_local_project(project_name: str):
    """Delete a local Git project"""
    project_path = Path(settings.local_git_projects_root).expanduser() / project_name
    
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        import shutil
        shutil.rmtree(project_path)
        return {"message": f"Project '{project_name}' deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete project: {str(e)}"
        )