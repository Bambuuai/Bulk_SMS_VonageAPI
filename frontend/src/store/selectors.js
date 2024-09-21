import {createSelector} from "@reduxjs/toolkit";

export const selectAuthState = (state) => state.auth ?? {};
export const selectChatState = (state) => state.chat ?? {};

export const selectChatData = createSelector(
    [selectChatState],
    (chatState={}) => ({
        activeChat: chatState.activeChat,
        openInfo: chatState.openInfo,
        mobileChatSidebar: chatState.mobileChatSidebar,
        contacts: chatState.contacts,
        searchContact: chatState.searchContact
    })
)