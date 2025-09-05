import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.projects import Project as ProjectModel
from app.services.git_ops import hard_reset, list_commits, show_diff

router = APIRouter(prefix="/api/commits", tags=["commits"])


class Commit(BaseModel):
    commit_sha: str
    parent_sha: str | None
    author: str | None
    date: str | None
    message: str


@router.get("/{project_id}", response_model=List[Commit])
async def commits(project_id: str, db: Session = Depends(get_db)) -> List[Commit]:
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    repo = os.path.join(settings.projects_root, project_id, "repo")
    return [Commit(**c) for c in list_commits(repo)]


@router.get("/{project_id}/{commit_sha}/diff")
async def commit_diff(project_id: str, commit_sha: str, db: Session = Depends(get_db)):
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    repo = os.path.join(settings.projects_root, project_id, "repo")
    return {"diff": show_diff(repo, commit_sha)}


@router.post("/{project_id}/{commit_sha}/revert")
async def revert_to(project_id: str, commit_sha: str, db: Session = Depends(get_db)):
    row = db.get(ProjectModel, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    repo = os.path.join(settings.projects_root, project_id, "repo")
    hard_reset(repo, commit_sha)
    return {"ok": True}
