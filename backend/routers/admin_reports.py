import calendar
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, status, Depends

from database import user_collection, sms_campaign_collection, messages_collection
from models.auth_models import UserWithMSI
from utilities import debug
from .utilities import get_current_admin

router = APIRouter(prefix="/reports", tags=["admin-reports"])


@router.get("/users", response_model=dict)
async def get_user_summary(current_admin: Annotated[UserWithMSI, Depends(get_current_admin)]):
    admin_msisdns = [number.msisdn for number in current_admin.numbers]
    total_admin_numbers = len(admin_msisdns)

    # Aggregation pipeline to handle all calculations in a single call
    summary = await user_collection.aggregate([
        {
            "$facet": {
                "total_users": [
                    {"$match": {"created_by": current_admin.id}},
                    {"$count": "count"}
                ],
                "disabled_users": [
                    {"$match": {"disabled": True}},
                    {"$count": "count"}
                ],
                "assigned_numbers": [
                    {"$match": {"is_admin": False, "numbers.msisdn": {"$in": admin_msisdns}}},
                    {"$unwind": "$numbers"},
                    {"$match": {"numbers.msisdn": {"$in": admin_msisdns}}},
                    {"$group": {"_id": None, "assigned_count": {"$sum": 1}}}
                ]
            }
        }
    ]).to_list(None)

    # Extract results from aggregation
    total_users = summary[0]["total_users"][0]["count"] if summary[0]["total_users"] else 0
    disabled_users = summary[0]["disabled_users"][0]["count"] if summary[0]["disabled_users"] else 0
    assigned_to_users = summary[0]["assigned_numbers"][0]["assigned_count"] if summary[0]["assigned_numbers"] else 0

    unassigned_numbers = total_admin_numbers - assigned_to_users

    # return BaseResponse(
    #     status=status.HTTP_200_OK,
    #     data={
    #         "total_users": total_users,
    #         "disabled_users": disabled_users,
    #         "assigned_numbers": assigned_to_users,
    #         "unassigned_numbers": unassigned_numbers
    #     },
    #     success=True
    # )

    return {
        "total_users": total_users,
        "disabled_users": disabled_users,
        "assigned_numbers": assigned_to_users,
        "unassigned_numbers": unassigned_numbers,
        "success": True
    }


@router.get("/contacts", response_model=dict)
async def get_contacts_dncs_summary(current_admin: Annotated[UserWithMSI, Depends(get_current_admin)]):
    pipeline = [
        {
            '$match': {
                'created_by': current_admin.id
            }
        }, {
            '$lookup': {
                'from': 'contact',
                'let': {
                    'user_id': {
                        '$toString': '$_id'
                    }
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$created_by', '$$user_id'
                                ]
                            }
                        }
                    }
                ],
                'as': 'contacts'
            }
        }, {
            '$lookup': {
                'from': 'dnc',
                'let': {
                    'user_id': {
                        '$toString': '$_id'
                    }
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$created_by', '$$user_id'
                                ]
                            }
                        }
                    }
                ],
                'as': 'dncs'
            }
        }, {
            '$lookup': {
                'from': 'dnc',
                'pipeline': [
                    {
                        '$match': {
                            'created_by': current_admin.id
                        }
                    }
                ],
                'as': 'admin_dncs'
            }
        }, {
            '$project': {
                '_id': 0,
                'total_contacts': {
                    '$size': '$contacts'
                },
                'total_user_dnc': {
                    '$size': '$dncs'
                },
                'total_admin_dnc': {
                    '$size': '$admin_dncs'
                }
            }
        }
    ]

    results = await user_collection.aggregate(pipeline).to_list(length=None)
    debug(results)
    if not len(results):
        results = [{}]

    return {
        "total_contacts": results[0].get("total_contacts", 0),
        "total_user_dnc": results[0].get("total_user_dnc", 0),
        "total_admin_dnc": results[0].get("total_admin_dnc", 0),
        "success": True
    }


@router.get("/campaigns", response_model=dict)
async def get_campaigns_queues_summary(current_admin: Annotated[UserWithMSI, Depends(get_current_admin)]):
    pipeline = [
        {
            '$match': {
                'created_by': current_admin.id
            }
        }, {
            '$lookup': {
                'from': 'sms campaign',
                'let': {
                    'userId': {
                        '$toString': '$_id'
                    }
                },
                'pipeline': [
                    {
                        '$match': {
                            '$expr': {
                                '$eq': [
                                    '$created_by', '$$userId'
                                ]
                            }
                        }
                    }
                ],
                'as': 'user_campaigns'
            }
        }, {
            '$unwind': '$user_campaigns'
        }, {
            '$lookup': {
                'from': 'sms queue',
                'let': {
                    'campaignId': {
                        '$toString': '$user_campaigns._id'
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
                    }
                ],
                'as': 'campaign_queues'
            }
        }, {
            '$unwind': '$campaign_queues'
        }, {
            '$group': {
                '_id': None,
                'total_campaigns': {
                    '$addToSet': '$user_campaigns._id'
                },
                'total_queues': {
                    '$sum': 1
                },
                'status_counts': {
                    '$push': '$campaign_queues.status'
                }
            }
        }, {
            '$project': {
                '_id': 0,
                'total_campaigns': {
                    '$size': '$total_campaigns'
                },
                'total_queues': 1,
                'status_counts': {
                    '$arrayToObject': {
                        '$map': {
                            'input': {
                                '$setUnion': [
                                    [
                                        'scheduled', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'
                                    ], []
                                ]
                            },
                            'as': 'status',
                            'in': {
                                'k': '$$status',
                                'v': {
                                    '$size': {
                                        '$filter': {
                                            'input': '$status_counts',
                                            'as': 'item',
                                            'cond': {
                                                '$eq': [
                                                    '$$item', '$$status'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ]

    results = await sms_campaign_collection.aggregate(pipeline).to_list(length=None)

    # Execute the pipeline
    result = await user_collection.aggregate(pipeline).to_list(None)
    if result:
        return {
            "total_queues": result[0].get("total_queues", 0),
            "total_campaigns": result[0].get("total_campaigns", 0),
            "status_counts": result[0].get("status_counts", {}),
            "success": True
        }
    else:
        return {
            "status": status.HTTP_204_NO_CONTENT,
            "message": "No data found for the admin",
            "success": False
        }


@router.get("/messages", response_model=dict)
async def get_admin_user_messages_summary(
        current_admin: UserWithMSI = Depends(get_current_admin)
):
    # Query to get all user ids under this admin
    admin_users = await user_collection.find({"created_by": current_admin.id}).to_list(None)
    user_ids = [str(user["_id"]) for user in admin_users]

    # Match messages sent by users under the admin
    pipeline = [
        {
            "$match": {
                "users": {"$in": user_ids}
            }
        },
        {
            "$facet": {
                "sent_messages": [
                    {"$match": {"type": "sent"}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ],
                "replied_messages": [
                    {"$match": {"type": "reply"}},
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                ]
            }
        }
    ]

    # Run the aggregation
    messages_summary = await messages_collection.aggregate(pipeline).to_list(None)

    # Parse the result to get status counts for sent and replied messages
    sent_message_counts = defaultdict(int)
    reply_message_counts = defaultdict(int)

    if messages_summary and len(messages_summary) > 0:
        sent_data = messages_summary[0].get("sent_messages", [])
        reply_data = messages_summary[0].get("replied_messages", [])

        for entry in sent_data:
            sent_message_counts[entry["_id"]] = entry["count"]

        for entry in reply_data:
            reply_message_counts[entry["_id"]] = entry["count"]

    # Total counts for messages sent and replies
    total_sent_messages = sum(sent_message_counts.values())
    total_replied_messages = sum(reply_message_counts.values())

    return {
        "total_sent_messages": total_sent_messages,
        "total_replied_messages": total_replied_messages,
        "status_counts": dict(sent_message_counts),
        # All reply messages are 'accepted' by default
        # "reply_message_status_counts": dict(reply_message_counts),
        "success": True
    }


@router.get("/messages/past-12-months", response_model=dict)
async def get_admin_messages_last_12_months(
        current_admin: UserWithMSI = Depends(get_current_admin)
):
    # Get current date and calculate the date 12 months ago
    now = datetime.now()
    start_date = now.replace(day=1) - timedelta(days=365)

    # Define pipeline to fetch sent and reply messages for all users under the admin
    pipeline = [
        {
            '$match': {
                'created_by': current_admin.id
            }
        },
        {
            '$addFields': {
                'user_id_str': {
                    '$toString': '$_id'
                }
            }
        },
        {
            '$lookup': {
                'from': 'messages',
                'localField': 'user_id_str',
                'foreignField': 'users',
                'as': 'user_messages'
            }
        },
        {
            '$unwind': '$user_messages'
        },
        {
            '$match': {
                'user_messages.sent_at': {
                    '$gte': start_date
                }
            }
        },
        {
            '$group': {
                '_id': {
                    'year': {
                        '$year': '$user_messages.sent_at'
                    },
                    'month': {
                        '$month': '$user_messages.sent_at'
                    },
                    'type': '$user_messages.type'  # Group by message type (sent/reply)
                },
                'count': {
                    '$sum': 1
                }
            }
        },
        {
            '$sort': {
                '_id.year': 1,
                '_id.month': 1
            }
        }
    ]

    # Run the aggregation pipeline
    result = await user_collection.aggregate(pipeline).to_list(None)

    # Prepare the data for the past 12 months
    months = []
    replies_per_month = []
    sent_per_month = []

    # Create a mapping for months to replies and sent message counts
    replies_by_month = {}
    sent_by_month = {}

    for r in result:
        year = r['_id']['year']
        month = r['_id']['month']
        message_type = r['_id']['type']

        if message_type == "reply":
            replies_by_month[(year, month)] = r['count']
        elif message_type == "sent":
            sent_by_month[(year, month)] = r['count']

    # Generate the list of months (from current to 12 months ago)
    for i in range(12):
        target_month = (now.month - i - 1) % 12 + 1
        target_year = now.year if now.month - i > 0 else now.year - 1
        month_abbr = calendar.month_abbr[target_month]

        months.insert(0, month_abbr)
        replies_per_month.insert(0, replies_by_month.get((target_year, target_month), 0))
        sent_per_month.insert(0, sent_by_month.get((target_year, target_month), 0))

    return {
        "months": months,
        "replies": replies_per_month,
        "sent_messages": sent_per_month,
        "success": True
    }


@router.get("/messages/status/summary", response_model=dict)
async def get_message_summary(
        current_admin: UserWithMSI = Depends(get_current_admin)
):
    # Get current date and calculate the start date 12 months ago (starting from October)
    now = datetime.now()
    start_date = now.replace(day=1) - timedelta(days=365)

    # Generate a list of all months in the past 12 months (October start)
    months_in_past_year = []
    for i in range(12):
        target_month = (now.month - i - 1) % 12 + 1
        target_year = now.year if now.month - i > 0 else now.year - 1
        month_abbr = calendar.month_abbr[target_month]
        months_in_past_year.insert(0, month_abbr)

    # Define the pipeline to fetch all relevant messages for users under the admin within the past 12 months
    pipeline = [
        {
            '$match': {
                'created_by': current_admin.id
            }
        },
        {
            '$addFields': {
                'user_id_str': {
                    '$toString': '$_id'
                }
            }
        },
        {
            '$lookup': {
                'from': 'messages',
                'localField': 'user_id_str',
                'foreignField': 'users',
                'as': 'user_messages'
            }
        },
        {
            '$unwind': '$user_messages'
        },
        {
            '$match': {
                'user_messages.type': 'sent',  # Only include sent messages
                'user_messages.sent_at': {
                    '$gte': start_date  # Only include messages from the past 12 months
                }
            }
        },
        {
            '$group': {
                '_id': {
                    'year': {
                        '$year': '$user_messages.sent_at'
                    },
                    'month': {
                        '$month': '$user_messages.sent_at'
                    }
                },
                'total_sent': {
                    '$sum': 1
                },
                'total_delivered_accepted': {
                    '$sum': {
                        '$cond': {
                            'if': {
                                '$or': [
                                    {'$eq': ['$user_messages.status', 'delivered']},
                                    {'$eq': ['$user_messages.status', 'accepted']}
                                ]
                            },
                            'then': 1,
                            'else': 0
                        }
                    }
                },
                'total_failed_rejected': {
                    '$sum': {
                        '$cond': {
                            'if': {
                                '$or': [
                                    {'$eq': ['$user_messages.status', 'failed']},
                                    {'$eq': ['$user_messages.status', 'rejected']}
                                ]
                            },
                            'then': 1,
                            'else': 0
                        }
                    }
                }
            }
        },
        {
            '$sort': {
                '_id.year': 1,
                '_id.month': 1
            }
        }
    ]

    # Run the aggregation pipeline
    result = await user_collection.aggregate(pipeline).to_list(None)

    # Create a dictionary for each month's summary
    summary = {month: {"total_sent": 0, "delivered_accepted": 0, "failed_rejected": 0} for month in months_in_past_year}

    # Process the result and update the summary dictionary
    for r in result:
        year = r['_id']['year']
        month = r['_id']['month']
        month_abbr = calendar.month_abbr[month]

        # Update the corresponding month in the summary
        if month_abbr in summary:
            summary[month_abbr]["total_sent"] = r["total_sent"]
            summary[month_abbr]["delivered_accepted"] = r["total_delivered_accepted"]
            summary[month_abbr]["failed_rejected"] = r["total_failed_rejected"]

    # Prepare the final response lists
    months = []
    total_sent_per_month = []
    delivered_accepted_per_month = []
    failed_rejected_per_month = []

    # Fill the response with data from the summary
    for month in months_in_past_year:
        months.append(month)
        total_sent_per_month.append(summary[month]["total_sent"])
        delivered_accepted_per_month.append(summary[month]["delivered_accepted"])
        failed_rejected_per_month.append(summary[month]["failed_rejected"])

    # Return the response
    return {
        "months": months,
        "total_sent": total_sent_per_month,
        "delivered_accepted": delivered_accepted_per_month,
        "failed_rejected": failed_rejected_per_month,
        "success": True
    }
