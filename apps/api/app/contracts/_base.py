from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

EntityId = Annotated[int, Field(gt=0)]
Version = Annotated[int, Field(ge=1)]


class ContractModel(BaseModel):
    """Strict base for API contracts shared across domain modules."""

    model_config = ConfigDict(extra="forbid")
