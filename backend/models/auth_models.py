from datetime import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from models.base_models import BaseResponse, PyObjectId, VonageNumber
from utilities import make_optional_fields


# User Models
class Token(BaseModel):
    access_token: str
    token_type: str


class LoginInfo(Token):
    is_admin: bool
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    numbers: List[VonageNumber]


class LoginCredentials(BaseModel):
    email: EmailStr
    password: str


class TokenData(BaseModel):
    id: str | None = None


class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    company: str | None


class UserAdminUpdates(UserBase):
    disabled: bool = False


class User(UserAdminUpdates):
    created_at: datetime
    is_admin: bool = True  # Checks if the user is an admin of the account group, not the app admin


class UserWithUUID(User):
    id: PyObjectId | None = Field(default=None, alias="_id")
    created_by: PyObjectId | None = Field(default=None)


OptionalUserUpdates = make_optional_fields(UserWithUUID, ConfigDict(extra="forbid"), "OptionalUserUpdates",
                                           exclude=["created_at", "is_admin", "created_by", "id"])


class UserWithMSI(UserWithUUID):
    numbers: List[VonageNumber] = []


class UserCreate(UserBase):
    password: str


class UserVerify(UserWithMSI):
    hashed_password: str

    # vonage_country: CountryAlpha2


class DBUser(UserVerify):
    pass


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseResponse):
    token: str = Field(description="This field will be removed once we get the emailing api")


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class IdentityFields(str, Enum):
    id = "_id"
    email = "email"
    username = "username"


class UserBaseWithUUID(UserBase):
    id: PyObjectId | None = Field(default=None, alias="_id")


class VonageNumberWithUsers(VonageNumber):
    users: List[UserBaseWithUUID]
