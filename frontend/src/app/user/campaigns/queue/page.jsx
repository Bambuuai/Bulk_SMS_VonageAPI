"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import QueueList from "@/components/partials/queue/QueueList";
import notify from "@/app/notify";
import EditQueue from "@/components/partials/queue/EditQueue";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";
import Loading from "@/components/Loading";

const QueueQueuePage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const [queues, setQueues] = useState([])
  const [queueEdit, setQueueEdit] = useState(false)
  const [editing, setEditing] = useState([])

  useEffect(() => {
    // Add optional body field in db to specify if campaign data should also be sent
    axios.get(USER_ENDPOINTS.GET_CAMPAIGN_QUEUES).then(({ data }) => {
        if (Array.isArray(data)) {
            setQueues(data)
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoaded(true))
  }, []);

  useEffect(() => {
    console.log(queueEdit)
  }, [queueEdit])

  function updateLocalQueue(newData) {
    const newList = [...queues]
    newList[queueEdit] = newData
    // const queueIndex = newList.findIndex(queue => queue._id === newData._id)
    console.log(newList)
    setQueues(newList)
  }

  function editQueue(id, newStatus) {
    console.log("Changing Status", newStatus)
    setEditing(former => [...former, id])
    const body = {
      queue_id: id,
      status: newStatus
    }
    axios.put(USER_ENDPOINTS.UPDATE_CAMPAIGN_QUEUES, [body]).then(({ data }) => {
      if (data.success) {
        setQueues(former => {
          const item_index = former.findIndex(item => item._id == id)
            former[item_index] = {...former[item_index], status: newStatus}
            return former
        })
        notify.success("Queue entry updated")
      }
    }).finally(() => setEditing(former => former.filter(cid => cid !== id)))
  }

  return (
    <div className="h-full">
      {/* <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Queues
        </h4>
      </div> */}
      {!isLoaded && (
        <Loading className="app_height-footer" />
      )}

      {isLoaded && (
        queues.length ? (
        <div>
          <QueueList queues={queues} editQueue={editQueue} editing={editing} />
        </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center container-center">
            <img className="w-60" src="/assets/images/custom/queue.png" alt="Queue Illustration" />
            <p className="mt-4 text-center font-medium">No campaigns in queue</p> 
          </div>
        )
      )}
    </div>
  );
};

export default QueueQueuePage;
