"use client";

import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import GroupChart4 from "@/components/partials/widget/chart/group-chart-4";
import DonutChart from "@/components/partials/widget/chart/donut-chart";
import DoubleAreaChart from "@/components/partials/chart/appex-chart/AreaSpaline";
import SelectMonth from "@/components/partials/SelectMonth";
import TaskLists from "@/components/partials/widget/task-list";
import MessageList from "@/components/partials/widget/message-list";
import TrackingParcel from "@/components/partials/widget/activity";
import TeamTable from "@/components/partials/table/team-table";
import { meets, files } from "@/constant/data";
import CalendarView from "@/components/partials/widget/CalendarView";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import {useEffect, useState} from "react";
import { USER_ENDPOINTS} from "@/constant/endpoints";
import axios from "@/configs/axios-config"

const UserDashboard = () => {
  const [contactsReport, setContactsReport] = useState(null);
  const [campaignReport, setCampaignReport] = useState(null);
  const [messageReport, setMessageReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataCards, setDataCards] = useState([]);
  const [months, setMonths] = useState([]);
  const [msgTypeChart, setMsgTypeChart] = useState([])

  useEffect(() => {
      axios.get(USER_ENDPOINTS.GET_CONTACTS_REPORT).then(({data}) => {
        if (data.success) {
          setContactsReport(data.data)
        }
      })

      axios.get(USER_ENDPOINTS.GET_CAMPAIGNS_REPORT).then(({data}) => {
        if (data.success) {
          setCampaignReport(data.data)
        }
      })

      axios.get(USER_ENDPOINTS.GET_MESSAGES_REPORT).then(({data}) => {
        if (data.success) {
          setMessageReport(data.data)
        }
      })

      axios.get(USER_ENDPOINTS.GET_MESSAGE_STATUS_REPORT).then(({data}) => {
        if (data.success) {
            setMonths(data.months)
            // setMsgTypeChart(data.messages)
            setMsgTypeChart([{name: "Sent Messages", data: data.messages}, {name: "Replies", data: data.replies}])
        }
      })
  }, []);

  return (
      <div className="space-y-5">
        <HomeBredCurbs title="User Dashboard" />
        <div className="grid grid-cols-12 gap-5">
          <div className="lg:col-span-12 col-span-12 space-y-5"> {/*  span-8 */}
            <Card>
              <div className="grid grid-cols-12 gap-5">
                <div className="xl:col-span-12 col-span-12">  {/*  span-8 */}
                  <div className="grid lg:grid-cols-7 md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-3">  {/*  md:grid-cols-4 */}
                    <GroupChart4 isLoading={isLoading} contactsReport={contactsReport} campaignsReport={campaignReport} messagesReport={messageReport} />
                  </div>
                </div>

                {/*<div className="xl:col-span-4 col-span-12">*/}
                {/*  <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-4">*/}
                {/*  <span className="block dark:text-slate-400 text-sm text-slate-600">*/}
                {/*    Progress*/}
                {/*  </span>*/}
                {/*    <DonutChart />*/}
                {/*  </div>*/}
                {/*</div>*/}
              </div>
            </Card>
            <Card title="Monthly Message Activity Overview" headerslot={<SelectMonth />}>
              <DoubleAreaChart height={310} months={months} series={msgTypeChart} />
            </Card>
          </div>
          {/*<div className="lg:col-span-4 col-span-12 space-y-5">*/}
          {/*  <Card title="Notes">*/}
          {/*    <div className="mb-12">*/}
          {/*      <CalendarView />*/}
          {/*    </div>*/}
          {/*    <ul className="divide-y divide-slate-100 dark:divide-slate-700">*/}
          {/*      {meets.map((item, i) => (*/}
          {/*          <li key={i} className="block py-[10px]">*/}
          {/*            <div className="flex space-x-2 rtl:space-x-reverse">*/}
          {/*              <div className="flex-1 flex space-x-2 rtl:space-x-reverse">*/}
          {/*                <div className="flex-none">*/}
          {/*                  <div className="h-8 w-8">*/}
          {/*                    <img*/}
          {/*                        src={item.img}*/}
          {/*                        alt=""*/}
          {/*                        className="block w-full h-full object-cover rounded-full border hover:border-white border-transparent"*/}
          {/*                    />*/}
          {/*                  </div>*/}
          {/*                </div>*/}
          {/*                <div className="flex-1">*/}
          {/*              <span className="block text-slate-600 text-sm dark:text-slate-300 mb-1 font-medium">*/}
          {/*                {item.title}*/}
          {/*              </span>*/}
          {/*                  <span className="flex font-normal text-xs dark:text-slate-400 text-slate-500">*/}
          {/*                <span className="text-base inline-block mr-1">*/}
          {/*                  <Icon icon="heroicons-outline:video-camera" />*/}
          {/*                </span>*/}
          {/*                    {item.meet}*/}
          {/*              </span>*/}
          {/*                </div>*/}
          {/*              </div>*/}
          {/*              <div className="flex-none">*/}
          {/*            <span className="block text-xs text-slate-600 dark:text-slate-400">*/}
          {/*              {item.date}*/}
          {/*            </span>*/}
          {/*              </div>*/}
          {/*            </div>*/}
          {/*          </li>*/}
          {/*      ))}*/}
          {/*    </ul>*/}
          {/*  </Card>*/}
          {/*  <Card title="Activity" headerslot={<SelectMonth />}>*/}
          {/*    <TrackingParcel />*/}
          {/*  </Card>*/}
          {/*</div>*/}
        </div>
        {/*<div className="grid xl:grid-cols-3 grid-cols-1 gap-5">*/}
        {/*  <Card title="Task list" headerslot={<SelectMonth />}>*/}
        {/*    <TaskLists />*/}
        {/*  </Card>*/}
        {/*  <Card title="Messages" headerslot={<SelectMonth />}>*/}
        {/*    <MessageList />*/}
        {/*  </Card>*/}
        {/*</div>*/}
      </div>
  );
};

export default UserDashboard;
