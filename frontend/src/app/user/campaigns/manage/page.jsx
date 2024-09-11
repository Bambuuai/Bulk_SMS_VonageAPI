"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import CampaignList from "@/components/partials/campaigns/CampaignList";
import Loading from "@/components/Loading";
import notify from "@/app/notify";
import EditCampaign from "@/components/partials/campaigns/EditCampaign";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";

const ManageCampaignsPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const [campaigns, setCampaigns] = useState([])
  const [campaignEdit, setCampaignEdit] = useState()
  const [editing, setEditing] = useState([])

  useEffect(() => {
    axios.get(USER_ENDPOINTS.GET_CAMPAIGNS).then(({ data }) => {
        if (Array.isArray(data)) {
            setCampaigns(data)
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoaded(true))
  }, []);

  useEffect(() => {
    console.log(campaignEdit)
  }, [campaignEdit])

  function updateLocalCampaign(newData) {
    const newList = [...campaigns]
    newList[campaignEdit] = newData
    // const campaignIndex = newList.findIndex(campaign => campaign._id === newData._id)
    console.log(newList)
    setCampaigns(newList)
  }

  function updateCampaignEdit(id) {
    console.log(id, campaigns)
    setCampaignEdit(campaigns.find(value => value._id === id))
  }

  function addCampaignToQueue(id) {
    console.log("Edit it", id)
    setEditing(former => [...former, id])
    axios.post(USER_ENDPOINTS.ADD_CAMPAIGN_TO_QUEUE, [id]).then(({ data }) => {
      if (Array.isArray(data)) {
        console.log(data)
        notify.success("Campaign added to queue")
      }
    }).finally(() => setEditing(former => former.filter(cid => cid !== id)))
  }

  function deleteCampaign(id) {
    console.log("DElete it", id)
    setEditing(former => [...former, id])
    const body = {campaign_ids: [id]}
    console.log(body)
    axios.delete(USER_ENDPOINTS.DELETE_CAMPAIGNS, {data: [id]}).then(({ data }) => {
      if (data.success) {
        notify.success("Campaign deleted")
        setCampaigns(former => former.filter(campaign => campaign._id !== id))
      }
  }).finally(() => setEditing(former => former.filter(cid => cid !== id)))
  }

  return (
    <div className="h-full">
      {/* <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Campaigns
        </h4>
      </div> */}
      {!isLoaded && (
        <Loading className="app_height-footer" />
      )}

      {isLoaded && (
        campaigns.length ? (
          <div>
            <CampaignList campaigns={campaigns} updateCampaignEdit={updateCampaignEdit} deleteCampaign={deleteCampaign} addToQueue={addCampaignToQueue} editing={editing} />
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center container-center">
            <img className="w-60" src="/assets/images/custom/broadcasting.png" alt="Illustration showing speakerphone and two message bubbles" />
            <p className="mt-4 text-center font-medium">You have not created any campaigns</p> 
          </div>
        )
      )}
      <EditCampaign campaignEdit={campaignEdit} setCampaignEdit={setCampaignEdit} updateLocalCampaign={updateLocalCampaign} />
    </div>
  );
};

export default ManageCampaignsPage;
