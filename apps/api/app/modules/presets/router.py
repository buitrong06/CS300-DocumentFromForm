from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import FormattingPreset, User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import CurrentUser

router = APIRouter(prefix="/api/presets", tags=["presets"])


class PresetOptionView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    slug: str
    name: str
    version: int
    document_type_keys: list[str]


Database = Annotated[Session, Depends(get_db)]


def active_owner_id(
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


CurrentOwner = Annotated[int, Depends(active_owner_id)]


def document_type_keys(document_types: dict[str, Any]) -> list[str]:
    keys: set[str] = set()
    for key, value in document_types.items():
        if not isinstance(value, dict):
            continue
        variants = value.get("variants")
        if isinstance(variants, dict):
            keys.update(variant for variant in variants if isinstance(variant, str))
        else:
            keys.add(key)
    return sorted(keys)


@router.get("", response_model=list[PresetOptionView])
def list_available_presets(owner_id: CurrentOwner, db: Database) -> list[PresetOptionView]:
    with db.begin():
        presets = list(
            db.scalars(
                select(FormattingPreset)
                .where(
                    FormattingPreset.status == "published",
                    FormattingPreset.is_builtin.is_(True)
                    | (FormattingPreset.created_by == owner_id),
                )
                .order_by(
                    FormattingPreset.is_builtin.desc(),
                    FormattingPreset.name,
                    FormattingPreset.id,
                )
            )
        )
        return [
            PresetOptionView(
                id=preset.id,
                slug=preset.slug,
                name=preset.name,
                version=preset.version,
                document_type_keys=document_type_keys(preset.document_types),
            )
            for preset in presets
        ]
