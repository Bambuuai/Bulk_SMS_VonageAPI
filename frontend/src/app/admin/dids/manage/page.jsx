"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import useWidth from "@/hooks/useWidth";
import Button from "@/components/ui/Button";
import MsisdnList from "@/components/partials/msisdn/MsisdnList";
import TableLoading from "@/components/skeleton/Table";
import { toggleAddModal } from "@/components/partials/msisdn/store";
import AddMsisdn from "@/components/partials/msisdn/AddMsisdn";
import { ToastContainer } from "react-toastify";
import EditMsisdn from "@/components/partials/msisdn/EditMsisdn";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints";
import axios from "@/configs/axios-config";

const ManageDIDsPage = () => {
  const { width, breakpoints } = useWidth();
  const [isLoading, setIsLoading] = useState(true);
  const [numbers, setNumbers] = useState([]);
  const [editing, setEditing] = useState([])
  const [numberEdit, setNumberEdit] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const dispatch = useDispatch();

  useEffect(() => {
    axios.get(ADMIN_ENDPOINTS.GET_NUMBERS).then(({ data }) => {
      console.log(data)
      if (Array.isArray(data)) {
          setNumbers(data)
      }
  }).catch(err => console.log(err))
    .finally(() => setIsLoading(false))
  }, []);

  function addNumber(number) {
    setNumbers(former => [...former, {...number, users: []}])
  }

  function setEditNumber(number) {
    setNumberEdit(number)
  }

  function updateNumber(did, users) {
    const newNumbers = [...numbers]
    const numIndex = newNumbers.findIndex(number => number.msisdn === did)
    newNumbers[numIndex] = {...newNumbers[numIndex], users}
    console.log(newNumbers)
    setNumbers(newNumbers)
  }

  return (
    <div>
      <ToastContainer />
      <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Numbers
        </h4>
        <div
          className={`${
            width < breakpoints.md ? "space-x-rb" : ""
          } md:flex md:space-x-4 md:justify-end items-center rtl:space-x-reverse`}
        >
          <Button
            icon="heroicons-outline:plus"
            text="Buy Number"
            className="btn-dark dark:bg-slate-800  h-min text-sm font-normal"
            iconClass=" text-lg"
            onClick={() => setShowAddModal(true)}
          />
        </div>
      </div>
      {isLoading && (
        <TableLoading count={6} />
      )}
      {
        !isLoading ? (
        <div>
            {
              numbers.length ? (
                <MsisdnList msisdns={numbers} operating={editing} editNumber={setEditNumber} />
              ) : <p>No numbers assigned</p>
            }
        </div> ) : ""
      }

      <AddMsisdn open={showAddModal} toggleAddModal={setShowAddModal} updateNumbers={addNumber} />
      <EditMsisdn numberEdit={numberEdit} setNumberEdit={setNumberEdit} updateNumber={updateNumber} />
    </div>
  );
};

export default ManageDIDsPage;
