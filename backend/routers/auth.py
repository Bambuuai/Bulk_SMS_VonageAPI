# import json
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, Union

import jwt
from bson import ObjectId
from fastapi import Depends, APIRouter, HTTPException, status, Form
# from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pymongo.errors import DuplicateKeyError

from database import user_collection
from environment import SECRET_KEY, ALGORITHM
from models.auth_models import UserCreate, Token, TokenData, LoginInfo, IdentityFields, DBUser, \
    UserWithUUID, UserWithMSI, ResetPasswordRequest, ForgotPasswordRequest, BaseResponse, ForgotPasswordResponse
from utilities import debug

logging.basicConfig(level=logging.DEBUG, filename='app.log', filemode='a',
                    format='%(asctime)s - %(levelname)s - %(message)s')

# to get a string like this run:
# openssl rand -hex 32

ACCESS_TOKEN_EXPIRE_DAYS = 3

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["authentication"])


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# Could bug out because if indirect referencing
async def get_user_dict(field: IdentityFields, value: str):
    if field == IdentityFields.id:
        value = ObjectId(value)
    debug("-------------------------", field.value, value)
    user = await user_collection.find_one({field.value: value})

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def get_user_with_password(field: IdentityFields, value: str):
    user = await get_user_dict(field, value)
    return DBUser(**user)


async def get_user(field: IdentityFields, value: str) -> DBUser:
    user = await get_user_dict(field, value)
    return DBUser(**user)


async def authenticate_user(email: str, password: str) -> Union[bool, UserWithMSI]:
    user = await get_user_with_password(IdentityFields.email, email)

    if not user:
        return False
    if user.disabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> DBUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        # debug("-------------------------------payload-------------------------------", json.dumps(payload))
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(id=user_id)
    except InvalidTokenError:
        raise credentials_exception
    user = await get_user(IdentityFields.id, token_data.id)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
        current_user: Annotated[DBUser, Depends(get_current_user)],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@router.post("/register", response_model=UserWithUUID)
async def create_admin(data: UserCreate):
    user = DBUser(**data.model_dump(), created_at=datetime.now(timezone.utc), is_admin=True,
                  hashed_password=get_password_hash(data.password), created_by=None)
    json_data = user.model_dump(by_alias=True, exclude={"id"})
    # debug(json.dumps(json_data), type(json_data))

    try:
        result = await user_collection.insert_one(json_data)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User already exists")
    admin = await user_collection.find_one({"_id": ObjectId(result.inserted_id)})
    return admin


@router.post("/token", response_model=LoginInfo)
async def login_for_access_token(
        username: Annotated[str, Form()], password: Annotated[str | None, Form()]
) -> Token:
    # The username is an email
    user = await authenticate_user(username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    access_token = create_token(
        data={"sub": user.id, "purpose": "login"}, expires_delta=access_token_expires
    )
    return LoginInfo(access_token=access_token, token_type="bearer", **user.model_dump())


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest) -> ForgotPasswordResponse:
    user = await get_user_with_password(IdentityFields.email, data.email)

    # Hash the key using the last 6 digits/letters of the password hash to make it unique
    reset_token = create_token({"sub": user.id, "purpose": "password_reset", "key": user.hashed_password[-6:]},
                               expires_delta=timedelta(minutes=30))  # Implement this function to create a secure token

    # Send reset token to user's email as ${baseUrl}/${frontend_form_url}?token=${token}
    # send_reset_email(request.email, reset_token)

    return ForgotPasswordResponse(success=True, message="Password reset email sent", token=reset_token)


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest) -> BaseResponse:
    invalid_token_error = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=ALGORITHM)  # Implement this function to verify token
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token is expired")
    except Exception:
        raise invalid_token_error

    debug(json.dumps(payload))

    user_id: str = payload.get("sub")
    if not user_id:
        raise invalid_token_error

    user = await get_user_with_password(IdentityFields.id, user_id)
    if user.hashed_password[-6:] != payload["key"]:
        raise invalid_token_error

    hashed_password = get_password_hash(data.new_password)  # Implement this function to hash the new password

    await user_collection.update_one({"_id": ObjectId(user_id)}, update={"$set": {"hashed_password": hashed_password}})

    return BaseResponse(success=True, message="Password reset successful")
