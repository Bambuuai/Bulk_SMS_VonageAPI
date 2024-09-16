import calendar
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, status, Depends

from database import contact_collection, dnc_collection, sms_campaign_collection, messages_collection
from models.auth_models import UserWithMSI
from models.base_models import BaseResponse
from models.sms_models import MessageType
from .utilities import get_current_active_user

router = APIRouter(prefix="/reports", tags=["user-reports"])


@router.get("/contacts", response_model=BaseResponse)
async def get_contacts_dnc_summary(
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> BaseResponse:
    total_contacts = await contact_collection.count_documents({"created_by": current_user.id})
    total_dnc = await dnc_collection.count_documents({"created_by": current_user.id})
    total_admin_dnc = await dnc_collection.count_documents({"created_by": current_user.created_by})

    return BaseResponse(
        status=status.HTTP_200_OK,
        data={
            "total_contacts": total_contacts,
            "total_dnc": total_dnc,
            "total_admin_dnc": total_admin_dnc
        },
        success=True
    )


@router.get("/campaigns", response_model=BaseResponse)
async def get_campaigns_queues_summary(
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> BaseResponse:
    pipeline = [
        {
            '$match': {
                'created_by': current_user.id
            }
        }, {
            '$lookup': {
                'from': 'sms queue',
                'let': {
                    'campaignId': {
                        '$toString': '$_id'
                    }
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$campaign_id', '$$campaignId'
                                ]
                            }
                        }
                    }, {
                        '$group': {
                            '_id': '$campaign_id',
                            'queue_count': {
                                '$sum': 1
                            },
                            'status_counts': {
                                '$push': '$status'
                            }
                        }
                    }
                ],
                'as': 'queue_info'
            }
        }, {
            '$addFields': {
                'queue_count': {
                    '$sum': {
                        '$map': {
                            'input': '$queue_info',
                            'as': 'item',
                            'in': '$$item.queue_count'
                        }
                    }
                }
            }
        }, {
            '$group': {
                '_id': None,
                'total_campaigns': {
                    '$sum': 1
                },
                'total_queues': {
                    '$sum': '$queue_count'
                },
                'statuses': {
                    '$push': {
                        '$arrayElemAt': [
                            '$queue_info.status_counts', 0
                        ]
                    }
                }
            }
        }, {
            '$unwind': '$statuses'
        }, {
            '$unwind': '$statuses'
        }, {
            '$group': {
                '_id': '$statuses',
                'total_campaigns': {
                    '$first': '$total_campaigns'
                },
                'total_queues': {
                    '$first': '$total_queues'
                },
                'status_count': {
                    '$sum': 1
                }
            }
        }, {
            '$group': {
                '_id': 0,
                'total_campaigns': {
                    '$first': '$total_campaigns'
                },
                'total_queues': {
                    '$first': '$total_queues'
                },
                'status_counts': {
                    '$push': {
                        'status': '$_id',
                        'count': '$status_count'
                    }
                }
            }
        }, {
            '$project': {
                '_id': 0,
                'total_campaigns': 1,
                'total_queues': 1,
                'status_counts': 1
            }
        }
    ]

    results = await sms_campaign_collection.aggregate(pipeline).to_list(None)
    # {
    #     "total_campaigns": int,
    #     "total_queues": int,
    #     "status_counts": [
    #         {
    #             "status": CampaignStatus,
    #             "count": int
    #         }
    #     ]
    # }
    return BaseResponse(data=results[0], success=True)


@router.get("/messages", response_model=BaseResponse)
async def get_messages_summary(
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> BaseResponse:
    pipeline = [
        {
            '$match': {
                'users': current_user.id
            }
        }, {
            '$facet': {
                'total_sent': [
                    {
                        '$match': {
                            'type': 'sent'
                        }
                    }, {
                        '$count': 'count'
                    }
                ],
                'total_replied': [
                    {
                        '$match': {
                            'type': 'reply'
                        }
                    }, {
                        '$count': 'count'
                    }
                ],
                'status_counts': [
                    {
                        '$group': {
                            '_id': "$status",
                            'count': {
                                '$sum': 1
                            }
                        }
                    }
                ]
            }
        }, {
            '$project': {
                'total_sent': {
                    '$arrayElemAt': [
                        '$total_sent.count', 0
                    ]
                },
                'total_replied': {
                    '$arrayElemAt': [
                        '$total_replied.count', 0
                    ]
                },
                'status_counts': '$status_counts'
            }
        }
    ]

    results = await messages_collection.aggregate(pipeline).to_list(None)
    # {
    #     "total_sent": int,
    #     "total_replied": int,
    #     "status_counts": [
    #         {
    #             "status": MessageStatus,
    #             "count": int
    #         }
    #     ]
    # }
    return BaseResponse(data=results[0], success=True)


@router.get("/messages/past-12-months", response_model=dict)
async def get_messages_last_12_months(
        current_user: UserWithMSI = Depends(get_current_active_user)
):
    # Get current date and calculate the date 12 months ago
    now = datetime.now()
    start_date = now.replace(day=1) - timedelta(days=365)

    # Fetch all sent messages and replies for the current user within the past 12 months
    messages = await messages_collection.find({
        "users": current_user.id,
        # "type": {"$in": [MessageType.sent, MessageType.reply]},
        "sent_at": {"$gte": start_date}
    }).to_list(None)  # Fetch all results

    # Initialize message and reply count by month
    message_count_by_month = defaultdict(int)
    reply_count_by_month = defaultdict(int)

    # Iterate through the fetched messages and group by month
    for message in messages:
        sent_at = message["sent_at"]
        month_key = sent_at.strftime("%b")  # Month abbreviation (e.g., "Jan")

        # Check if the message is sent by us or a reply
        if message["type"] == MessageType.sent:
            message_count_by_month[month_key] += 1
        elif message["type"] == MessageType.reply:
            reply_count_by_month[month_key] += 1

    # Generate the list of months (from current to 12 months ago)
    months = []
    messages_per_month = []
    replies_per_month = []
    for i in range(12):
        target_month = (now.month - i - 1) % 12 + 1
        target_year = now.year if now.month - i > 0 else now.year - 1
        month_abbr = calendar.month_abbr[target_month]

        months.insert(0, month_abbr)
        messages_per_month.insert(0, message_count_by_month.get(month_abbr, 0))
        replies_per_month.insert(0, reply_count_by_month.get(month_abbr, 0))

    return {
        "months": months,
        "messages": messages_per_month,
        "replies": replies_per_month,
        "success": True
    }
