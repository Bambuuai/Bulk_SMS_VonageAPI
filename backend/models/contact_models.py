from datetime import datetime
from typing import List

from pydantic import BaseModel, Field, ConfigDict
from vonage_utils.types import PhoneNumber

from models.base_models import PyObjectId, UpdateModelResponse
from utilities import make_optional_fields


class BaseContact(BaseModel):
    name: str = Field(min_length=1)
    phone_number: PhoneNumber
    groups: List[str] = Field(min_length=1, default=["default"])


class UpdateContact(BaseContact):
    id: PyObjectId | None = Field(default=None, alias='_id')

    model_config = ConfigDict(extra="allow")


OptionalContactUpdates = make_optional_fields(UpdateContact, model_name="OptionalContactUpdates")


class ContactEntry(UpdateContact):
    created_by: PyObjectId | None
    added_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None


class ImportContactResponse(UpdateModelResponse):
    results: list[ContactEntry]
    # list[DNCEntry]
