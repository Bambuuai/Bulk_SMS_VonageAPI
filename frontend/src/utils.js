import { toast } from "react-toastify"
import notify from "./app/notify"
import {isValidPhoneNumber, parsePhoneNumber, parsePhoneNumberWithError} from "libphonenumber-js";

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
    }

    const details = err.response?.data["detail"]
    if (details && typeof details === "string") {
        console.log(details)
        notify.error(details)
    } else if (Array.isArray(details)) {
        details.forEach(error => {
            console.log(error)
            notify.error(typeof error === "string" ? error : error.msg)
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
        hour12: true,
        timeZone: 'US/Pacific'
    };

    const dateOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'US/Pacific'
    };

    // Return only the time if it's today, otherwise return a full date
    if (isToday) {
        return new Intl.DateTimeFormat('en-US', timeOptions).format(date);
    } else {
        return `${new Intl.DateTimeFormat('en-US', dateOptions).format(date)} at ${new Intl.DateTimeFormat('en-US', timeOptions).format(date)}`;
    }
}


export function formatToDisplay(vonageNum) {
    return parsePhoneNumberWithError("+" + vonageNum).formatInternational() // .replaceAll(" ", "-");
}

export function getPaginationArr(currentPage, pageCount, rangeSize = 7) {
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(pageCount, startPage + rangeSize - 1);

    startPage = Math.max(1, endPage - rangeSize + 1);

    const paginationButtons = [];
    for (let i = startPage; i <= endPage; i++) {
        paginationButtons.push(i);
    }

    return paginationButtons;
}


export function verifyNumbers(numbers, setError, formName) {
    return numbers.some(({phone_number}, index) => {
        if (phone_number.startsWith("+")) {
            phone_number = phone_number.substring(1)
        }
        if (!isValidPhoneNumber("+" + phone_number)) {
            setError(`[${formName}][${index}].phone_number`, { type: "validate", message: "Invalid Phone Number" })
            return true
        }
    })
}


export function formatToVonage(formVals) {
    return formVals.map(val => {
        if (val.phone_number.startsWith("+")) {
            val.phone_number = val.phone_number.substring(1)
        }
        return {
            ...val,
            phone_number: parsePhoneNumber("+" + val.phone_number).format("E.164").substring(1)
        }
    })
}