import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";
import { createSlice } from "@reduxjs/toolkit";


export const appChatSlice = createSlice({
  name: "appchat",
  initialState: {
    openProfile: false,
    openInfo: true,
    activeChat: false,
    searchContact: "",
    mobileChatSidebar: false,
    profileinfo: {},
    messFeed: [],
    user: {},
    contacts: [],
    chats: {},
  },
  reducers: {
    openChat: (state, action) => {
      state.activeChat = action.payload.activeChat;
      state.mobileChatSidebar = !state.mobileChatSidebar;
      state.user = action.payload.contact.info;
      state.messFeed = action.payload.messages
      // state.chats.map((item) => {
      //   if (item.userId === action.payload.contact.id) {
      //     state.messFeed = item.messages;
      //   }
      // });
    },
    closeChat: (state, action) => {
      state.activeChat = action.payload?.activeChat ?? "";
      state.user = {};
      state.messFeed = []
      // state.chats.map((item) => {
      //   if (item.userId === action.payload.contact.id) {
      //     state.messFeed = item.messages;
      //   }
      // });
    },
    // toggole mobile chat sidebar
    toggleMobileChatSidebar: (state, action) => {
      state.mobileChatSidebar = action.payload;
    },
    infoToggle: (state, action) => {
      state.openInfo = action.payload;
    },
    // clearFeed: (state, action) => {
    //   console.log("Clearing feed")
    //   state.messFeed = action.payload ?? [];
    // },
    // clearInfo: (state, action) => {
    //   state.user = {}
    // },
    sendMessage: (state, action) => {
      state.messFeed.push(action.payload);
    },
    toggleProfile: (state, action) => {
      state.openProfile = action.payload;
    },
    setContactSearch: (state, action) => {
      state.searchContact = action.payload;
    },
    toggleActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    setContacts: (state, action) => {
      state.contacts = action.payload
    },
    setChat: (state, action) => {
      state.chats[action.payload.msisdn] = action.payload.chat
    }
  },
});

export const {
  openChat,
  closeChat,
  toggleMobileChatSidebar,
  infoToggle,
  sendMessage,
  toggleProfile,
  setContactSearch,
  toggleActiveChat,
  setContacts,
  setChat
} = appChatSlice.actions;
export default appChatSlice.reducer;
