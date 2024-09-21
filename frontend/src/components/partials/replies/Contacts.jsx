import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {openChat, closeChat} from "./store";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";

const Contacts = ({ campaignId, contact }) => {
  const { info, original_sender, original_recipient } = contact;
  const unreadMsg = 0
  const { name } = info
  const name_split = name.split(" ")
  const firstName = name_split[0]
  let lastName = ""
  if (name_split.length > 1) {
    lastName = name_split[1]
  }

  const dispatch = useDispatch();

  function loadMessages() {
    dispatch(closeChat({ activeChat: contact.info.phone_number }))
    axios.get(USER_ENDPOINTS.GET_CHAT + `/${campaignId}` + `/${contact.info.phone_number}`).then(({ data }) => {
      dispatch(
        openChat({
          contact,
          activeChat: contact.info.phone_number,
          messages: data
        })
      );
    })
  }

  return (
    <div
      className="block w-full py-5 focus:ring-0 outline-none cursor-pointer group transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-600 dark:hover:bg-opacity-70"
      onClick={loadMessages}
    >
      <div className="flex space-x-3 px-6 rtl:space-x-reverse">
        <div className="flex-none">
          {/* <div className="h-10 w-10 rounded-full relative"> */}
            <div className="lg:h-10 lg:w-10 h-7 w-7 rounded-full text-xs bg-slate-200 flex items-center justify-center font-semibold">
              {firstName.charAt(0) + lastName.charAt(0)}
            </div>
          {/* </div> */}
        </div>
        <div className="flex-1 text-start flex">
          <div className="flex-1 flex items-center">
            <span className="block text-slate-800 dark:text-slate-300 text-sm font-medium">
              {name}
            </span>
          </div>
          <div className="flex-none ltr:text-right rtl:text-end flex flex-col gap-0.5 justify-center items-end">
            <span className="block text-xs text-slate-400 dark:text-slate-400 font-normal">
              12:20 pm
            </span>
            {unreadMsg > 0 && (
              <span className="inline-flex flex-col items-center justify-center text-[10px] font-medium w-4 h-4 bg-[#FFC155] text-white rounded-full">
                {unreadMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;
