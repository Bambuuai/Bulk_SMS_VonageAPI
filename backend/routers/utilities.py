from bson import ObjectId
from fastapi import status, HTTPException
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from database import user_collection, dnc_collection
from utilities import debug


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
