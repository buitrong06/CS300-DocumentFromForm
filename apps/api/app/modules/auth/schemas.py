from typing import Literal

from pydantic import BaseModel


class CurrentUser(BaseModel):
    """Authenticated user identity injected into route handlers."""

    id: str
    email: str
    display_name: str
    auth_mode: Literal["dev_bypass", "firebase"]
