import signal
import time
from datetime import datetime, timezone

from bson import ObjectId
from celery import Celery, Task
from celery.exceptions import Ignore
from celery.signals import task_prerun, task_revoked, task_failure, task_success
from pymongo import MongoClient
from pymongo import ReturnDocument

from environment import RABBIT_USER, RABBIT_PASSWORD, RABBIT_VHOST, MONGODB_URL, MESSAGE_STATUS_URL, MESSAGE_REPLY_URL
# from environment import WORKING_VONAGE_APPLICATION_ID, WORKING_VONAGE_APPLICATION_PRIVATE_KEY_PATH, \
#     WORKING_VONAGE_API_KEY, WORKING_VONAGE_API_SECRET
from models.sms_models import SMSCampaignStatus, SMSCampaignQueue, SMSCampaign, MessageStatus
from utilities import debug
from vonage_api import vonage_client

# vonage_client = vonage.Client(key=WORKING_VONAGE_API_KEY, secret=WORKING_VONAGE_API_SECRET,
#                               application_id=WORKING_VONAGE_APPLICATION_ID,
#                               private_key=WORKING_VONAGE_APPLICATION_PRIVATE_KEY_PATH)

mongo_client = client = MongoClient(MONGODB_URL)
db = client['fastapi']
mongo_queue_collection = db['sms queue']
mongo_user_collection = db['users']
mongo_dnc_collection = db['dnc']
mongo_campaign_collection = db['sms campaign']
mongo_contact_collection = db['contact']
mongo_messages_collection = db['messages']

# localhost
celery = Celery(broker=f'amqp://{RABBIT_USER}:{RABBIT_PASSWORD}@localhost/{RABBIT_VHOST}', backend='rpc://')
# celery = Celery(broker=f'amqp://wsl_user:{RABBIT_PASSWORD}@172.20.252.207/{RABBIT_VHOST}', backend='rpc://')
celery.conf.update(
    task_track_started=True
)

throttle_map = {
    "low": 0.02,
    "medium": 0.01,
    "high": 0.007
}


async def pause_handler(signum, frame):
    print("SIGABRT received. Performing cleanup...")
    # k = update_sms_task(SMSCampaignStatus.paused, self.queue_id)
    # print(k)

    raise Ignore()


def cancel_handler(signum, frame):
    print("SIGTERM received. Performing cleanup...")

    raise Ignore()


def update_sms_task(status: SMSCampaignStatus, queue_id, retrieve=False):
    print("Calling update API")
    if retrieve:
        data = mongo_queue_collection.find_one_and_update(
            {"_id": ObjectId(queue_id)},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER)
    else:
        data = mongo_queue_collection.update_one(
            {"_id": ObjectId(queue_id)},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
        )
    print(data)

    return data


# async def main_bulk_task(self, queue_id: str, user_id: str):
#     # Retrieve the queue entry
#     queue_data = update_sms_task(SMSCampaignStatus.in_progress, queue_id, True)
#     if not queue_data:
#         raise Exception(f"Queue entry with ID {queue_id} not found")

#     debug(queue_data)
#     queue_entry = SMSCampaignQueue(**queue_data)

#     # Fetch the associated campaign
#     user_data = mongo_user_collection.find_one({"_id": ObjectId(user_id)})
#     campaign_data = mongo_campaign_collection.find_one({"_id": ObjectId(queue_entry.campaign_id)})

#     campaign = SMSCampaign(**campaign_data)
#     debug("CAMPAIGN: ", campaign_data, "--==--", "USER: ", user_data)
#     campaign_contacts = list(mongo_contact_collection.find(
#         {"created_by": user_id, "groups": {"$in": campaign.contact_groups}}
#     ))

#     # Fetch DNC contacts
#     dnc_phone_numbers = mongo_dnc_collection.find(
#         {"created_by": {"$in": [user_id, user_data["created_by"]]}}
#     ).distinct("phone_number")

#     # Filter out DNC contacts
#     filtered_contacts = [
#         contact for contact in campaign_contacts
#         if contact["phone_number"] not in dnc_phone_numbers
#     ]

#     if not filtered_contacts:
#         # Mark the campaign as failed if no valid contacts are available
#         update_sms_task(SMSCampaignStatus.failed, queue_id)
#         raise Exception("No valid contacts available to send SMS.")

#     # Determine the batch size
#     batch_size = campaign.batch_size
#     total_batches = queue_entry.total_batches
#     debug(batch_size, total_batches)

#     # Process each batch
#     for batch_num in range(queue_entry.current_batch, total_batches):
#         batch_contacts = filtered_contacts[batch_num * batch_size.value:(batch_num + 1) * batch_size.value]
#         successful_msgs = []
#         errored_msgs = []

#         # Send SMS to each contact in the batch
#         for contact in batch_contacts:
#             phone_number = contact["phone_number"]
#             response = vonage_client.sms.send_message({
#                 "from": campaign.sender_msisdn,
#                 "to": phone_number,
#                 "text": campaign.message
#             })

#             debug("MESSAGE RESPONSE: ", response)
#             if response["messages"][0]["status"] == "0":
#                 print("Message sent successfully.")
#             else:
#                 print(f"Message failed with error: {response['messages'][0]['error-text']}")

#             message_id = response["messages"][0].get("message-id", None)
#             message_info = {
#                 "message_id": message_id,
#                 "phone_number": phone_number,
#                 "campaign_id": campaign.id,
#                 "message": campaign.message,
#                 "sent_at": datetime.now(timezone.utc),
#                 "user_id": user_id
#             }
#             if message_id:
#                 successful_msgs.append(message_info)
#             else:
#                 errored_msgs.append(message_info)
#             # Handle response and logging as necessary
#             time.sleep(5)

#         if successful_msgs:
#             mongo_messages_collection.insert_many(successful_msgs)

#         if errored_msgs:
#             mongo_messages_collection.insert_many(errored_msgs)
#         # Update the queue entry's progress
#         mongo_queue_collection.update_one(
#             {"_id": ObjectId(queue_id)},
#             {"$set": {"current_batch": batch_num + 1, "updated_at": datetime.now(timezone.utc)}}
#         )

#         # Optional: Add a delay between batches if needed
#         # asyncio.sleep(queue_entry.get("throttle", 0))

#     # Mark the campaign as completed
#     self.update_state(state="SUCCESS")
#     update_sms_task(SMSCampaignStatus.completed, queue_id)


@celery.task(bind=True)
def send_bulk_sms(self, queue_id, user_id):
    self.track_started = True
    signal.signal(signal.SIGTERM, pause_handler)
    # Retrieve the queue entry
    queue_data = update_sms_task(SMSCampaignStatus.in_progress, queue_id, True)
    if not queue_data:
        raise Exception(f"Queue entry with ID {queue_id} not found")

    debug(queue_data)
    queue_entry = SMSCampaignQueue(**queue_data)

    # Fetch the associated campaign
    user_data = mongo_user_collection.find_one({"_id": ObjectId(user_id)})
    campaign_data = mongo_campaign_collection.find_one({"_id": ObjectId(queue_entry.campaign_id)})

    campaign = SMSCampaign(**campaign_data)
    debug("CAMPAIGN: ", campaign_data, "--==--", "USER: ", user_data)
    campaign_contacts = list(mongo_contact_collection.find(
        {"created_by": user_id, "groups": {"$in": campaign.contact_groups}}
    ))

    # Fetch DNC contacts
    dnc_phone_numbers = mongo_dnc_collection.find(
        {"created_by": {"$in": [user_id, user_data["created_by"]]}}
    ).distinct("phone_number")

    # Filter out DNC contacts
    filtered_contacts = [
        contact for contact in campaign_contacts
        if contact["phone_number"] not in dnc_phone_numbers
    ]

    if not filtered_contacts:
        # Mark the campaign as failed if no valid contacts are available
        self.update_state(state="FAILED")
        update_sms_task(SMSCampaignStatus.failed, queue_id)
        raise Exception("No valid contacts available to send SMS.")

    # Determine the batch size
    batch_size = campaign.batch_size
    total_batches = queue_entry.total_batches
    debug(batch_size, total_batches)
    message_type = "text"
    sender_number = campaign.sender_msisdn
    # sender_number = vonage_client.numbers.get_account_numbers()["numbers"][0]["msisdn"]
    vonage_client.numbers.update_number({
        "country": "US",
        "msisdn": sender_number,
        "moHttpUrl": MESSAGE_REPLY_URL
    })
    # campaign.sender_msisdn

    # Process each batch
    for batch_num in range(queue_entry.current_batch, total_batches):
        batch_contacts = filtered_contacts[batch_num * batch_size.value:(batch_num + 1) * batch_size.value]
        successful_msgs = []
        errored_msgs = []

        # Send SMS to each contact in the batch
        for contact in batch_contacts:
            phone_number = contact["phone_number"]
            personalized_message = campaign.message.replace("{name}", contact['name']).replace("{phone_number}",
                                                                                               contact['phone_number'])

            response = vonage_client.sms.send_message({
                "from": sender_number,
                "to": phone_number,
                "text": personalized_message,
                "type": message_type,
                "callback": MESSAGE_STATUS_URL
            })

            debug("MESSAGE RESPONSE: ", response)
            if response["messages"][0]["status"] == "0":
                print("Message sent successfully.")
            else:
                print(f"Message failed with error: {response['messages'][0]['error-text']}")

            # related_campaigns = list(mongo_campaign_collection.find(
            #     {"contact_groups": {"$in": contact["groups"]}}
            # ))

            # Extract campaign IDs
            # related_campaign_ids = [str(campaign["_id"]) for campaign in related_campaigns]
            message_id = response["messages"][0].get("message-id", None)

            message_info = {
                "message_id": message_id,
                "sender_did": sender_number,
                "recipient_did": phone_number,
                "campaign_id": campaign.id,
                "message": personalized_message,
                "sent_at": datetime.now(timezone.utc),
                "user_id": user_id,
                "message_type": message_type,
                "status": MessageStatus.unknown,
                "campaigns": [queue_entry.campaign_id]
            }

            debug(message_info, message_id)
            if message_id:
                successful_msgs.append(message_info)
            else:
                errored_msgs.append(message_info)
            # Handle response and logging as necessary
            time.sleep(throttle_map[campaign.throttle])

        if successful_msgs:
            mongo_messages_collection.insert_many(successful_msgs)

        if errored_msgs:
            mongo_messages_collection.insert_many(errored_msgs)
        # Update the queue entry's progress
        mongo_queue_collection.update_one(
            {"_id": ObjectId(queue_id)},
            {"$set": {"current_batch": batch_num + 1, "updated_at": datetime.now(timezone.utc)}}
        )

        # Optional: Add a delay between batches if needed
        time.sleep(campaign.buffer_time.value * 60)

    # Mark the campaign as completed
    self.update_state(state="SUCCESS")
    return {
        "queue_id": queue_id,
        "user_id": user_id
    }


async def test_task_controls(self: Task, queue_id: str, user_id: str):
    # status_handler = CampaignUpdateHandler(queue_id)

    # signal.signal(signal.SIGTERM, status_handler.cancel_handler)
    # self.update_state(state="STARTED")

    update_sms_task(SMSCampaignStatus.in_progress, queue_id)
    print("This is self: ", self, queue_id, user_id)

    while True:
        print("Task is running, pause for 5s.")
        # print(self)
        time.sleep(5)


@celery.task(bind=True)
def test_task_controls(self: Task, queue_id: str, user_id: str):
    self.track_started = True
    update_sms_task(SMSCampaignStatus.in_progress, queue_id)

    def handle_termination(signum, frame):
        print(f"Received signal {signum}. Terminating task...")
        raise Ignore("Task Terminated Successfully")

    signal.signal(signal.SIGTERM, handle_termination)
    # async_to_sync(test_task_controls)(self, *args, **kwargs)
    try:
        print("This is self: ", self, queue_id, user_id)

        while True:
            print("Task is running, pause for 5s.")
            # print(self.request.revoked)
            # print(self)
            time.sleep(5)
    except Ignore:
        print("Task Terminated Successfully")


@task_prerun.connect
def task_has_started(sender=None, **kwargs):
    print(f"Task ${sender} has started for Queue and User: ")
    queue_id = kwargs["args"][0]
    update_sms_task(SMSCampaignStatus.in_progress, queue_id)


@task_failure.connect
def task_has_failed(sender=None, **kwargs):
    print(f"Task ${sender} has failed for Queue and User: ")
    queue_id = kwargs["args"][0]
    update_sms_task(SMSCampaignStatus.failed, queue_id)


@task_success.connect
def task_has_completed(sender=None, **kwargs):
    result = kwargs.get("result", {})
    print(f"Task ${sender} is successful for Queue and User: ")
    print(result)

    if result:
        queue_id = result.get("queue_id", None)
        if queue_id:
            update_sms_task(SMSCampaignStatus.completed, queue_id)


@task_revoked.connect
def task_is_revoked(sender=None, **kwargs):
    print(f"Task ${sender} has been revoked for Queue and User: ")
    print(kwargs)
    # queue_id = kwargs["args"][0]
    # user_id = kwargs["args"][1]
    # update_sms_task(SMSCampaignStatus.cancelled, queue_id, user_id)
