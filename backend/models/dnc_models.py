from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from vonage_utils.types import PhoneNumber

from models.base_models import PyObjectId


class DNCScope(Enum):
    platform = "platform"
    user = "user"


class BaseDNCFixed(BaseModel):
    phone_number: PhoneNumber | None


class BaseDNCEditable(BaseModel):
    reason: str = ""

    model_config = ConfigDict(extra="forbid")


class BaseDNC(BaseDNCFixed, BaseDNCEditable):
    pass


class DNCEntry(BaseDNC):
    id: PyObjectId | None = Field(None, alias="_id")
    added_at: datetime | None = None
    # updated_at: datetime | None = None
    created_by: PyObjectId | None
    scope: DNCScope | None


class ImportDNCResponse(BaseModel):
    results: list[DNCEntry]
    # list[DNCEntry]
