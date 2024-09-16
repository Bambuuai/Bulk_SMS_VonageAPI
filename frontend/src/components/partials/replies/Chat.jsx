import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleMobileChatSidebar, infoToggle, sendMessage } from "./store";
import useWidth from "@/hooks/useWidth";
import Icon from "@/components/ui/Icon";
import Dropdown from "@/components/ui/Dropdown";
import { formatChatDate } from "@/utils"
import { USER_ENDPOINTS } from "@/constant/endpoints";
import Loading from "@/components/Loading";
import axios from "@/configs/axios-config";

// const chatAction = [
//   {
//     label: "Delete",
//     link: "#",
//   },
//   {
//     label: "Forward",
//     link: "#",
//   },
// ];
const time = () => {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  return hours12 + ":" + minutesStr + " " + ampm;
};

const Chat = ({ campaignId }) => {
  const { openInfo, mobileChatSidebar, messFeed, user } =
    useSelector((state) => state.chat);

  const { firstName, lastName } = useSelector(state => state.auth ?? {})
  
  const userFirstName = user?.name?.split(" ")[0] ?? ""
  const userLastName = user?.name?.split(" ")[1] ?? ""
  const { width, breakpoints } = useWidth();
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = message.trim()
    const time_now = new Date()
    const message_data = {
      message: text,
      sent_at: time_now.toISOString()
    }

    if (text) {
      setSendingMsg(true)
      axios.post(USER_ENDPOINTS.SEND_MESSAGE + `/${campaignId}/${user?.phone_number}/reply`, message_data).then(({ data }) => {
        if (data) {
          dispatch(
            sendMessage(data)
          );
          setMessage("");
        }
      }).finally(() => setSendingMsg(false))
    }
  };
  const chatheight = useRef(null);
  useEffect(() => {
    chatheight.current.scrollTop = chatheight.current.scrollHeight;
  }, [messFeed]);

  return (
    <div className="h-full">
      <header className="border-b border-slate-100 dark:border-slate-700">
        <div className="flex py-4 md:px-6 px-3 items-center">
          <div className="flex-1">
            <div className="flex space-x-3 rtl:space-x-reverse">
              {width <= breakpoints.lg && (
                <span
                  onClick={() => dispatch(toggleMobileChatSidebar(true))}
                  className="text-slate-900 dark:text-white cursor-pointer text-xl self-center ltr:mr-3 rtl:ml-3"
                >
                  <Icon icon="heroicons-outline:menu-alt-1" />
                </span>
              )}
              <div className="flex-1 text-start">
                <span className="block text-slate-800 dark:text-slate-300 text-sm font-semibold text-opacity-70 mb-[2px] truncate">
                  {user.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-none flex md:space-x-3 space-x-1 items-center rtl:space-x-reverse">
            <div
              onClick={() => dispatch(infoToggle(!openInfo))}
              className="msg-action-btn"
            >
              <Icon icon="heroicons-outline:dots-horizontal" />
            </div>
          </div>
        </div>
      </header>
      <div className="chat-content parent-height">
        <div
          className="msgs overflow-y-auto msg-height pt-6 space-y-6"
          ref={chatheight}
        >
          {
            messFeed?.length ? (
              messFeed.map((item, i) => (
                <div className="block md:px-6 px-4" key={i}>
                  {item.type === "reply" ? (
                    <div className="flex space-x-2 items-start group rtl:space-x-reverse">
                      <div className="flex-none">
                      <div className="h-8 w-8 rounded-full text-xs bg-slate-700 text-slate-200 flex items-center justify-center font-semibold">
                        {userFirstName.charAt(0) + userLastName.charAt(0)}
                      </div>
                      </div>
                      <div className="flex-1 flex space-x-4 rtl:space-x-reverse">
                        <div>
                          <div className="text-contrent p-3 bg-slate-100 dark:bg-slate-600 dark:text-slate-300 text-slate-600 text-sm font-normal mb-1 rounded-md flex-1 whitespace-pre-wrap break-all">
                            {item.message}
                          </div>
                          <span className="font-normal text-xs text-slate-400 dark:text-slate-400">
                            {formatChatDate(item.sent_at)}
                          </span>
                        </div>
                        {/* <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                          <Dropdown
                            classMenuItems=" w-[100px] top-0"
                            items={chatAction}
                            label={
                              <div className="h-8 w-8 bg-slate-100 dark:bg-slate-600 dark:text-slate-300 text-slate-900 flex flex-col justify-center items-center text-xl rounded-full">
                                <Icon icon="heroicons-outline:dots-horizontal" />
                              </div>
                            }
                          />
                        </div> */}
                      </div>
                    </div>
                  ) : ""}
                  {/* sender */}
                  {item.type === "sent" ? (
                    <div className="flex space-x-2 items-start justify-end group w-full rtl:space-x-reverse">
                      <div className="no flex space-x-4 rtl:space-x-reverse">
                        {/* <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                          <Dropdown
                            classMenuItems=" w-[100px] left-0 top-0  "
                            items={chatAction}
                            label={
                              <div className="h-8 w-8 bg-slate-300 dark:bg-slate-900 dark:text-slate-400 flex flex-col justify-center items-center text-xl rounded-full text-slate-900">
                                <Icon icon="heroicons-outline:dots-horizontal" />
                              </div>
                            }
                          />
                        </div> */}
    
                        <div className="whitespace-pre-wrap break-all">
                          <div className="text-contrent p-3 bg-slate-300 dark:bg-slate-900 dark:text-slate-300 text-slate-800 text-sm font-normal rounded-md flex-1 mb-1">
                            {item.message}
                          </div>
                          <span className="font-normal text-xs text-slate-400">
                            {formatChatDate(item.sent_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-none">
                        <div className="h-8 w-8 rounded-full text-xs bg-slate-900 text-slate-200 flex items-center justify-center font-semibold">
                          {firstName?.charAt(0) + lastName?.charAt(0)}
                        </div>
                      </div>
                    </div>
                  ) : ""}
                  {/* me */}
                </div>
              ))
            ) : (
              <Loading className="h-full" />
            )
          }
        </div>
      </div>
      <footer className="md:px-6 px-4 sm:flex md:space-x-4 sm:space-x-2 rtl:space-x-reverse border-t md:pt-6 pt-4 border-slate-100 dark:border-slate-700">
        {/* <div className="flex-none sm:flex hidden md:space-x-3 space-x-1 rtl:space-x-reverse">
          <div className="h-8 w-8 cursor-pointer bg-slate-100 dark:bg-slate-900 dark:text-slate-400 flex flex-col justify-center items-center text-xl rounded-full">
            <Icon icon="heroicons-outline:emoji-happy" />
          </div>
        </div> */}
        <form
          className={`flex-1 relative flex space-x-3 rtl:space-x-reverse ${sendingMsg ? "pulse-custom-2" : ""}`}
          onSubmit={handleSendMessage}
        >
          <div className="flex-1">
            <textarea
              type="text"
              value={message}
              placeholder="Type your message..."
              className="focus:ring-0 focus:outline-0 block w-full bg-transparent dark:text-white resize-none"
              // v-model.trim="newMessage"
              // @keydown.enter.exact.prevent="sendMessage"
              // @keydown.enter.shift.exact.prevent="newMessage += '\n'"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <div className="flex-none md:pr-0 pr-3">
            <button className="h-8 w-8 bg-slate-900 text-white flex flex-col justify-center items-center text-lg rounded-full disabled:pointer-events-none disabled:opacity-60" disabled={sendingMsg}>
              <Icon
                icon="heroicons-outline:paper-airplane"
                className="transform rotate-[60deg]"
              />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default Chat;
