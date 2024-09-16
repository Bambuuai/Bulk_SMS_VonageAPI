from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import DuplicateKeyError, BulkWriteError
from vonage_jwt.verify_jwt import verify_signature

from database import user_collection, dnc_collection, contact_collection, sms_campaign_collection, messages_collection
from environment import VONAGE_SIGNATURE_SECRET
from models.auth_models import IdentityFields
from models.base_models import BaseResponse
from models.dnc_models import DNCEntry
from models.sms_models import MessageStatus, MessageType
from routers import admin
from routers import auth, user, dnc, profile, campaign
from utilities import debug, logger, verify_email_token, pst_tz

tags = []


@asynccontextmanager
async def lifespan(fastapp: FastAPI):
    user_collection.create_index({"username": 1}, unique=True)
    user_collection.create_index({"email": 1}, unique=True)
    user_collection.create_index({"created_by": 1})
    dnc_collection.create_index({"phone_number": 1, "created_by": 1}, unique=True)
    contact_collection.create_index({"phone_number": 1, "created_by": 1, "group": 1}, unique=True)
    contact_collection.create_index({"groups": 1})
    sms_campaign_collection.create_index({"name": 1}, unique=True)
    messages_collection.create_index({"phone_number", 1})
    messages_collection.create_index({"sent_at", 1})

    logger.info("LOGGER WORKS")

    yield


app = FastAPI(openapi_tags=tags, lifespan=lifespan)
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://duly-famous-satyr.ngrok-free.app"
]

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(user.router)
app.include_router(dnc.router)
app.include_router(campaign.router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/activate/user/{token}", response_model=BaseResponse)
async def verify_user_email(token: str):
    email = ""
    token_data = verify_email_token(token)
    if token_data:
        email = token_data.get("email", False)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    user = await auth.get_user(IdentityFields.email, email)

    if not user.disabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already activated")

    # number = acquire_number()
    # user.msisdn = number["msisdn"]

    try:
        update = await user_collection.update_one({"email": email},
                                                  {"$set": {"disabled": False}})
    except Exception:
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY,
                            detail="Sorry, we couldn't update your account")

    # user = await user_collection.find_one({"_id": ObjectId(result.inserted_id)})
    return BaseResponse(status=status.HTTP_200_OK, message="Account activated", success=True)


def verify_vonage_signature(headers):
    auth_header = headers["authorization"].split()
    token = auth_header[1].strip()

    if verify_signature(token, VONAGE_SIGNATURE_SECRET):
        return True
    else:
        return False


@app.get("/messages/status", response_model=None)
async def receive_receipts(request: Request):
    # is_vonage = verify_vonage_signature(headers)
    status_info = dict(request.query_params)
    debug("STATUS HEADERS RECEIVED", status_info)
    await messages_collection.update_one(
        {"sender_did": status_info.get("to"), "recipient_did": status_info.get("msisdn"),
         "message_id": status_info.get("messageId")}, {"$set": {
            "status": status_info.get("status")
        }})
    return Response(status_code=status.HTTP_200_OK)
    # if not is_vonage:
    #     return HTTPStatus.BAD_REQUEST


@app.get("/messages/inbound", response_model=None)
async def receive_replies(request: Request):
    try:
        message_data = dict(request.query_params)
        message = message_data.get("text")
        sender_msisdn = message_data.get("msisdn")
        recipient_did = message_data.get("to")

        if message.lower() == "stop":
            matching_campaigns = await sms_campaign_collection.find({
                "sender_msisdn": recipient_did
            }).to_list(None)

            if matching_campaigns:
                # Collect unique users who created these campaigns
                user_ids = {campaign['created_by'] for campaign in matching_campaigns if
                            campaign["include_opt_out"] == True}
                dnc_list = []

                # Add the number to the DNC list for each user
                for user_id in user_ids:
                    dnc_contact = DNCEntry(
                        phone_number=sender_msisdn,
                        reason="Opted out",
                        added_at=datetime.now(pst_tz),
                        created_by=user_id,  # Use the campaign creator's user_id
                        scope="user"
                    )
                    dnc_list.append(dnc_contact.model_dump(exclude_unset=True))
                    debug(dnc_contact.model_dump(exclude_unset=True))

                if dnc_list:
                    try:
                        add_dnc = await dnc_collection.insert_many(dnc_list)
                        debug(f"Added to DNC: {add_dnc.inserted_ids}")
                    except DuplicateKeyError:
                        debug(f"Contact(s) already in DNC")
                    except BulkWriteError as e:
                        debug("Bulk write error occurred", e)
                else:
                    debug("Matching campaigns have disabled opt-out")
            else:
                print("No campaigns found with the matching sender_msisdn.")

            # TODO: Implement logic to get the user's id, instead of "admin"
            # dnc_contact = DNCEntry(phone_number=sender_msisdn, reason="Opted out", added_at=datetime.now(pst_tz),
            #                        created_by="admin", scope="user")
            # try:
            #     add_dnc = await dnc_collection.insert_one(dnc_contact.model_dump(exclude_unset=True))
            #     debug(add_dnc.inserted_id)
            # except DuplicateKeyError:
            #     print("Contact already in DNC")
            # debug(dnc_contact.model_dump(exclude_unset=True))
        # debug(message_data)

        timestamp_format = "%Y-%m-%d %H:%M:%S"
        message_datetime = datetime.strptime(message_data.get("message-timestamp"), timestamp_format)
        debug("Converted datetime:", message_datetime)

        related_campaign_ids = []
        related_user_ids = []
        contact = await contact_collection.find_one({"phone_number": sender_msisdn})
        if contact:
            related_campaigns = await sms_campaign_collection.find(
                {"contact_groups": {"$in": contact["groups"]}}
            ).to_list(length=None)

            # Extract campaign IDs
            related_campaign_ids = [str(campaign["_id"]) for campaign in related_campaigns]
            related_user_ids = [str(campaign["created_by"]) for campaign in related_campaigns]

        db_message = {
            "type": MessageType.reply,
            "message_type": message_data.get("type"),
            "sender_did": sender_msisdn,
            "recipient_did": recipient_did,
            "keyword": message_data.get("keyword"),
            "message_id": message_data.get("messageId"),
            "message": message,
            "sent_at": message_datetime,
            "status": MessageStatus.accepted,
            "campaigns": related_campaign_ids,
            "users": related_user_ids
        }

        results = await messages_collection.insert_one(db_message)
        debug(db_message, results)

        return Response(status_code=status.HTTP_200_OK)
    except Exception as error:
        print(error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)


@app.get("/special/progress", response_model=None)
async def receive_receipts(request: Request):
    # is_vonage = verify_vonage_signature(headers)
    status_info = dict(request.query_params)
    debug("STATUS HEADERS RECEIVED", status_info)
    await messages_collection.update_one(
        {"sender_did": status_info.get("to"), "recipient_did": status_info.get("msisdn"),
         "message_id": status_info.get("messageId")}, {"$set": {
            "status": status_info.get("status")
        }})
    return Response(status_code=status.HTTP_200_OK)
    # if not is_vonage:
    #     return HTTPStatus.BAD_REQUEST


@app.get("/special/replies", response_model=None)
async def receive_replies(request: Request):
    try:
        message_data = dict(request.query_params)
        message = message_data.get("text")
        sender_msisdn = message_data.get("msisdn")

        if message.lower() == "stop":
            dnc_contact = DNCEntry(phone_number=sender_msisdn, reason="Opted out", added_at=datetime.now(pst_tz),
                                   created_by="admin", scope="user")
            add_dnc = await dnc_collection.insert_one(dnc_contact.model_dump(exclude_unset=True))
            debug(add_dnc.inserted_id)
        # debug(message_data)

        timestamp_format = "%Y-%m-%d %H:%M:%S"
        message_datetime = datetime.strptime(message_data.get("message-timestamp"), timestamp_format)
        debug("Converted datetime:", message_datetime)

        related_campaign_ids = []
        related_user_ids = []
        contact = await contact_collection.find_one({"phone_number": sender_msisdn})
        if contact:
            related_campaigns = await sms_campaign_collection.find(
                {"contact_groups": {"$in": contact["groups"]}}
            ).to_list(length=None)

            # Extract campaign IDs
            related_campaign_ids = [str(campaign["_id"]) for campaign in related_campaigns]
            related_user_ids = [str(campaign["created_by"]) for campaign in related_campaigns]

        db_message = {
            "type": MessageType.reply,
            "message_type": message_data.get("type"),
            "sender_did": sender_msisdn,
            "recipient_did": message_data.get("to"),
            "keyword": message_data.get("keyword"),
            "message_id": message_data.get("messageId"),
            "message": message,
            "sent_at": message_datetime,
            "status": MessageStatus.accepted,
            "campaigns": related_campaign_ids,
            "users": related_user_ids
        }

        results = await messages_collection.insert_one(db_message)
        debug(db_message, results)

        return Response(status_code=status.HTTP_200_OK)
    except Exception as error:
        print(error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)


if __name__ == "__main__":
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    uvicorn.run("main:app", reload=True)

# TODO: Make sure only one number is assigned to one user
