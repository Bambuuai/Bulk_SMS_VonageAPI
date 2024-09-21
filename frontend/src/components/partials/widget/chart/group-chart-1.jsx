import React from "react";
import dynamic from "next/dynamic";
import Icon from "@/components/ui/Icon";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });


// const statistics = [
//   {
//     name: shapeLine1,
//     title: "Users",
//     count: "0",
//     bg: "bg-[#E5F9FF] dark:bg-slate-900	",
//   },
//   {
//     name: shapeLine2,
//     title: "Campaigns",
//     count: "0",
//     bg: "bg-[#FFEDE5] dark:bg-slate-900	",
//   },
//   {
//     name: shapeLine3,
//     title: "SMS Delivery Rate",
//     count: "0.0%",
//     bg: "bg-[#EAE5FF] dark:bg-slate-900	",
//   },
// ];
const GroupChart1 = ({ isLoading, usersReport, contactsReport, campaignReport, messageReport }) => {
  const statistics = [
  {
    name: "fluent:",
    title: "Users",
    count: usersReport?.total_users ?? 0,
    bg: "bg-[#E5F9FF] dark:bg-slate-900	",
  },
  {
    name: "fluent:",
    title: "Phone Numbers",
    count: usersReport?.assigned_numbers + usersReport?.unassigned_numbers ?? 0,
    bg: "bg-[#FFEDE5] dark:bg-slate-900	",
  },
    {
      name: "fluent:",
      title: "Contacts",
      count: contactsReport?.total_contacts ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "DNC",
      count: contactsReport?.total_user_dnc + contactsReport?.total_admin_dnc ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "Campaigns in Queue",
      count: campaignReport?.total_queues ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "Campaigns Completed",
      count: campaignReport?.status_counts?.completed ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "Campaigns Scheduled",
      count: campaignReport?.status_counts?.scheduled ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "Messages Sent",
      count: messageReport?.total_sent_messages ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
    {
      name: "fluent:",
      title: "Replies Received",
      count: messageReport?.total_replied_messages ?? 0,
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
    },
  // {
  //   name: "fluent:",
  //   title: "SMS Delivery Rate",
  //   count: "0.0%",
  //   bg: "bg-[#EAE5FF] dark:bg-slate-900	",
  // },
];

  return (
    <>
      {statistics.map((item, i) => (
        <div className={`py-[18px] px-4 rounded-[6px] ${item.bg}`} key={i}>
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="flex-none">
              <Icon icon={item.name} />
            </div>
            <div className="flex-1">
              <div className="text-slate-800 dark:text-slate-300 text-sm mb-1 font-medium">
                {item.title}
              </div>
              <div className="text-slate-900 dark:text-white text-lg font-medium">
                {item.count}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default GroupChart1;
