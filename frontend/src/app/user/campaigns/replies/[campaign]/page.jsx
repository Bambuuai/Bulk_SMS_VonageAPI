"use client";

import React, { useEffect, useState } from "react";
import SimpleBar from "simplebar-react";
import useWidth from "@/hooks/useWidth";
import { useSelector, useDispatch } from "react-redux";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Contacts from "@/components/partials/replies/Contacts";
import Chat from "@/components/partials/replies/Chat";
import Blank from "@/components/partials/replies/Blank";
import Info from "@/components/partials/replies/Info";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";
import {
	setContacts,
	closeChat,
	sendMessage,
} from "@/components/partials/replies/store";
import {
	toggleMobileChatSidebar,
	setContactSearch,
} from "@/components/partials/replies/store";
import Loading from "@/components/Loading";
import { selectAuthState, selectChatData } from "@/store/selectors";

const ChatPage = ({ params }) => {
	const { width, breakpoints } = useWidth();
	const [isLoading, setIsLoading] = useState(true);
	const { auth } = useSelector(selectAuthState);
	const dispatch = useDispatch();
	const { activeChat, openInfo, mobileChatSidebar, contacts, searchContact } =
		useSelector(selectChatData);

	const searchContacts = contacts?.filter((item) => {
		// console.log(item)
		return item.info.name
			.toLowerCase()
			.includes(searchContact.toLowerCase());
	});

	useEffect(() => {
		const socket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_ROUTE}/stream/replies?token=${auth}`);
		socket.onmessage = (event) => {
			const newReply = event.data;
			dispatch(sendMessage(JSON.parse(newReply)));
		};

		socket.onclose = () => {
			console.log("WebSocket closed");
		};

		socket.onerror = (error) => {
			console.log("WebSocket error:", error);
		};

		return () => socket.close();
	}, [dispatch, auth]);

	useEffect(() => {
		dispatch(setContacts([]));
		dispatch(closeChat({ activeChat: false }));

		axios
			.get(USER_ENDPOINTS.GET_CHAT_CONTACTS + `/${params.campaign}`)
			.then(({ data }) => {
				if (Array.isArray(data)) {
					dispatch(setContacts(data));
				}
			})
			.finally(() => setIsLoading(false));
	}, []);

	return (
		<div className="flex lg:space-x-5 chat-height overflow-hidden relative rtl:space-x-reverse">
			<div
				className={`transition-all duration-150 flex-none min-w-[260px] 
        ${
			width < breakpoints.lg
				? "absolute h-full top-0 md:w-[260px] w-[200px] z-[999]"
				: "flex-none min-w-[260px]"
		}
        ${
			width < breakpoints.lg && mobileChatSidebar
				? "left-0 "
				: "-left-full "
		}
        `}
			>
				<Card
					bodyClass=" relative p-0 h-full overflow-hidden "
					className="h-full bg-white"
				>
					<div className="border-b border-slate-100 dark:border-slate-700 pb-1 pt-4 mb-2">
						<div className="search px-3 mx-6 rounded flex items-center space-x-3 rtl:space-x-reverse">
							<div className="flex-none text-base text-slate-900 dark:text-slate-400">
								<Icon icon="bytesize:search" />
							</div>
							<input
								onChange={(e) =>
									dispatch(setContactSearch(e.target.value))
								}
								placeholder="Search..."
								className="w-full flex-1 block bg-transparent placeholder:font-normal placeholder:text-slate-400 py-2 focus:ring-0 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-400"
							/>
						</div>
					</div>
					<SimpleBar className="contact-height full-content-height">
						{searchContacts?.length ? (
							searchContacts?.map((contact, i) => (
								<Contacts
									key={i}
									campaignId={params.campaign}
									contact={contact}
								/>
							))
						) : (
							<Loading className="!h-full" />
						)}
					</SimpleBar>
				</Card>
			</div>

			{/* overlay */}
			{width < breakpoints.lg && mobileChatSidebar && (
				<div
					className="overlay bg-slate-900 dark:bg-slate-900 dark:bg-opacity-60 bg-opacity-60 backdrop-filter
         backdrop-blur-sm absolute w-full flex-1 inset-0 z-[99] rounded-md"
					onClick={() =>
						dispatch(toggleMobileChatSidebar(!mobileChatSidebar))
					}
				></div>
			)}

			{/* mai  chat box*/}
			<div className="flex-1">
				<div className="parent flex space-x-5 h-full rtl:space-x-reverse">
					{/* main message body*/}
					<div className="flex-1">
						<Card
							bodyClass="p-0 h-full"
							className="h-full bg-white"
						>
							{activeChat ? (
								<div className="divide-y divide-slate-100 dark:divide-slate-700 h-full">
									<Chat campaignId={params.campaign} />
								</div>
							) : (
								<Blank />
							)}
						</Card>
					</div>
					{/* right side information*/}
					{width > breakpoints.lg && openInfo && activeChat && (
						<div className="flex-none w-[285px]">
							<Card
								bodyClass="p-0 h-full"
								className="h-full bg-white"
							>
								<Info />
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ChatPage;
