import vonage

from environment import VONAGE_APPLICATION_ID, VONAGE_APPLICATION_PRIVATE_KEY_PATH, VONAGE_API_KEY, VONAGE_API_SECRET

# key=VONAGE_API_KEY, secret=VONAGE_API_SECRET
vonage_client = vonage.Client(key=VONAGE_API_KEY, secret=VONAGE_API_SECRET,
                              application_id=VONAGE_APPLICATION_ID,
                              private_key=VONAGE_APPLICATION_PRIVATE_KEY_PATH)

msisdn = "12013816708"

# print("BALANCE: ", vonage_client.account.get_balance())
# print(vonage_client.numbers.get_account_numbers())
# print("============================================================================")
# print("============================================================================")
#
# client_2 = vonage.Client(key=WORKING_VONAGE_API_KEY, secret=WORKING_VONAGE_API_SECRET,
#                          application_id=WORKING_VONAGE_APPLICATION_ID,
#                          private_key=WORKING_VONAGE_APPLICATION_PRIVATE_KEY_PATH)
#
# sender_number = client_2.numbers.get_account_numbers()["numbers"][0]["msisdn"]
# client_2.numbers.update_number({
#     "country": "US",
#     "msisdn": sender_number,
#     "moHttpUrl": "https://duly-famous-satyr.ngrok-free.app/messages/inbound"
# })
# print(client_2.numbers.get_account_numbers())
# print(vonage_client.numbers.update_number({
#     "country": "US",
#     "msisdn": msisdn,
#     # "moSmppSysType": "inbound",
#     "moHttpUrl": "https://duly-famous-satyr.ngrok-free.app/messages/inbound"
# }))
# print(vonage_client.numbers.get_account_numbers())

# MSG = vonage_client.sms.send_message({
#     "from": msisdn,
#     # "from": "12018126676",
#     # "to": "2349110347359",
#     "to": "18456884354",
#     "text": "Testing Message Sending",
#     "callback": "https://duly-famous-satyr.ngrok-free.app/messages/status"
# })
# print(MSG)

# webhooks = vonage_client.sms.update_default_sms_webhook({
#     'moCallBackUrl': 'https://duly-famous-satyr.ngrok-free.app/messages/inbound',  # Default inbound sms webhook url
#     'drCallBackUrl': 'https://duly-famous-satyr.ngrok-free.app/messages/status'  # Delivery receipt url
# })
#
# debug(webhooks)
# debug("=================SENDING A MESSAGE=================")
# debug(vonage_client.sms.send_message({
#     "from": "12038946900",
#     "to": "12056108676",
#     "text": "This is a manual test."
# }))

# success: {'message-count': '1', 'messages': [{'to': '12056108676', 'message-id': '8f7ae58b-d872-4ff2-90b6-0806e29f9c3e', 'status': '0', 'remaining-balance': '11.07010000', 'message-price': '0.00710000', 'network': 'US-VIRTUAL-LEVEL3'}]}

# error: {'message-count': '1', 'messages': [{'status': '2', 'error-text': 'Missing Message Text'}]}
