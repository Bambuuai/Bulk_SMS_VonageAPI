from datetime import datetime
from enum import Enum
from http import HTTPStatus
from typing import Annotated, List, Dict, Any

from fastapi import status
from pydantic import BaseModel, BeforeValidator
from pydantic_extra_types.country import CountryAlpha2
from vonage_utils.types import PhoneNumber

from utilities import pst_tz

PyObjectId = Annotated[str, BeforeValidator(str)]


class PSTConversionMixin:
    @staticmethod
    def convert_to_pst(value: datetime) -> datetime:
        return value.astimezone(pst_tz)


class BaseResponse(BaseModel):
    message: str | None = ""
    data: Dict[str, Any] | List[Any] | None = None
    success: bool
    status: HTTPStatus = status.HTTP_200_OK


class UpdateModelResponse(BaseModel):
    matched: int | None = None
    added: int | None = None
    modified: int | None = None
    upserted: int | None = None
    ids: List[PyObjectId] | None = None


class DeleteModelResponse(BaseResponse):
    deleted: int


class VonageNumberTypes(str, Enum):
    landline = "landline"
    toll_free = "landline-toll-free"
    mobile = "mobile-lvn"


class VonageNumberFeatures(str, Enum):
    sms = "SMS"
    voice = "VOICE"
    mms = "MMS"


class VonageNumber(BaseModel):
    country: CountryAlpha2
    msisdn: PhoneNumber
    type: VonageNumberTypes
    features: List[VonageNumberFeatures]


class VonageNumberSearch(VonageNumber):
    cost: str | None


class VonageNumberSearchResult(BaseModel):
    count: int
    numbers: List[VonageNumberSearch]
