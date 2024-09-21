from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict, field_serializer
from vonage_utils.types import PhoneNumber

from models.base_models import PyObjectId
from models.contact_models import BaseContact


class MessageStatus(str, Enum):
    accepted = "accepted"  # Message has been accepted for delivery, but has not yet been delivered
    delivered = "delivered"  # Message has been delivered
    buffered = "buffered"  # Message has been buffered for later delivery
    expired = "expired"  # Message was held at downstream carrier's retry scheme and could not be delivered within the expiry time
    failed = "failed"  # Message not delivered
    rejected = "rejected"  # Downstream carrier refuses to deliver message
    unknown = "unknown"  # No useful information available


class ThrottleLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class BatchSize(int, Enum):
    mini = 50
    small = 100
    medium = 150
    large = 200


class BufferTime(int, Enum):
    short = 1
    moderate = 2
    long = 5


class MessageType(str, Enum):
    sent = "sent"
    reply = "reply"


class MessageTextType(str, Enum):
    text = "text"
    unicode = "unicode"
    binary = "binary"


class SMSSender(BaseModel):
    sender_id: str
    phone_number: PhoneNumber


class SMSCampaignForm(BaseModel):
    name: str
    contact_groups: List[str]  # Group names of contact groups
    message: str = Field(min_length=1)
    # schedule_now: bool | None = Field(default=False)
    batch_size: BatchSize = Field(default=BatchSize.mini)
    buffer_time: BufferTime = Field(default=BufferTime.moderate)  # Minutes between batches
    throttle: ThrottleLevel = Field(default=ThrottleLevel.medium)
    sender_msisdn: PhoneNumber
    include_opt_out: bool = Field(default=True)

    model_config = ConfigDict(extra="forbid")

    # @field_validator('schedule_time')
    # def check_schedule_time(cls, v: datetime | None, values: ValidationInfo):
    #     # Get the current time
    #     if not v:
    #         return None
    #
    #     v = v.replace(tzinfo=timezone.utc)
    #     now = datetime.now(timezone.utc)
    #
    #     # Define the minimum valid time (5 minutes from now)
    #     min_valid_time = now + timedelta(minutes=5)
    #
    #     # Check if the scheduled time is in the past or within 1 minute from now
    #     if v < min_valid_time:
    #         raise ValueError('Scheduled time must be at least 5 minutes in the future.')
    #     else:
    #         if values.data["schedule_now"]:
    #             raise ValueError('You can either schedule now or in the future')
    #     return v

    # @field_serializer('schedule_time')
    # def serialize_schedule_time(v: datetime):
    #     return v.replace(tzinfo=timezone.utc) if v else v

    @field_serializer('batch_size')
    def serialize_batch_size(v: BatchSize):
        return v.value  # This will store the integer value of the enum


class SMSCampaign(SMSCampaignForm):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    contact_groups: List[str] = Field(default=[])
    created_by: PyObjectId | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SMSCampaignFromDB(SMSCampaign):
    pass
    # @field_validator('schedule_time')
    # def check_schedule_time(cls, v: datetime | None, values: ValidationInfo):
    #     return v


class SMSCampaignStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"


class SMSCampaignQueue(BaseModel):
    id: PyObjectId | None = Field(None, alias="_id")
    campaign_id: PyObjectId | None = None
    status: SMSCampaignStatus
    current_batch: int
    total_batches: int
    created_at: datetime
    created_by: PyObjectId | None = None
    task_id: str | None = None
    schedule_time: datetime


class SMSCampaignQueueWithCampaign(SMSCampaignQueue):
    campaign: SMSCampaign

    model_config = ConfigDict(extra="allow")


class ChatContacts(BaseModel):
    original_sender: PhoneNumber
    original_recipient: PhoneNumber
    info: BaseContact


class Reply(BaseModel):
    message: str = Field(min_length=1)
    sent_at: datetime


class Message(BaseModel):
    id: PyObjectId | None = Field(None, alias="_id")
    message_id: str | None  # None id if message fails to send
    sender_did: PhoneNumber
    recipient_did: PhoneNumber
    message: str = Field(min_length=1)
    sent_at: datetime
    type: MessageType  # User who sent the message
    message_type: MessageTextType
    status: MessageStatus
    campaigns: List[PyObjectId] = []
    users: List[PyObjectId] = []

    # keyword: str

    # @field_validator('sent_at')
    # @classmethod
    # def validate_datetime(cls, value):
    #     return cls.convert_to_pst(value)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.astimezone(timezone.utc).isoformat()  # Convert to UTC
        }


class QueueStatusUpdate(BaseModel):
    queue_id: PyObjectId
    status: SMSCampaignStatus


class CampaignWithMsg(BaseModel):
    id: PyObjectId | None = Field(None, alias="_id")
    name: str = Field(min_length=1)
    message: str = Field(min_length=1)
    totalSent: int
    totalReplies: int
    sender_msisdn: PhoneNumber


class CampaignChat(BaseModel):
    pass
