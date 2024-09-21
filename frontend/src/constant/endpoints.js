const REGISTER_ENDPOINT = "/auth/register";
const TOKEN_ENDPOINT = "/auth/token";
const ACTIVATE_USER_ENDPOINT = "/activate/user";

const baseEndpoints = {
	PROFILE: "/profile",
	CREATE_USER: "/create/user",
	GET_USERS: "/get/users",
	UPDATE_USER: "/update/users",
	DELETE_USERS: "/delete/users",
	GET_DNCS: "/dnc",
	ADD_DNC: "/dnc/add",
	UPDATE_DNC: "/dnc/update",
	DELETE_DNCS: "/dnc/remove",
	IMPORT_DNC: "/dnc/import",
	GET_CONTACTS_REPORT: "/reports/contacts",
	GET_CAMPAIGNS_REPORT: "/reports/campaigns",
	GET_MESSAGES_REPORT: "/reports/messages",
	GET_MESSAGE_STATUS_REPORT: "/reports/messages/past-12-months",
};

function prefixEndpoints(prefix, endpoints, extra = {}) {
	const prefixed = {};
	for (const [key, value] of Object.entries({ ...endpoints, ...extra })) {
		prefixed[key] = prefix + value;
	}
	return prefixed;
}

const USER_ENDPOINTS = prefixEndpoints("/user", baseEndpoints, {
	GET_CONTACTS: "/contact",
	ADD_CONTACTS: "/contact/add",
	REMOVE_CONTACTS: "/contact/remove",
	REMOVE_GROUP: "/contact/group/remove",
	FETCH_CONTACT_GROUPS: "/contact/groups",
	UPDATE_CONTACTS: "/contact/update",
	IMPORT_CONTACTS: "/contact/import",
	CREATE_CAMPAIGN: "/sms/campaigns",
	GET_CAMPAIGNS: "/sms/campaigns",
	UPDATE_CAMPAIGNS: "/sms/campaigns/update",
	DELETE_CAMPAIGNS: "/sms/campaigns",
	ADD_CAMPAIGN_TO_QUEUE: "/sms/queue",
	GET_CAMPAIGN_QUEUES: "/sms/queue",
	UPDATE_CAMPAIGN_QUEUES: "/sms/queue/update",
	DELETE_CAMPAIGN_QUEUES: "/sms/queue",
	GET_CAMPAIGN_CHATS: "/sms/chats",
	GET_NUMBERS: "/numbers",
	GET_CHAT_CONTACTS: "/sms/chats",
	GET_CHAT: "/sms/chats",
	SEND_MESSAGE: "/sms/chat",
	// AWAIT_REPLY: "/sms/stream/replies",
});

const ADMIN_ENDPOINTS = prefixEndpoints("/admin", baseEndpoints, {
	GET_NUMBERS: "/numbers",
	BUY_NUMBER: "/numbers/buy",
	SEARCH_NUMBERS: "/numbers/search",
	DID_ASSIGN_USERS: "/numbers/assign",
	GET_USERS_REPORT: "/reports/users",
	GET_MESSAGE_DELIVERY_REPORT: "/reports/messages/status/summary",
});

export {
	REGISTER_ENDPOINT,
	TOKEN_ENDPOINT,
	ACTIVATE_USER_ENDPOINT,
	USER_ENDPOINTS,
	ADMIN_ENDPOINTS,
};
