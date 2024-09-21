import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Type, Optional, get_type_hints

import pytz
from bson import ObjectId
from fastapi import HTTPException, status
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from itsdangerous import URLSafeTimedSerializer, BadTimeSignature, SignatureExpired, BadSignature
from pydantic import BaseModel, create_model, ConfigDict, EmailStr

from database import dnc_collection, contact_collection, sms_queue_collection
from environment import APP_ENVIRONMENT, SECRET_KEY, SMTP_PASSWORD, SMTP_PORT, SMTP_USERNAME, SMTP_SERVER, SMTP_DOMAIN
from vonage_api import vonage_client

logging.basicConfig(level=logging.DEBUG, filename='app.log', filemode='a',
                    format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger('utilities')
logger.setLevel(logging.INFO)

ACCEPTED_MSG_VARS = ['{name}', '{phone_number}']
pst_tz = pytz.timezone('US/Pacific')


def to_pst(utc_input):
    """Example input: 2024-09-10T23:42:27.646Z"""
    if type(utc_input) == str:
        utc_input = datetime.strptime(utc_input, '%Y-%m-%dT%H:%M:%S.%fZ')
    utc_time = utc_input.replace(tzinfo=pytz.utc)

    pst_time = utc_time.astimezone(pst_tz)
    return pst_time


def validate_message(message: str):
    # Find all placeholders in the message
    placeholders = re.findall(r'{(.*?)}', message)

    for placeholder in placeholders:
        # Ensure the placeholder is in the list of accepted variables
        if f"{{{placeholder}}}" not in ACCEPTED_MSG_VARS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid placeholder '{placeholder}' in message. Allowed variables: {', '.join(ACCEPTED_MSG_VARS)}"
            )
    return message


token_algo = URLSafeTimedSerializer(SECRET_KEY, salt='activate_email')
conf = ConnectionConfig(
    MAIL_USERNAME=SMTP_USERNAME,
    MAIL_PASSWORD=SMTP_PASSWORD,
    MAIL_FROM=SMTP_DOMAIN,
    MAIL_PORT=SMTP_PORT,
    MAIL_SERVER=SMTP_SERVER,
    MAIL_FROM_NAME="Bulk SMS App",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=Path(__file__).parent / 'templates',
)


def debug(*args, **kwargs):
    if APP_ENVIRONMENT and APP_ENVIRONMENT == "development":
        return print(*args, **kwargs)
    else:
        return None


def validate_ids(user_ids: list[str]):
    valid_user_ids = [ObjectId(user_id) for user_id in user_ids if ObjectId.is_valid(user_id)]

    if not valid_user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    return valid_user_ids


def make_optional_fields(model: Type[BaseModel], config: ConfigDict = {}, model_name: str = "",
                         exceptions: list[str] = [],
                         exclude: list[str] = []) -> Type[BaseModel]:
    if not model_name:
        model_name = model.__name__ + "Optional"

    # Collect annotations from all ancestor classes
    annotations = {}

    # Traverse the class hierarchy (MRO) to collect fields from all ancestor classes
    for cls in model.__mro__[::-1]:
        if issubclass(cls, BaseModel):
            # Get annotations from the current class
            cls_annotations = get_type_hints(cls)
            for field, field_type in cls_annotations.items():
                if field in exclude:
                    continue

                # Check if the field is in exceptions (i.e., must be required)
                if field in exceptions:
                    annotations[field] = field_type  # Required field
                else:
                    # Make the field optional by wrapping it with Optional
                    annotations[field] = Optional[field_type]

    # Create the new model with the updated annotations
    return create_model(
        model_name,
        **{k: (v, ...) if k in exceptions else (v, None) for k, v in annotations.items()},
        __config__=config
    )

    # return create_model(model_name, **{k: (v, ...) for k, v in annotations.items()})


def convert_to_string(value: any) -> str:
    global string
    if isinstance(value, int):
        string = str(value)
    if isinstance(value, float):
        string = str(int(value))
    if isinstance(value, str):
        string = "".join(value.split("."))

    return string


def is_valid_phone_number(number: str) -> bool:
    pattern = re.compile(r'^[1-9]\d{6,14}$')  # Phone number must be 7 to 15 digits long, and cannot start with 0 or +
    return bool(pattern.match(number))


async def retrieve_contacts(
        campaign_data,
        current_user
):
    # Step 1: Aggregate all groups and corresponding contacts created by the current user
    pipeline = [
        {"$match": {"created_by": current_user.id}},
        {"$unwind": "$groups"},
        {"$group": {
            "_id": "$groups",
            "contacts": {"$push": {
                "phone_number": "$phone_number",
                "name": "$name",
                "contact_id": "$_id"
            }}
        }},
        {"$match": {"_id": {"$in": campaign_data.contact_groups}}}
    ]

    user_contacts_grouped = await contact_collection.aggregate(pipeline).to_list(length=None)

    # Step 2: Check for missing groups
    existing_groups = {group["_id"] for group in user_contacts_grouped}
    missing_groups = [group for group in campaign_data.contact_groups if group not in existing_groups]

    if missing_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The following contact group(s) do(es) not exist: {', '.join(missing_groups)}"
        )

    # Step 3: Fetch DNC contacts in bulk (only once)
    dnc_contacts = await dnc_collection.find(
        {"created_by": {"$in": [current_user.id, current_user.created_by]}}
    ).to_list(length=None)
    dnc_phone_numbers = {contact["phone_number"] for contact in dnc_contacts}

    # Step 4: Filter out DNC contacts from the results
    contact_groups = {}
    for group in user_contacts_grouped:
        filtered_contacts = [contact for contact in group["contacts"] if
                             contact["phone_number"] not in dnc_phone_numbers]
        if not filtered_contacts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The contact group '{group['_id']}' contains only DNC phone numbers or is empty."
            )
        contact_groups[group["_id"]] = filtered_contacts

    return contact_groups


async def retrieve_queues(campaign_data, current_user):
    try:
        pipeline = [
            {
                "$match": {
                    "created_by": ObjectId(current_user.id)  # Filter by user_id
                }
            },
            {
                "$lookup": {
                    "from": "sms campaign",  # The campaign collection name
                    "localField": "campaign_id",
                    "foreignField": "_id",
                    "as": "campaign_details"
                }
            },
            {
                "$unwind": "$campaign_details"  # Flatten the result if there's only one campaign per queue
            }
        ]

        queued_campaigns = await sms_queue_collection.aggregate(pipeline).to_list(length=None)
        debug(queued_campaigns)

        if not queued_campaigns:
            raise HTTPException(status_code=404, detail="No queued campaigns found for this user.")

        return queued_campaigns

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving queued campaigns: {str(e)}")


def generate_email_token(email: EmailStr):
    _token = token_algo.dumps(email)
    return _token


def verify_email_token(token: str):
    try:
        email = token_algo.loads(token, max_age=1800)
    except SignatureExpired:
        return None
    except BadTimeSignature:
        return None
    except BadSignature:
        return None

    if not email:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Invalid url")
    return {'email': email, 'check': True}


async def send_mail(recipients, subject, body, template):
    print("Task is being run")
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        template_body=body,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message, template_name=template)
    return True


def acquire_number(number=None):
    if not number:
        available_numbers = vonage_client.numbers.get_available_numbers('US', size=10, features=['SMS', 'MMS', 'VOICE'],
                                                                        type='mobile-lvn')
        number = available_numbers["numbers"][0]
    debug(number)
    vonage_number = {"country": number["country"], "msisdn": number["msisdn"]}
    buy_number = vonage_client.numbers.buy_number(vonage_number)
    if buy_number["error-code"] == "200":
        debug("Acquired MSISDN: ", number["msisdn"])

        vonage_client.numbers.update_number({
            **vonage_number,
            "moHttpUrl": "https://duly-famous-satyr.ngrok-free.app/messages/inbound"
        })

        return number
    else:
        raise HTTPException(status_code=status.HTTP_424_FAILED_DEPENDENCY,
                            detail=f"Sorry, we couldn't assign a number to your account | Error {buy_number['error-code']} {buy_number['error-code-label']}")
