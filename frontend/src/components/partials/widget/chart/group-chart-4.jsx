import React, {useEffect, useMemo} from "react";
import Icon from "@/components/ui/Icon";

const statistics = [
  {
    title: "Total Campaigns",
    count: "$3,564",
    bg: "bg-success-500",
    text: "text-success-500",
    percent: "11.67%  ",
    icon: "heroicons-outline:calculator",
  },
  {
    title: "Total Messages",
    count: "64",
    bg: "bg-info-500",
    text: "text-info-500",
    percent: "25.67% ",
    icon: "heroicons-outline:menu-alt-1",
  },
  {
    title: "Total Delivered",
    count: "45",

    bg: "bg-warning-500",
    text: "text-warning-500",
    percent: "8.67%",
    icon: "heroicons-outline:chart-pie",
  },
  {
    title: "Total Rejected",
    count: "190",
    bg: "bg-primary-500",
    text: "text-primary-500",
    percent: "1.67%  ",
    icon: "heroicons-outline:clock",
  },
];
const GroupChart4 = ({ isLoading, contactsReport, campaignsReport, messagesReport }) => {
  const statistics = useMemo(() => [
    {
      title: "Total Campaigns",
      count: campaignsReport?.total_campaigns ?? 0,
      bg: "bg-success-500",
      text: "text-success-500",
      percent: "11.67%",
      icon: "heroicons-outline:megaphone",
    },
    {
      title: "Queued Campaigns",
      count: campaignsReport?.total_queues ?? 0,
      bg: "bg-success-500",
      text: "text-success-500",
      percent: "11.67%  ",
      icon: "heroicons-outline:queue-list",
    },
    {
      title: "Total Messages",
      count: (messagesReport?.total_sent ?? 0) + (messagesReport?.total_replied ?? 0),
      bg: "bg-info-500",
      text: "text-info-500",
      percent: "25.67% ",
      icon: "heroicons-outline:chat-bubble-bottom-center-text",
    },
    {
      title: "Total Delivered",
      count: (messagesReport?.status_counts?.find(item => item._id === "delivered")?.count ?? 0) + (messagesReport?.status_counts?.find(item => item._id === "accepted")?.count ?? 0),
      bg: "bg-warning-500",
      text: "text-warning-500",
      percent: "8.67%",
      icon: "heroicons-outline:chart-pie",
    },
    {
      title: "Total Failed",
      count: (messagesReport?.status_counts?.find(item => item._id === "failed")?.count ?? 0),
      bg: "bg-primary-500",
      text: "text-primary-500",
      percent: "1.67%  ",
      icon: "heroicons-outline:exclamation-circle",
    },
    {
      title: "Total Contacts",
      count: (contactsReport?.total_contacts ?? 0),
      bg: "bg-primary-500",
      text: "text-primary-500",
      percent: "1.67%  ",
      icon: "heroicons-outline:user",
    },
    {
      title: "Total DNC",
      count: (contactsReport?.total_dnc ?? 0),
      bg: "bg-primary-500",
      text: "text-primary-500",
      percent: "1.67%  ",
      icon: "heroicons-outline:bell-slash",
    }
  ], [contactsReport, campaignsReport, messagesReport])

  useEffect(() => {
    console.log(contactsReport, campaignsReport, messagesReport, statistics)
  }, [contactsReport, campaignsReport, messagesReport, statistics]);

  return (
    <>
      {statistics.map((item, i) => (
        <div
          key={i}
          className={`${item.bg} rounded-md p-4 bg-opacity-[0.15] dark:bg-opacity-50 text-center`}
        >
          <div
            className={`${item.text} mx-auto h-10 w-10 flex flex-col items-center justify-center rounded-full bg-white text-2xl mb-4 `}
          >
            <Icon icon={item.icon} />
          </div>
          <span className="block text-[13px] text-slate-600 font-medium dark:text-white mb-2">
            {item.title}
          </span>
          <span className="block mb- text-2xl text-slate-900 dark:text-white font-medium">
            {item.count}
          </span>
        </div>
      ))}
    </>
  );
};

export default GroupChart4;
