from datetime import datetime
from typing import Annotated

import aiofiles
import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, Body
from pydantic import ValidationError
from pymongo import UpdateOne, UpdateMany
from pymongo.errors import BulkWriteError

from database import contact_collection
from models.auth_models import UserWithUUID
from models.base_models import BaseResponse, UpdateModelResponse, PyObjectId
from models.contact_models import ContactEntry, BaseContact, OptionalContactUpdates
from utilities import debug
from .utilities import get_current_active_user, handlePhoneBulkWriteError

router = APIRouter(prefix="/contact", tags=["contact"])


@router.get("", response_model=list[ContactEntry])
@router.get("/", response_model=list[ContactEntry])
async def list_contacts(
        current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]):
    user_contacts = await contact_collection.find({"created_by": current_user.id}).to_list(length=None)
    debug(user_contacts)
    return user_contacts


@router.get("/groups", response_model=list[str])
async def list_groups(
        current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]):
    contact_groups = await contact_collection.distinct("groups", {"created_by": current_user.id})
    debug(contact_groups)
    return contact_groups


@router.post("/add", response_model=list[ContactEntry])
async def add_contact(entries: list[BaseContact],
                      current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> ContactEntry:
    entries_mod = []
    for entry in entries:
        entry_data = entry.model_dump(exclude_unset=True)
        entry_data["updated_at"] = None
        entry_data["created_by"] = current_user.id
        entry_data["groups"] = [str(group_name).lower() for group_name in entry_data["groups"]]

        entries_mod.append(entry_data)

    try:
        result = await contact_collection.insert_many(entries_mod)
    except BulkWriteError as e:
        errors = []
        # I can't output the full object because there is an ObjectId in the details
        debug(e, "=-=-=-=-=-=-=", e.details["writeErrors"][0]["errmsg"])
        for error in e.details["writeErrors"]:
            phone_number = error['keyValue']['phone_number']
            custom_error = f"You already have a contact with phone number - {phone_number}"

            # Add the custom error message to the list
            errors.append(custom_error)
        debug(errors)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=errors)

    added = await contact_collection.find({"_id": {"$in": result.inserted_ids}}).to_list(len(result.inserted_ids))
    return added


@router.delete("/remove", response_model=BaseResponse)
async def remove_contact(contacts: list[PyObjectId],
                         current_user: Annotated[UserWithUUID, Depends(get_current_active_user)]) -> BaseResponse:
    # Verify ownership and existence of the DNCs
    contacts = [ObjectId(contact) for contact in contacts]
    contact_entries = await contact_collection.find({
        "_id": {"$in": contacts},
        "created_by": current_user.id
    }).to_list(length=len(contacts))

    # If not all DNCs belong to the user
    if len(contact_entries) != len(contacts):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Some contacts cannot be deleted. Check that they exist and that they belong to you.")

    # Delete the DNCs
    debug(contacts, current_user.id)
    result = await contact_collection.delete_many(
        {"_id": {"$in": contacts}, "created_by": current_user.id})

    return BaseResponse(message=f"Deleted {result.deleted_count} contact(s) successfully", success=True)


@router.delete("/group/remove", response_model=BaseResponse)
async def remove_contact_group(
        group_name: Annotated[str, Body()],
        current_user: UserWithUUID = Depends(get_current_active_user)
) -> BaseResponse:
    # Find all contacts with the group to be removed
    contacts_with_group = await contact_collection.find({
        "created_by": current_user.id,
        "groups": group_name
    }).to_list(None)

    if not contacts_with_group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Create a bulk update operation to remove the group from contacts with other groups
    update_operations = []
    delete_operations = []

    for contact in contacts_with_group:
        if len(contact["groups"]) > 1:
            # If contact has other groups, remove the group
            update_operations.append(
                UpdateMany(
                    {"_id": contact["_id"]},
                    {"$pull": {"groups": group_name}}
                )
            )
        else:
            # If the contact only belongs to this group, mark for deletion
            delete_operations.append(contact["_id"])

    # Perform bulk update to remove group from contacts
    if update_operations:
        await contact_collection.bulk_write(update_operations)

    # Delete contacts that only belong to the removed group
    if delete_operations:
        result = await contact_collection.delete_many({"_id": {"$in": delete_operations}})

    return BaseResponse(success=True, status=status.HTTP_200_OK,
                        message="Group deleted successfully")


@router.put("/update", response_model=UpdateModelResponse)
async def update_contact(updates: list[OptionalContactUpdates],
                         current_user: Annotated[
                             UserWithUUID, Depends(get_current_active_user)]) -> UpdateModelResponse:
    contact_entries = await contact_collection.find({
        "_id": {"$in": [ObjectId(update.id) for update in updates]},
        "created_by": current_user.id
    }).to_list(length=len(updates))
    #
    debug(contact_entries, [ObjectId(update.id) for update in updates], current_user.id)
    if len(contact_entries) != len(updates):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Some contacts cannot be updated. Check that they exist and that they belong to you."
        )
    for update in updates:
        update.phone_number = update.phone_number.strip("+")

    update_operations = [
        UpdateOne({"_id": ObjectId(update.id), "created_by": current_user.id},
                  {"$set": update.model_dump(exclude_unset=True)})
        for update in updates
    ]

    if not update_operations:
        raise HTTPException(status_code=400, detail="No valid updates provided")

    # Execute bulk operations
    try:
        result = await contact_collection.bulk_write(update_operations)
    except BulkWriteError as e:
        debug(e)
        handlePhoneBulkWriteError(e)

    return UpdateModelResponse(matched=result.matched_count, modified=result.modified_count)


# @router.post("/import", response_model=list[BaseContact])
# async def import_contacts(
#         file: UploadFile,
#         current_user: UserWithUUID = Depends(get_current_active_user)
# ) -> list[BaseContact]:
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
#     df = pd.read_csv(file.filename, dtype=str).fillna("")
# 
#     debug([row for row in df.iterrows()])
# 
#     # Validate required columns
#     required_columns = ['NUMBER', 'NAME']
#     missing_columns = [col for col in required_columns if col not in df.columns]
# 
#     if missing_columns:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"CSV file is missing required column(s): {', '.join(missing_columns)}."
#         )
# 
#     # Prepare bulk operations
#     bulk_operations = []
#     new_contacts = []
#     for index, row in df.iterrows():
#         row["groups"] = row["groups"].strip("'").lower().split(",")
#         row["NUMBER"] = row["NUMBER"].strip("+")
# 
#         debug(row["NUMBER"], type(row["NUMBER"]))
#         debug(row)
#         try:
#             # Convert the row to a dictionary and validate using Pydantic
#             new_contacts.append(BaseContact(**row.to_dict()))
#         except ValidationError as e:
#             # Raise HTTPException with validation error details to the user
#             raise HTTPException(
#                 status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
#                 detail=f"Row {index + 1} is invalid"
#             )
# 
#             # debug("---------------------------------------------------------------")
#             # debug(update_data)
#             # debug("---------------------------------------------------------------")
# 
#     if not new_contacts:
#         raise HTTPException(status_code=400, detail="No valid data to process.")
# 
#     return new_contacts


@router.post("/import", response_model=UpdateModelResponse)
async def import_contacts(
        file: UploadFile,
        group: Annotated[str, Form()],
        current_user: UserWithUUID = Depends(get_current_active_user)
) -> UpdateModelResponse:
    existing_group = await contact_collection.find_one({
        "groups": group,
        "created_by": current_user.id
    })

    if existing_group:
        raise HTTPException(status_code=400, detail="Group name already exists.")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid file type. Please upload a CSV file.")

    # Read the file content asynchronously
    async with aiofiles.open(file.filename, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Read the CSV file
    df = pd.read_csv(file.filename, dtype=str).fillna("")

    debug([row for row in df.iterrows()])

    # Validate required columns
    required_columns = ['NUMBER', 'NAME']
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV file is missing required column(s): {', '.join(missing_columns)}."
        )

    # Prepare bulk operations
    bulk_operations = []
    new_contacts = []
    for index, row in df.iterrows():
        new_info = {
            "name": row["NAME"],
            "phone_number": row["NUMBER"].strip("+"),
            "groups": [group.lower()]
        }

        # row["name"] = row["NAME"]
        # row["groups"] = [group]
        # row["phone_number"] = row["NUMBER"].strip("+")

        debug(new_info)
        debug(row)
        try:
            # Convert the row to a dictionary and validate using Pydantic
            valid_data = BaseContact(**new_info)
        except ValidationError as e:
            # Raise HTTPException with validation error details to the user
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Row {index + 1} is invalid"
            )

            # debug("---------------------------------------------------------------")
            # debug(update_data)
            # debug("---------------------------------------------------------------")

        bulk_operations.append(
            UpdateOne({'phone_number': valid_data.phone_number, 'created_by': current_user.id},
                      {
                          "$setOnInsert": {
                              'added_at': datetime.utcnow(),
                          },
                          "$set": {**valid_data.model_dump(exclude_unset=True, exclude={"groups"}),
                                   "updated_at": datetime.utcnow()},
                          "$addToSet": {"groups": {"$each": valid_data.groups}}
                      },
                      True,
                      )
        )

    if not bulk_operations:
        raise HTTPException(status_code=400, detail="No valid data to process.")

    debug(bulk_operations)
    # Execute bulk operations
    try:
        result = await contact_collection.bulk_write(bulk_operations)
        # ids_added = [objectId for objectId in result.upserted_ids.values()]
        # # debug(ids_added)
        # if ids_added:
        #     new_contacts = await contact_collection.find(
        #         {'_id': {'$in': ids_added}}).to_list(
        #         length=len(ids_added))
    except BulkWriteError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.details["writeErrors"][0]["errmsg"])

    debug(result)
    # return ImportContactResponse(
    #     matched=result.matched_count,
    #     added=result.upserted_count, modified=result.modified_count,
    #     results=new_contacts
    # )
    return UpdateModelResponse(matched=result.matched_count, modified=result.modified_count,
                               added=result.inserted_count, upserted=result.upserted_count,
                               ids=[str(objectId) for objectId in result.upserted_ids.values()])
