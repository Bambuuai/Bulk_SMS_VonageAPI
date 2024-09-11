from datetime import datetime, timezone
from math import ceil
from typing import List, Annotated, Optional

from bson import ObjectId
from celery.result import AsyncResult
from fastapi import Depends, APIRouter, HTTPException, status, Body
from pymongo import ReturnDocument
from vonage_utils.types import PhoneNumber

from database import contact_collection, sms_campaign_collection, sms_queue_collection, campaign_chat_collection, \
    messages_collection
from environment import MESSAGE_STATUS_URL
from models.auth_models import UserWithMSI
from models.base_models import PyObjectId, BaseResponse
from models.sms_models import SMSCampaign, SMSCampaignQueue, SMSCampaignStatus, CampaignChat, SMSCampaignForm, \
    SMSCampaignFromDB, SMSCampaignQueueWithCampaign, QueueStatusUpdate, Message, CampaignWithMsg, ChatContacts, Reply, \
    MessageStatus
from utilities import debug, to_pst, validate_message
from vonage_api import vonage_client
from worker import send_bulk_sms
from .auth import get_current_active_user  # Import the auth dependency for user authentication

router = APIRouter(prefix="/sms", tags=["sms"])


@router.get("/campaigns", response_model=List[SMSCampaignFromDB])
async def list_sms_campaigns(current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]):
    campaigns = await sms_campaign_collection.find({"created_by": current_user.id}).to_list(length=100)
    return campaigns


@router.post("/campaigns", response_model=SMSCampaignFromDB)
async def create_sms_campaign(campaign_data: SMSCampaignForm,
                              current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]):
    # Step 1: Fetch all groups from the contacts created by the current user
    validate_message(campaign_data.message)
    user_contacts = await contact_collection.find({"created_by": current_user.id}).to_list(length=None)
    existing_groups = {group for contact in user_contacts for group in contact['groups']}

    # Step 2: Check if all groups in campaign_data.contact_groups exist
    missing_groups = [group for group in campaign_data.contact_groups if group not in existing_groups]
    debug(existing_groups, "-------------================------------------", missing_groups)
    if missing_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The following contact group(s) do(es) not exist: {', '.join(missing_groups)}"
        )
    debug(campaign_data.contact_groups)

    # Create campaign
    campaign = SMSCampaign(**campaign_data.model_dump(), created_by=current_user.id,
                           created_at=datetime.now(timezone.utc), updated_at=None)
    debug(campaign.model_dump(by_alias=True, exclude_unset=True))
    result = await sms_campaign_collection.insert_one(campaign.model_dump(by_alias=True, exclude_unset=True))
    new_campaign = await sms_campaign_collection.find_one({"_id": result.inserted_id})

    # now = datetime.now(timezone.utc)
    # if new_campaign:
    #     queue_id = str(new_campaign.get("_id"))
    #     # celery_task = send_bulk_sms.delay(str(new_campaign.get("_id")), current_user.id)
    #     if new_campaign.get("schedule_now", False):
    #         # Run the campaign immediately
    #         celery_task = send_bulk_sms.delay(str(queue_id), current_user.id)
    #     if new_campaign.get("schedule_time", None):
    #         # Calculate the delay until the scheduled time
    #         sch_time = new_campaign.get("schedule_time", None)
    #         schedule_time = sch_time.replace(tzinfo=timezone.utc)
    #         delay = (schedule_time - now).total_seconds()
    #
    #         if delay > 0:
    #             celery_task = send_bulk_sms.apply_async(
    #                 (str(queue_id), current_user.id),
    #                 countdown=delay
    #             )
    #         else:
    #             # If the scheduled time has already passed, run it immediately
    #             celery_task = send_bulk_sms.delay(str(queue_id), current_user.id)
    #
    #     # Update the task_id in the queue entry
    #     await sms_queue_collection.update_one(
    #         {"_id": queue_id},
    #         {"$set": {"task_id": celery_task.id}}
    #     )

    if not new_campaign:
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY, detail="Failed to create SMS campaign")

    return new_campaign


@router.delete("/campaigns", response_model=BaseResponse)
async def delete_campaign_queues(
        campaign_ids: Annotated[List[PyObjectId], Body()],
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]
):
    # Find and delete the queue entries that match the given IDs and belong to the current user
    deleted_entries = await sms_campaign_collection.find(
        {"_id": {"$in": [ObjectId(cid) for cid in campaign_ids]}, "created_by": current_user.id}
    ).to_list(len(campaign_ids))

    debug(deleted_entries, campaign_ids)
    if len(deleted_entries) != len(campaign_ids):
        found_ids = {str(c["_id"]) for c in deleted_entries}
        missing_ids = [cid for cid in campaign_ids if cid not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaigns {','.join(missing_ids)} not found or unauthorized"
        )

    # Delete the found queue entries
    result = await sms_campaign_collection.delete_many(
        {"_id": {"$in": [entry["_id"] for entry in deleted_entries]}, "created_by": current_user.id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No campaigns were deleted"
        )

    return BaseResponse(status=status.HTTP_204_NO_CONTENT,
                        message=f"{result.deleted_count} Campaign{'(s)' if result.deleted_count > 1 else ''} deleted",
                        success=True)


@router.get("/queue", response_model=List[SMSCampaignQueueWithCampaign])
async def list_sms_campaign_queue(current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]):
    # Fetch all queued campaigns created by the current user
    queued_campaigns = await sms_queue_collection.find(
        {"created_by": current_user.id}
    ).to_list(length=None)

    if not queued_campaigns:
        raise HTTPException(status_code=404, detail="No queued campaigns found.")

    # Fetch details of the campaigns
    campaign_ids = [ObjectId(queue['campaign_id']) for queue in queued_campaigns]
    # debug(campaign_ids)

    campaigns = await sms_campaign_collection.find(
        {"_id": {"$in": campaign_ids}}
    ).to_list(length=None)

    campaign_map = {str(campaign['_id']): campaign for campaign in campaigns}
    # debug(campaigns, campaign_map)

    # Add campaign details to each queue entry
    queued_campaigns_with_details = []
    for queue in queued_campaigns:
        campaign_id = queue['campaign_id']
        campaign_details = campaign_map.get(campaign_id)
        if campaign_details:
            queue_with_details = {
                **queue,
                "campaign": campaign_details  # Add the campaign details
            }
            queued_campaigns_with_details.append(queue_with_details)

    return queued_campaigns_with_details


@router.post("/queue", response_model=List[SMSCampaignQueue])
async def add_campaigns_to_queue(
        campaign_ids: Annotated[List[PyObjectId], Body()],
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)],
):
    # Fetch all campaigns in a single query
    campaigns = await sms_campaign_collection.find(
        {"_id": {"$in": [ObjectId(cid) for cid in campaign_ids]}, "created_by": current_user.id}
    ).to_list(len(campaign_ids))

    if len(campaigns) != len(campaign_ids):
        found_ids = {str(c["_id"]) for c in campaigns}
        missing_ids = [str(cid) for cid in campaign_ids if str(cid) not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign(s) {', '.join(missing_ids)} not found or unauthorized"
        )

    # Prepare queue entries
    now = datetime.now(timezone.utc)
    new_queue_data = []

    for campaign in campaigns:
        campaign_contacts = await contact_collection.count_documents(
            {"created_by": campaign["created_by"], "groups": {"$in": campaign["contact_groups"]}}
        )

        if campaign_contacts == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No contacts found for campaign '{campaign['_id']}'"
            )

        total_batches = ceil(campaign_contacts / campaign["batch_size"])

        # Create the queue entry
        queue_data = SMSCampaignQueue(
            campaign_id=campaign["_id"],
            status=SMSCampaignStatus.scheduled,
            current_batch=0,
            total_batches=total_batches,
            created_at=now,
            created_by=current_user.id,  # Store the user ID
        )
        queue_entry = queue_data.model_dump(exclude_unset=True, by_alias=True)
        new_queue_data.append(queue_entry)

    # Insert all queue entries in a single operation
    result = await sms_queue_collection.insert_many(new_queue_data)

    # Schedule SMS sending tasks
    for queue_id, campaign in zip(result.inserted_ids, campaigns):
        celery_task = None
        debug("Starting task soon: ", queue_id, campaign)
        sch_time = campaign.get("schedule_time", None)
        if not sch_time:
            # Run the campaign immediately
            celery_task = send_bulk_sms.delay(str(queue_id), current_user.id)
        if sch_time:
            # Calculate the delay until the scheduled time
            schedule_time = sch_time.replace(tzinfo=timezone.utc)
            delay = (schedule_time - now).total_seconds()

            if delay > 0:
                celery_task = send_bulk_sms.apply_async(
                    (str(queue_id), current_user.id),
                    countdown=delay
                )
            else:
                # If the scheduled time has already passed, run it immediately
                celery_task = send_bulk_sms.delay(str(queue_id), current_user.id)

        # Update the task_id in the queue entry
        await sms_queue_collection.update_one(
            {"_id": queue_id},
            {"$set": {"task_id": celery_task.id}}
        )

    # Retrieve and return the inserted queue entries
    queue_entries = await sms_queue_collection.find(
        {"_id": {"$in": result.inserted_ids}}
    ).to_list(len(result.inserted_ids))

    return queue_entries


@router.delete("/queue", response_model=BaseResponse)
async def delete_campaign_queues(
        campaign_queue_ids: Annotated[List[PyObjectId], Body()],
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]
):
    # Find and delete the queue entries that match the given IDs and belong to the current user
    deleted_entries = await sms_queue_collection.find(
        {"_id": {"$in": [ObjectId(cq_id) for cq_id in campaign_queue_ids]}, "created_by": current_user.id}
    ).to_list(len(campaign_queue_ids))

    debug(deleted_entries, campaign_queue_ids)
    if len(deleted_entries) != len(campaign_queue_ids):
        found_ids = {str(c["_id"]) for c in deleted_entries}
        missing_ids = [cid for cid in campaign_queue_ids if cid not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entries {','.join(missing_ids)} not found or unauthorized"
        )

    # Delete the found queue entries
    result = await sms_queue_collection.delete_many(
        {"_id": {"$in": [entry["_id"] for entry in deleted_entries]}, "created_by": current_user.id}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No queue entries were deleted"
        )

    return BaseResponse(status=status.HTTP_204_NO_CONTENT,
                        message=f"{result.deleted_count} Campaign{'(s)' if result.deleted_count > 1 else ''} removed from queue",
                        success=True)


@router.put("/queue/update", response_model=BaseResponse)
async def update_queue_status(
        status_updates: List[QueueStatusUpdate],
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]
):
    for update in status_updates:
        queue_id = update.queue_id
        new_status = update.status

        # Find the queue entry by ID
        queue_entry = await sms_queue_collection.find_one({"_id": ObjectId(queue_id)})
        if not queue_entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Queue entry not found")

        task_id = queue_entry.get("task_id")
        if not task_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task ID for queue not found")

        celery_task = AsyncResult(task_id)
        if not celery_task:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This task does not exist")
        debug(celery_task.state)

        # Handle status updates based on the new status
        if new_status == SMSCampaignStatus.paused:
            if celery_task.state == "STARTED":
                celery_task.revoke(terminate=True, signal="SIGABRT")
                await sms_queue_collection.update_one(
                    {"_id": ObjectId(queue_id)},
                    {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
                )
            else:
                raise HTTPException(status_code=400, detail=f"Task is not running, cannot pause.")

        elif new_status == SMSCampaignStatus.cancelled:
            if celery_task.state in ["STARTED", "RETRY", "PENDING"]:
                celery_task.revoke(terminate=True, signal="SIGTERM")
                await sms_queue_collection.update_one(
                    {"_id": ObjectId(queue_id)},
                    {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
                )
            else:
                raise HTTPException(status_code=400, detail=f"Task is not running or retrying, cannot cancel.")

        # elif new_status == SMSCampaignStatus.scheduled:
        #     if celery_task.state == "PENDING":
        #         await sms_queue_collection.update_one(
        #             {"_id": ObjectId(queue_id)},
        #             {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
        #         )
        #     else:
        #         raise HTTPException(status_code=400, detail=f"Task is not in a pending state, cannot schedule.")

        elif new_status == SMSCampaignStatus.in_progress:
            if celery_task.state == "PENDING":
                celery_task.revoke(terminate=True)
                new_task = send_bulk_sms.delay(queue_id, current_user.id)
                await sms_queue_collection.update_one(
                    {"_id": ObjectId(queue_id)},
                    {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc), "task_id": new_task.id}}
                )
            else:
                raise HTTPException(status_code=400, detail=f"Task is not scheduled or paused, cannot start.")

    return BaseResponse(message="Queue statuses updated successfully", success=True)


@router.get("/chats", response_model=List[CampaignWithMsg])
async def get_campaign_chats(
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> List[CampaignWithMsg]:
    pipeline = [
        {
            '$match': {
                'sender_did': {
                    '$exists': True
                },
                'recipient_did': {
                    '$exists': True
                },
                'campaigns': {
                    '$exists': True,
                    '$ne': None
                },
                'user_id': {
                    '$eq': None
                }
            }
        }, {
            '$unwind': '$campaigns'
        }, {
            '$addFields': {
                'campaignObjectId': {
                    '$toObjectId': '$campaigns'
                }
            }
        }, {
            '$group': {
                '_id': '$campaignObjectId',
                'totalReplies': {
                    '$sum': 1
                }
            }
        }, {
            '$lookup': {
                'from': 'sms campaign',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'campaign_details'
            }
        }, {
            '$unwind': '$campaign_details'
        }, {
            '$match': {
                'campaign_details.created_by': {
                    '$eq': current_user.id
                }
            }
        }, {
            '$project': {
                '_id': 1,
                'totalReplies': 1,
                'name': '$campaign_details.name',
                'message': '$campaign_details.message',
                'sender_msisdn': '$campaign_details.sender_msisdn'
            }
        }
    ]

    campaigns_with_messages = await messages_collection.aggregate(pipeline).to_list(length=None)
    print(campaigns_with_messages)

    return campaigns_with_messages

    # if not chat:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign chat not found or unauthorized")
    # return chat


@router.get("/chats/{campaign_id}", response_model=List[ChatContacts])
async def get_chat_contacts(campaign_id: PyObjectId,
                            current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> List[
    ChatContacts]:
    msg_contacts_pipeline = [
        {
            '$match': {
                'campaigns': campaign_id,
                'user_id': {
                    '$ne': None
                }
            }
        }, {
            '$lookup': {
                'from': 'messages',
                'let': {
                    'original_recipient': '$recipient_did',
                    'original_sender': '$sender_did'
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$and': [
                                    {
                                        '$eq': [
                                            '$sender_did', '$$original_recipient'
                                        ]
                                    }, {
                                        '$eq': [
                                            '$recipient_did', '$$original_sender'
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                'as': 'replies'
            }
        }, {
            '$match': {
                'replies': {
                    '$ne': []
                }
            }
        }, {
            '$group': {
                '_id': {
                    'original_sender': '$sender_did',
                    'original_recipient': '$recipient_did'
                }
            }
        }, {
            '$project': {
                '_id': 0,
                'original_sender': '$_id.original_sender',
                'original_recipient': '$_id.original_recipient'
            }
        }, {
            '$lookup': {
                'from': 'contact',
                'localField': 'original_recipient',
                'foreignField': 'phone_number',
                'as': 'contact_info'
            }
        }, {
            '$project': {
                'original_sender': 1,
                'original_recipient': 1,
                'info': {
                    '$arrayElemAt': [
                        '$contact_info', 0
                    ]
                }
            }
        }
    ]

    contacts = await messages_collection.aggregate(msg_contacts_pipeline).to_list(length=None)
    if not contacts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No chats for this campaign")
    return contacts


@router.get("/chats/{campaign_id}/{contact_phone}", response_model=List[Message])
async def get_chat(campaign_id: PyObjectId, contact_phone: PhoneNumber,
                   current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> List[CampaignChat]:
    print(campaign_id, contact_phone)
    chat_pipeline = [
        {
            '$match': {
                'campaigns': campaign_id,
                '$or': [
                    {
                        'sender_did': contact_phone
                    }, {
                        'recipient_did': contact_phone
                    }
                ]
            }
        }, {
            '$sort': {
                'sent_at': 1
            }
        }
    ]
    chat = await messages_collection.aggregate(chat_pipeline).to_list(length=None)
    print(chat)

    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign chat not found or unauthorized")
    return chat


@router.post("/chat/{campaign_id}/{contact_phone}/reply", response_model=Message)
async def reply_to_campaign_chat(campaign_id: PyObjectId, contact_phone: PhoneNumber,
                                 current_user: Annotated[UserWithMSI, Depends(get_current_active_user)],
                                 reply_data: Annotated[Reply, Body()]) -> Message:
    campaign = await sms_campaign_collection.find_one({'_id': ObjectId(campaign_id)})
    sms_resp = vonage_client.sms.send_message({
        "from": campaign["sender_msisdn"],
        "to": contact_phone,
        "text": reply_data.message,
        "type": "text",
        "callback": MESSAGE_STATUS_URL
    })

    if not sms_resp["messages"][0]["status"] == "0":
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED,
                            detail="An error occurred while sending the message")

    print("Message sent successfully.")
    message_id = sms_resp["messages"][0].get("message-id", None)
    msg_insert_res = await messages_collection.insert_one({
        "message_id": message_id,
        "sender_did": campaign["sender_msisdn"],
        "recipient_did": contact_phone,
        "campaign_id": campaign_id,
        "message": reply_data.message,
        "sent_at": to_pst(reply_data.sent_at),
        "user_id": current_user.id,
        "message_type": "text",
        "status": MessageStatus.unknown,
        "campaigns": [campaign_id]
    })

    message = await messages_collection.find_one({"_id": msg_insert_res.inserted_id})

    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign chat not found or unauthorized")
    return message


@router.post("/chat/{campaign_id}/dnc", response_model=CampaignChat)
async def add_to_dnc_list_from_chat(campaign_id: PyObjectId, phone_number: PhoneNumber,
                                    current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]):
    chat = await campaign_chat_collection.find_one({"campaign_id": campaign_id, "created_by": current_user.id})
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign chat not found or unauthorized")

    # Assuming a function or service to add the number to the DNC list
    # Example: await add_to_dnc(phone_number, current_user.id)

    chat = await campaign_chat_collection.find_one_and_update(
        {"campaign_id": campaign_id, "created_by": current_user.id},
        {"$set": {"dnc_added": True}},
        return_document=ReturnDocument.AFTER
    )
    return chat


@router.get("/messages/{phone_number}", response_model=List[Message])
async def get_message_history(phone_number: str,
                              current_user: Annotated[UserWithMSI, Depends(get_current_active_user)],
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None):
    query = {"phone_number": phone_number, "user_id": current_user.id}

    if start_date:
        query["sent_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("sent_at", {})["$lte"] = end_date

    messages = await messages_collection.find(query).sort("sent_at", 1).to_list(length=None)

    if not messages:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No messages found for this number")

    return messages


@router.get("/messages/count/{phone_number}")
async def get_message_count(phone_number: str,
                            start_date: Optional[datetime] = None,
                            end_date: Optional[datetime] = None):
    query = {"phone_number": phone_number}

    if start_date:
        query["sent_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("sent_at", {})["$lte"] = end_date

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$phone_number",
            "count": {"$sum": 1},
            "messages": {"$push": {"message_id": "$message_id", "sent_at": "$sent_at"}}
        }}
    ]

    result = await messages_collection.aggregate(pipeline).to_list(length=None)

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No messages found for this number")

    return result[0]


@router.get("/messages/report")
async def get_message_report(start_date: datetime,
                             end_date: datetime,
                             user_id: Optional[str] = None):
    query = {"sent_at": {"$gte": start_date, "$lte": end_date}}

    if user_id:
        query["user_id"] = user_id

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$user_id",
            "total_messages": {"$sum": 1},
            "messages": {"$push": {"phone_number": "$phone_number", "message_id": "$message_id", "sent_at": "$sent_at"}}
        }}
    ]

    report = await messages_collection.aggregate(pipeline).to_list(length=None)

    return report

# contact_groups = {}
# dnc_contacts = await dnc_collection.find(
#     {"created_by": {"$in": [current_user.id, current_user.created_by]}}).to_list(
#     length=None)
# dnc_phone_numbers = [contact["phone_number"] for contact in dnc_contacts]
#
# filtered_contacts = [contact for contact in user_contacts if
#                      contact["phone_number"] not in dnc_phone_numbers and set(contact["groups"]) & set(campaign_data)]
# for group in campaign_data.contact_groups:
#     contact_groups[group] = [contact for contact in user_contacts if
#                              group in contact["groups"] and contact["phone_number"] not in dnc_phone_numbers]
#
# debug(contact_groups)
# for arr in contact_groups.values():
#     if not arr:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
#                             detail="You have provided an empty contact group")
