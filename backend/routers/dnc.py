from datetime import datetime
from typing import Annotated

import aiofiles
import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from pydantic import ValidationError
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError
from vonage_utils.types import PhoneNumber

from database import dnc_collection
from models.auth_models import UserWithUUID, PyObjectId
from models.base_models import BaseResponse, UpdateModelResponse, DeleteModelResponse
from models.dnc_models import DNCEntry, BaseDNC, BaseDNCEditable
from utilities import is_valid_phone_number, convert_to_string, debug
from .utilities import get_current_active_user, handlePhoneBulkWriteError

router = APIRouter(prefix="/dnc", tags=["dnc"])


@router.get("", response_model=list[DNCEntry])
@router.get("/", response_model=list[DNCEntry])
async def get_dnc_entries(current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]):
    results = await dnc_collection.find({"created_by": {"$in": [current_user.id, current_user.created_by]}}).to_list(
        length=None)
    return results


@router.post("/add", response_model=list[DNCEntry])
async def add_to_dnc(entries: list[BaseDNC],
                     current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> DNCEntry:
    entries_mod = []
    for entry in entries:
        entry_data = entry.model_dump(exclude_unset=True)
        entry_data["added_at"] = datetime.utcnow()
        entry_data["created_by"] = current_user.id
        entry_data["scope"] = "platform" if current_user.is_admin else "user"

        entries_mod.append(entry_data)

    try:
        result = await dnc_collection.insert_many(entries_mod)
    except BulkWriteError as e:
        debug(e, "=-=-=-=-=-=-=", e.details["writeErrors"][0]["errmsg"])
        handlePhoneBulkWriteError(e)

    admin = await dnc_collection.find({"_id": {"$in": result.inserted_ids}}).to_list(len(result.inserted_ids))
    return admin


@router.delete("/remove", response_model=BaseResponse)
async def remove_from_dnc(ids: list[PyObjectId],
                          current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> BaseResponse:
    # Verify ownership and existence of the DNCs
    oid_arr = [ObjectId(dncId) for dncId in ids]
    dncs = await dnc_collection.find({
        "_id": {"$in": oid_arr},
        "created_by": current_user.id
    }).to_list(length=len(ids))

    # If not all DNCs belong to the user
    if len(dncs) != len(ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Some DNCs could not be deleted. Check that they exist and that they belong to you.")

    # Delete the DNCs
    result = await dnc_collection.delete_many({"_id": {"$in": oid_arr}})

    return DeleteModelResponse(message=f"Deleted {result.deleted_count} DNC(s) successfully", success=True,
                               deleted=result.deleted_count)


@router.put("/update", response_model=UpdateModelResponse)
async def update_dnc(updates: list[BaseDNCEditable], phone_numbers: list[PhoneNumber],
                     current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> UpdateModelResponse:
    dncs = await dnc_collection.find({
        "phone_number": {"$in": phone_numbers},
        "created_by": current_user.id
    }).to_list(length=len(phone_numbers))

    if len(dncs) != len(phone_numbers):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Some DNCs cannot be updated. Check that they exist and that they belong to you."
        )

    if len(updates) != len(phone_numbers):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Mismatch between phone numbers and update data. Ensure that each phone number has "
                                   "a corresponding update entry.")

    update_operations = [
        UpdateOne({"phone_number": phone_numbers[index], "created_by": current_user.id},
                  {"$set": updates[index].model_dump(exclude_unset=True)})
        for index, phone_number in enumerate(phone_numbers)
    ]

    if not update_operations:
        raise HTTPException(status_code=400, detail="No valid updates provided")

    # Execute bulk operations
    result = await dnc_collection.bulk_write(update_operations)

    return UpdateModelResponse(matched=result.matched_count, modified=result.modified_count)


@router.post("/import", response_model=UpdateModelResponse)
async def import_dnc_contacts(
        file: UploadFile,
        current_user: UserWithUUID = Depends(get_current_active_user)
) -> UpdateModelResponse:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid file type. Please upload a CSV file.")

    # Read the file content asynchronously
    async with aiofiles.open(file.filename, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Read the CSV file
    df = pd.read_csv(file.filename, dtype=str).fillna("")

    # Validate required columns
    if 'NUMBER' not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CSV file must contain 'NUMBER' column.")
    if 'NAME' not in df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="CSV file must contain 'NAME' column.")

    # Prepare bulk operations
    bulk_operations = []
    dncs = []
    for index, row in df.iterrows():
        phone_number = row['NUMBER'].strip("+")
        name = row.get('NAME', "")  # Use .get() to handle optional column

        if pd.notna(phone_number) and is_valid_phone_number(convert_to_string(phone_number)):
            update_data = {
                "name": convert_to_string(name) if pd.notna(name) else ""
            }

            # debug("---------------------------------------------------------------")
            # debug(update_data)
            # debug("---------------------------------------------------------------")

            try:
                dncs.append(BaseDNC(phone_number=phone_number, name=name))
            except ValidationError as e:
                # Raise HTTPException with validation error details to the user
                debug(row, "===================", e)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Row {index + 1} is invalid"
                )

            bulk_operations.append(
                UpdateOne({'phone_number': convert_to_string(phone_number), 'created_by': current_user.id},
                          {"$setOnInsert": {
                              'added_at': datetime.utcnow(),
                              "scope": "platform" if current_user.is_admin else "user"},
                              "$set": update_data
                          },
                          True,
                          )
            )

    if not dncs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid data to process.")

    debug(bulk_operations)
    # Execute bulk operations
    try:
        result = await dnc_collection.bulk_write(bulk_operations)
        # ids_added = [objectId for objectId in result.upserted_ids.values()]
        # debug(ids_added)
        # if ids_added:
        #     dncs = await dnc_collection.find(
        #         {'_id': {'$in': ids_added}}).to_list(
        #         length=len(ids_added))
    except BulkWriteError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.details["writeErrors"][0]["errmsg"])

    debug(result)
    return UpdateModelResponse(matched=result.matched_count, modified=result.modified_count,
                               added=result.inserted_count, upserted=result.upserted_count,
                               ids=[str(objectId) for objectId in result.upserted_ids.values()])

# This import route automatically adds the DNCs to the DB
# @router.post("/import", response_model=ImportDNCResponse)
# async def import_dnc_contacts(
#         file: UploadFile,
#         current_user: UserWithUUID = Depends(get_current_active_user)
# ) -> UpdateModelResponse:
#     if not file.filename.endswith('.csv'):
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
#                             detail="Invalid file type. Please upload a CSV file.")
#
#     # Read the file content asynchronously
#     async with aiofiles.open(file.filename, 'wb') as out_file:
#         content = await file.read()
#         await out_file.write(content)
#
#     # Read the CSV file
#     df = pd.read_csv(file.filename)
#
#     # Validate required columns
#     if 'phone_number' not in df.columns:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
#                             detail="CSV file must contain 'phone_number' column.")
#
#     # Prepare bulk operations
#     bulk_operations = []
#     dncs = []
#     for index, row in df.iterrows():
#         phone_number = row['phone_number']
#         reason = row.get('reason', "")  # Use .get() to handle optional column
#
#         if pd.notna(phone_number) and is_valid_phone_number(convert_to_string(phone_number)):
#             update_data = {
#                 "reason": convert_to_string(reason) if pd.notna(reason) else ""}
#
#             # debug("---------------------------------------------------------------")
#             # debug(update_data)
#             # debug("---------------------------------------------------------------")
#
#             bulk_operations.append(
#                 UpdateOne({'phone_number': convert_to_string(phone_number), 'created_by': current_user.id},
#                           {"$setOnInsert": {
#                               'added_at': datetime.utcnow(),
#                               "scope": "platform" if current_user.is_admin else "user"},
#                               "$set": update_data
#                           },
#                           True,
#                           )
#             )
#
#     if not bulk_operations:
#         raise HTTPException(status_code=400, detail="No valid data to process.")
#
#     debug(bulk_operations)
#     # Execute bulk operations
#     try:
#         result = await dnc_collection.bulk_write(bulk_operations)
#         ids_added = [objectId for objectId in result.upserted_ids.values()]
#         # debug(ids_added)
#         if ids_added:
#             dncs = await dnc_collection.find(
#                 {'_id': {'$in': ids_added}}).to_list(
#                 length=len(ids_added))
#     except BulkWriteError as e:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.details["writeErrors"][0]["errmsg"])
#
#     return ImportDNCResponse(
#         matched=result.matched_count,
#         added=result.upserted_count, modified=result.modified_count,
#         results=dncs
#     )
