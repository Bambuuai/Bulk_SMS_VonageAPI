from motor import motor_asyncio

from environment import MONGODB_URL

#  + "?retryWrites=true&w=majority&tlsCAFile=isrgrootx1.pem"

client = motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
print("Connecting to DB: ", client, MONGODB_URL)
db = client.get_database("fastapi")
user_collection = db.get_collection("users")
dnc_collection = db.get_collection("dnc")
# contact_group_collection = db.get_collection("contact-list")
contact_collection = db.get_collection("contact")
sms_campaign_collection = db.get_collection("sms campaign")
sms_queue_collection = db.get_collection("sms queue")
campaign_chat_collection = db.get_collection("campaign chat")
messages_collection = db["messages"]
