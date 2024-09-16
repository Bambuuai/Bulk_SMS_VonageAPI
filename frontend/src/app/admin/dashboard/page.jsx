"use client";
import dynamic from "next/dynamic";
import React, {useEffect, useState} from "react";
import Card from "@/components/ui/Card";
import DoubleAreaChart from "@/components/partials/chart/appex-chart/AreaSpaline";
import ImageBlock1 from "@/components/partials/widget/block/image-block-1";
import GroupChart1 from "@/components/partials/widget/chart/group-chart-1";
import RevenueBarChart from "@/components/partials/widget/chart/revenue-bar-chart";
import RadialsChart from "@/components/partials/widget/chart/radials";
import SelectMonth from "@/components/partials/SelectMonth";
import CompanyTable from "@/components/partials/table/company-table";
import RecentActivity from "@/components/partials/widget/recent-activity";
import RadarChart from "@/components/partials/widget/chart/radar-chart";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints";
import axios from "@/configs/axios-config"

const Dashboard = () => {
  const [filterMap, setFilterMap] = useState("usa");
  const [usersReport, setUsersReport] = useState(null);
  const [contactsReport, setContactsReport] = useState(null);
  const [campaignReport, setCampaignReport] = useState(null);
  const [messageReport, setMessageReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataCards, setDataCards] = useState([]);
  const [msgMonths, setMsgMonths] = useState([]);
  const [msgTypeMonths, setMsgTypeMonths] = useState([]);
  const [msgTypeChart, setMsgTypeChart] = useState([])
  const [msgChart, setMsgChart] = useState([])

  useEffect(() => {
    axios.get(ADMIN_ENDPOINTS.GET_USERS_REPORT).then(({data}) => {
      if (data.success) {
        setUsersReport(data)
      }
    })

    axios.get(ADMIN_ENDPOINTS.GET_CONTACTS_REPORT).then(({data}) => {
      if (data.success) {
        setContactsReport(data)
      }
    })

    axios.get(ADMIN_ENDPOINTS.GET_CAMPAIGNS_REPORT).then(({data}) => {
      if (data.success) {
        setCampaignReport(data)
      }
    })

    axios.get(ADMIN_ENDPOINTS.GET_MESSAGES_REPORT).then(({data}) => {
      if (data.success) {
        setMessageReport(data)
      }
    })

    axios.get(ADMIN_ENDPOINTS.GET_MESSAGE_DELIVERY_REPORT).then(({data}) => {
      if (data.success) {
        setMsgMonths(data.months)
        // setMsgTypeChart(data.messages)
        setMsgChart([{name: "Delivered", data: data.delivered_accepted}, {name: "Total Sent", data: data.total_sent}, {name: "Failed", data: data.failed_rejected}])
      }
    })

    axios.get(ADMIN_ENDPOINTS.GET_MESSAGE_STATUS_REPORT).then(({data}) => {
      if (data.success) {
        setMsgTypeMonths(data.months)
        setMsgTypeChart([{name: "Sent Messages", data: data.sent_messages}, {name: "Replies", data: data.replies}])
      }
    })
  }, []);

  return (
    <div>
      <HomeBredCurbs title="Admin Dashboard" />
      <div className="grid grid-cols-12 gap-5 mb-5">
        <div className="2xl:col-span-12 lg:col-span-8 col-span-12">
          <Card bodyClass="p-4">
            <div className="grid md:grid-cols-3 col-span-1 gap-4">
              <GroupChart1 isLoading={isLoading} usersReport={usersReport} contactsReport={contactsReport} campaignReport={campaignReport} messageReport={messageReport} />
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="lg:col-span-12 col-span-12">
          <Card>
            <div className="legend-ring">
              <RevenueBarChart months={msgMonths} series={msgChart} />
            </div>
          </Card>
          <Card title="Monthly Message Activity Overview" headerslot={<SelectMonth />}>
            <DoubleAreaChart height={310} months={msgTypeMonths} series={msgTypeChart} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
