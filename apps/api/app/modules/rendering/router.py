from __future__ import annotations

from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser
from app.modules.rendering.schemas import ExportRequest, PreviewRequest, RenderSnapshotView
from app.modules.rendering.service import (
    FinalExportBlockedError,
    RenderConflictError,
    RenderError,
    export_draft,
    get_owned_snapshot,
    preview_draft,
    read_snapshot_content,
)

router = APIRouter(prefix="/api", tags=["rendering"])


Database = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_owner_id(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Database,
) -> int:
    with db.begin():
        owner_id = db.scalar(select(User.id).where(User.firebase_uid == user.id, User.is_active))
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An active account is required",
        )
    return owner_id


CurrentOwner = Annotated[int, Depends(get_owner_id)]


@router.post("/drafts/{draft_id}/renders/preview", response_model=RenderSnapshotView)
def render_preview(
    draft_id: int,
    request: PreviewRequest,
    owner_id: CurrentOwner,
    db: Database,
    settings: AppSettings,
) -> RenderSnapshotView:
    try:
        snapshot = preview_draft(db, owner_id, draft_id, request, settings)
    except RenderConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RenderError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return snapshot


@router.post("/drafts/{draft_id}/exports")
def export_document(
    draft_id: int,
    request: ExportRequest,
    owner_id: CurrentOwner,
    db: Database,
    settings: AppSettings,
) -> Response:
    try:
        snapshot = export_draft(db, owner_id, draft_id, request, settings)
    except RenderConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except FinalExportBlockedError as exc:
        raise HTTPException(status_code=422, detail=exc.validation.model_dump()) from exc
    except RenderError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    with db.begin():
        row = get_owned_snapshot(db, owner_id, snapshot.id)
        if row is None:
            raise HTTPException(status_code=404, detail="Rendered artifact not found")
        _, artifact = row
        content = read_snapshot_content(Path(settings.storage_local_dir), artifact)
    filename = quote(snapshot.filename, safe="")
    return Response(
        content=content,
        media_type=artifact.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "X-Render-Snapshot-Id": str(snapshot.id),
            "X-Artifact-SHA256": artifact.sha256,
        },
    )


@router.get("/render-snapshots/{snapshot_id}/content")
def get_render_snapshot_content(
    snapshot_id: int,
    owner_id: CurrentOwner,
    db: Database,
    settings: AppSettings,
) -> Response:
    with db.begin():
        row = get_owned_snapshot(db, owner_id, snapshot_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Rendered artifact not found")
        _, artifact = row
        content = read_snapshot_content(Path(settings.storage_local_dir), artifact)
    return Response(content=content, media_type=artifact.mime_type)
