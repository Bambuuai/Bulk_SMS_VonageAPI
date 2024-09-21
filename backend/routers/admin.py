from datetime import datetime, timezone
from typing import List, Annotated

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Body
from pymongo import UpdateOne
from pymongo.errors import DuplicateKeyError

from database import user_collection
from models.auth_models import UserWithUUID, UserCreate, DBUser, OptionalUserUpdates, UserWithMSI, VonageNumber, \
    VonageNumberWithUsers
from models.base_models import BaseResponse, VonageNumberSearch, PyObjectId, VonageNumberSearchResult
from utilities import validate_ids, debug, acquire_number
from vonage_api import vonage_client
from . import contact, profile, admin_reports, dnc
from .utilities import verify_users_created_by_same_admin, get_password_hash, get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])
router.include_router(profile.router)
router.include_router(dnc.router)
router.include_router(contact.router)
router.include_router(admin_reports.router)
CurrentAdminDependency = Depends(get_current_admin, use_cache=True)


@router.get("/get/users", response_model=List[UserWithMSI])
async def get_users(current_admin: Annotated[UserWithUUID, Depends(get_current_admin)]):
    results = await user_collection.find({"created_by": current_admin.id}).to_list(length=None)
    return results


@router.post("/create/user", response_model=BaseResponse)
async def create_user(user_data: UserCreate,
                      background_tasks: BackgroundTasks,
                      current_admin: Annotated[UserWithUUID, Depends(get_current_admin)]):
    new_acc = DBUser(**user_data.model_dump(), created_at=datetime.now(timezone.utc), is_admin=False,
                     hashed_password=get_password_hash(user_data.password), created_by=current_admin.id, disabled=False)

    json_data = new_acc.model_dump(by_alias=True, exclude={"id"})
    # user_email = json_data["email"]

    try:
        result = await user_collection.insert_one(json_data)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="User already exists")

    # background_tasks.add_task(send_mail, [user_email], "Verify Your Email Address", {
    #     "last_name": json_data["last_name"],
    #     "verify_url": f"{FRONTEND_URL}/verify/account/{generate_email_token(user_email)}",
    # }, "verify-email.html")

    # number = acquire_number()
    # json_data["msisdn"] = number["msisdn"]

    # user = await user_collection.find_one({"_id": ObjectId(result.inserted_id)})
    return BaseResponse(success=True, message="User created successfully.",
                        status_code=status.HTTP_201_CREATED)


@router.delete("/delete/users", response_model=dict[str, str | bool])
async def delete_users(
        user_ids: list[str],
        current_admin: UserWithUUID = Depends(get_current_admin)
):
    valid_user_ids = validate_ids(user_ids)
    admin_id = ObjectId(current_admin.id)

    await verify_users_created_by_same_admin(valid_user_ids, admin_id=admin_id)

    # Ensure that the users to be deleted were created by the current admin
    # We've confirmed that they were all created by current admin
    query = {"_id": {"$in": valid_user_ids}}

    # Attempt to delete users matching the query
    deleted_results = await user_collection.delete_many(query)

    if deleted_results.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="No users deleted")

    return {"message": f"{deleted_results.deleted_count} user(s) deleted successfully", "success": True}


@router.put("/update/users", response_description="Update multiple users",
            response_model=dict[str, int | list[UserWithUUID]])
async def update_users(
        user_updates: list[OptionalUserUpdates],
        user_ids: list[str],
        current_admin: UserWithUUID = Depends(get_current_admin)
):
    if len(user_updates) != len(user_ids):
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE,
                            detail="Mismatch between phone numbers and update data. Ensure that each phone number has "
                                   "a corresponding update entry.")

    # Ensure all provided user_ids are valid ObjectIds
    valid_user_ids = [ObjectId(user_id) for user_id in user_ids if ObjectId.is_valid(user_id)]

    # Fetch the users from the database
    users = await user_collection.find({"_id": {"$in": valid_user_ids}}).to_list(length=len(valid_user_ids))

    if len(users) != len(valid_user_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Some users were not found")

    # Check if the current admin is allowed to update these users
    update_operations = []
    for user in users:
        if user.get("created_by") != current_admin.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You do not have permission to update one or more of these users")

        # Prepare updates with password hashing if necessary
        for index, user_update in enumerate(user_updates):
            update_data = user_update.model_dump(exclude_unset=True)  # Get update fields
            if not update_data:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields provided")

            # Check if password is being updated and hash it
            if "password" in update_data and bool(update_data["password"]):
                if len(update_data["password"]) < 8:
                    raise HTTPException(status_code=status.http.HTTP_BAD_REQUEST,
                                        detail="Password must be at least 8 characters long")
                update_data["hashed_password"] = get_password_hash(update_data["password"])

            # Create update operation
            update_operations.append(
                UpdateOne({"_id": valid_user_ids[index], "created_by": current_admin.id}, {"$set": update_data})
            )

    # Perform bulk update
    result = await user_collection.bulk_write(update_operations)

    # Fetch updated users
    updated_users = await user_collection.find({"_id": {"$in": valid_user_ids}}).to_list(length=len(valid_user_ids))

    return {"modified": result.modified_count, "users": updated_users}


@router.get("/numbers", response_model=List[VonageNumberWithUsers])
async def get_numbers(
        current_admin: UserWithUUID = Depends(get_current_admin)
) -> List[VonageNumberWithUsers]:
    pipeline = [
        {
            '$match': {
                '_id': ObjectId(current_admin.id)
            }
        }, {
            '$unwind': '$numbers'
        }, {
            '$lookup': {
                'from': 'users',
                'let': {
                    'msisdn': '$numbers.msisdn'
                },
                'pipeline': [
                    {
                        '$unwind': '$numbers'
                    },
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$numbers.msisdn', '$$msisdn'
                                ]
                            },
                            'is_admin': False,
                            'created_by': current_admin.id
                        }
                    }, {
                        '$project': {
                            '_id': 1,
                            'username': 1,
                            'email': 1,
                            'first_name': 1,
                            'last_name': 1,
                            'company': 1
                        }
                    }
                ],
                'as': 'associated_users'
            }
        }, {
            '$group': {
                '_id': '$_id',
                'numbers': {
                    '$push': {
                        'msisdn': '$numbers.msisdn',
                        'country': '$numbers.country',
                        'type': '$numbers.type',
                        'features': '$numbers.features',
                        'users': '$associated_users'
                    }
                }
            }
        }, {
            '$project': {
                '_id': 0,
                'numbers': 1
            }
        },
        # {
        #     '$replaceRoot': {
        #         'newRoot': '$numbers'
        #     }
        # }
    ]

    numbers_with_users = []
    aggregate = await user_collection.aggregate(pipeline).to_list(length=None)
    if len(aggregate):
        numbers_with_users = aggregate[0].get("numbers")

    print(numbers_with_users)
    return numbers_with_users


@router.get("/numbers/search", response_model=VonageNumberSearchResult)
async def search_numbers(
        page: int = 1,
        size: int = 10,
        current_admin: UserWithUUID = Depends(get_current_admin)
) -> VonageNumberSearchResult:
    print("PAGE: ", page, "SIZE: ", size)
    numbers = vonage_client.numbers.get_available_numbers(country_code='US', size=size,
                                                          features=['SMS', 'MMS', 'VOICE'],
                                                          type='mobile-lvn', index=page)
    debug(numbers)
    return numbers


@router.post("/numbers/buy", response_model=BaseResponse)
async def buy_numbers(
        number: VonageNumberSearch = Body(),
        current_admin: UserWithUUID = Depends(get_current_admin)
) -> BaseResponse:
    buy_number = acquire_number(number.model_dump())
    if not buy_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not purchase number")

    print(current_admin.id, number.model_dump())
    await user_collection.update_one({"_id": ObjectId(current_admin.id)}, {"$push": {"numbers": number.model_dump()}})
    return BaseResponse(status=status.HTTP_200_OK, message=f"{number.msisdn} purchased successfully", success=True)


@router.post("/numbers/assign", response_model=BaseResponse)
async def assign_numbers(
        number: VonageNumber = Body(),
        user: PyObjectId = Body(),
        current_admin: UserWithUUID = Depends(get_current_admin)
) -> BaseResponse:
    user_id = ObjectId(user)

    # Step 1: Add the number to users who don't already have it
    result = await user_collection.update_one(
        {
            "_id": user_id,  # Only for the selected users
            "numbers.msisdn": {"$ne": number.msisdn},  # Ensure the number is not already assigned
            "is_admin": False  # Only assign to non-admins
        },
        {"$addToSet": {"numbers": number.model_dump()}}  # Add the number to their numbers array
    )

    # Step 2: Remove the number from users not in the list of users but who already have the number
    await user_collection.update_one(
        {
            "numbers.msisdn": number.msisdn,  # Users who currently have the number
            "_id": {"$ne": user_id},  # Users not in the selected list
            "is_admin": False  # Only remove from non-admins
        },
        {"$pull": {"numbers": {"msisdn": number.msisdn}}}  # Remove the number from their numbers array
    )

    return BaseResponse(status=status.HTTP_200_OK, message="Users assigned successfully", success=True)

# Implement checks for new "/numbers" endpoints


# @router.post("/numbers/assign", response_model=BaseResponse)
# async def assign_numbers(
#         number: VonageNumber = Body(),
#         users: List[PyObjectId] = Body(),
#         current_admin: UserWithUUID = Depends(get_current_admin)
# ) -> BaseResponse:
#     user_ids = [ObjectId(uid) for uid in users]
#
#     # Step 1: Add the number to users who don't already have it
#     result = await user_collection.update_many(
#         {
#             "_id": {"$in": user_ids},  # Only for the selected users
#             "numbers.msisdn": {"$ne": number.msisdn},  # Ensure the number is not already assigned
#             "is_admin": False  # Only assign to non-admins
#         },
#         {"$addToSet": {"numbers": number.model_dump()}}  # Add the number to their numbers array
#     )
#
#     # Step 2: Remove the number from users not in the list of users but who already have the number
#     await user_collection.update_many(
#         {
#             "numbers.msisdn": number.msisdn,  # Users who currently have the number
#             "_id": {"$nin": user_ids},  # Users not in the selected list
#             "is_admin": False  # Only remove from non-admins
#         },
#         {"$pull": {"numbers": {"msisdn": number.msisdn}}}  # Remove the number from their numbers array
#     )
#
#     return BaseResponse(status=status.HTTP_200_OK, message="Users assigned successfully", success=True)
#
# # Implement checks for new "/numbers" endpoints
