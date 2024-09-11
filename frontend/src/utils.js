import { toast } from "react-toastify"
import notify from "./app/notify"

export function selectableGroups(contact) {
    // avoid changing the reference here
    return {...contact, groups: contact.groups.map(group => ({ value: group.toLowerCase(), label: group })) }
}

export function normalGroups(data, isGroup=false) {
    if (isGroup) {
        return data.map(group => group.value)
    }
    return {...data, groups: data.groups.map(group => group.value)}
}

export function prepContactForUpdate(contact) {
    const newContact = {...contact, id: contact._id}
    delete newContact._id
    return newContact
}

export const handleApiErr = err => {
    if (err.config._silent) {
        return
    };

    const details = err.response?.data["detail"]
    if (details && typeof details === "string") {
        console.log(details)
        notify.error(details)
    } else if (Array.isArray(details)) {
        details.forEach(error => {
            console.log(error.msg)
            notify.error(error.msg)
        })
    } else if (err.code === "ERR_NETWORK") {
        notify.error("Server error")
    } else {
        notify.error("An unknown error occured.")
    }
}

export function formatChatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeOptions = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    };

    const dateOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    };

    // Return only the time if it's today, otherwise return a full date
    if (isToday) {
        return new Intl.DateTimeFormat('en-US', timeOptions).format(date);
    } else {
        return `${new Intl.DateTimeFormat('en-US', dateOptions).format(date)} at ${new Intl.DateTimeFormat('en-US', timeOptions).format(date)}`;
    }
}