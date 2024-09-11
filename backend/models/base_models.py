from enum import Enum
from http import HTTPStatus
from typing import Annotated, List

from fastapi import status
from pydantic import BaseModel, BeforeValidator
from pydantic_extra_types.country import CountryAlpha2
from vonage_utils.types import PhoneNumber

PyObjectId = Annotated[str, BeforeValidator(str)]


class BaseResponse(BaseModel):
    message: str
    success: bool
    status: HTTPStatus = status.HTTP_200_OK


class UpdateModelResponse(BaseModel):
    matched: int | None = None
    added: int | None = None
    modified: int | None = None
    upserted: int | None = None


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
