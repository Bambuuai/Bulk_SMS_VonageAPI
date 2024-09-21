from datetime import datetime, timezone, timedelta
from typing import Annotated, Union

import jwt
from bson import ObjectId
from fastapi import status, HTTPException, Depends, WebSocketException
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pymongo import UpdateOne, InsertOne
from pymongo.errors import BulkWriteError

from database import dnc_collection
from database import user_collection
from environment import SECRET_KEY, ALGORITHM
from models.auth_models import TokenData, IdentityFields, DBUser, UserWithUUID, UserWithMSI
from utilities import debug

ACCESS_TOKEN_EXPIRE_DAYS = 3

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


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


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], is_websocket=False) -> DBUser:
    if is_websocket:
        credentials_exception = WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated")
    else:
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


def get_current_admin(current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> UserWithUUID:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to access this resource.")
    return current_user


async def verify_users_created_by_same_admin(user_ids: list[ObjectId], admin_id: ObjectId):
    # Query to find users with the provided IDs
    users = await user_collection.find({"_id": {"$in": user_ids}}).to_list(length=len(user_ids))

    if len(users) != len(user_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Some users were not found")

    # Check if all users have the same created_by value and if it matches the current admin
    for user in users:
        debug("----------------------------------------", admin_id.__str__(), admin_id)
        if user["created_by"] != admin_id.__str__():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You are not allowed to delete one or more of these users")

    return True


async def bulk_write_and_get_results(operations):
    # Track IDs of inserted and updated documents
    inserted_ids = []
    updated_ids = []

    # Prepare bulk write operations
    bulk_operations = []
    for op in operations:
        if op['operation'] == 'insert':
            doc = op['document']
            bulk_operations.append(InsertOne(doc))
            inserted_ids.append(doc['_id'])
        elif op['operation'] == 'update':
            filter = op['filter']
            update = op['update']
            bulk_operations.append(UpdateOne(filter, update))
            updated_ids.append(filter['_id'])  # Assumes filter contains the _id field

    try:
        result = await dnc_collection.bulk_write(bulk_operations)

        # Query for inserted documents
        inserted_docs = []
        if inserted_ids:
            inserted_docs = await dnc_collection.find({'_id': {'$in': inserted_ids}}).to_list(length=len(inserted_ids))

        # Query for updated documents
        updated_docs = []
        if updated_ids:
            updated_docs = await dnc_collection.find({'_id': {'$in': updated_ids}}).to_list(length=len(updated_ids))

        return {
            'inserted_docs': inserted_docs,
            'updated_docs': updated_docs
        }

    except BulkWriteError as bwe:
        debug(f"BulkWriteError: {bwe.details}")
        return None


def handlePhoneBulkWriteError(e):
    errors = []
    for error in e.details["writeErrors"]:
        phone_number = error['keyValue']['phone_number']
        custom_error = f"You already have a contact with phone number - {phone_number}"

        # Add the custom error message to the list
        errors.append(custom_error)
    debug(errors)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=errors)
