from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser
from app.modules.drafts.schemas import (
    CreateDraftRequest,
    DraftEditorView,
    DraftSavePayload,
    DraftSummary,
)
from app.modules.drafts.service import (
    DraftConflictError,
    DraftValidationError,
    create_personal_draft,
    get_editor_view,
    list_personal_drafts,
    save_draft,
)

router = APIRouter(prefix="/api", tags=["drafts"])


Database = Annotated[Session, Depends(get_db)]


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


@router.post(
    "/templates/{template_id}/drafts",
    response_model=DraftEditorView,
    status_code=status.HTTP_201_CREATED,
)
def create_draft(
    template_id: int,
    request: CreateDraftRequest,
    owner_id: CurrentOwner,
    db: Database,
) -> DraftEditorView:
    draft = create_personal_draft(db, owner_id, template_id, request.title)
    if draft is None:
        raise HTTPException(status_code=404, detail="Published Template not found")
    view = get_editor_view(db, owner_id, draft.id)
    if view is None:
        raise RuntimeError("Created Draft could not be loaded")
    return view


@router.get("/drafts", response_model=list[DraftSummary])
def list_drafts(owner_id: CurrentOwner, db: Database) -> list[DraftSummary]:
    return list_personal_drafts(db, owner_id)


@router.get("/drafts/{draft_id}", response_model=DraftEditorView)
def get_draft(draft_id: int, owner_id: CurrentOwner, db: Database) -> DraftEditorView:
    view = get_editor_view(db, owner_id, draft_id)
    if view is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return view


@router.put("/drafts/{draft_id}", response_model=DraftEditorView)
def save_document_draft(
    draft_id: int,
    payload: DraftSavePayload,
    owner_id: CurrentOwner,
    db: Database,
) -> DraftEditorView:
    try:
        view = save_draft(db, owner_id, draft_id, payload)
    except DraftConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Draft changed elsewhere. Reload before saving.",
        ) from exc
    except DraftValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    if view is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return view
