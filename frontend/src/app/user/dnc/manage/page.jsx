"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import DNCList from "@/components/partials/dnc/DNCList";
import TableLoading from "@/components/skeleton/Table";
import EditDNC from "@/components/partials/dnc/EditDNC";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";

const ManageUsersPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const [dncs, setDncs] = useState([])
  const [dncEdit, setDncEdit] = useState(false)
  const [deleting, setDeleting] = useState([])

  useEffect(() => {
    axios.get(USER_ENDPOINTS.GET_DNCS).then(({ data }) => {
        console.log(data)
        if (Array.isArray(data)) {
          const myDncs = data.filter(dnc => dnc.scope === "user")
          setDncs(myDncs)
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoaded(true))
  }, []);

  function updateLocalDnc(newData) {
    const newList = [...dncs]
    const dncIndex = newList.findIndex(dnc => dnc._id === newData._id)
    newList[dncIndex] = newData
    console.log(newList)
    setDncs(newList)
  }

  function deleteDnc(id) {
    console.log("DElete it", id)
    setDeleting(former => [...former, id])
    axios.delete(USER_ENDPOINTS.DELETE_DNCS, {data: [id]}).then(({ data }) => {
      if (data.success) {
        setDncs(former => former.filter(dnc => dnc._id !== id))
      }
    })
  }

  return (
    <div>
      {/* <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Users
        </h4>
      </div> */}
      {!isLoaded && (
        <TableLoading count={3} />
      )}

      {isLoaded && (
        <div>
          <DNCList dncs={dncs} setDncEdit={setDncEdit} deleteDnc={deleteDnc} deleting={deleting} />
        </div>
      )}
      <EditDNC dncEdit={dncEdit} setDncEdit={setDncEdit} updateLocalDnc={updateLocalDnc} UPDATE_ENDPOINT={USER_ENDPOINTS.UPDATE_DNC} />
    </div>
  );
};

export default ManageUsersPage;
