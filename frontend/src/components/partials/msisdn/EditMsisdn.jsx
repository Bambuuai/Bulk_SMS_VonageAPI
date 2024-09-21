import React, { useState, useEffect } from "react";
import Select from 'react-select';
import makeAnimated from "react-select/animated";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import FormGroup from "@/components/ui/FormGroup";
import axios from "@/configs/axios-config";
import { normalGroups, prepContactForUpdate } from "@/utils";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints";


const animatedComponents = makeAnimated();

const EditMsisdn = ({ setNumberEdit, numberEdit, updateNumber }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [users, setUsers] = useState([])
  const [userData, setUserData] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  useEffect(() => {
    // reset(numberEdit);
    let assignedUser = { label: "", value: "" }
    console.log(assignedUser)
    if (numberEdit) {
      assignedUser.label = numberEdit?.users?.[0]?.email
      assignedUser.value = numberEdit?.users?.[0]?._id
      // assignedUsers = numberEdit?.users?.map(user => ({label: user.email, value: user._id}))
      // assignedUser = numberEdit?.users?.[0]?.(user => ({label: user.email, value: user._id}))
    }
    setSelected(assignedUser)
    setIsLoading(false)
  }, [numberEdit]);

  const onSubmit = (e) => {
    e.preventDefault();
    console.log(numberEdit)
    setIsLoading(true)
    const did = numberEdit.msisdn
    console.log(selected)
    const userId = selected.value

    axios.post(ADMIN_ENDPOINTS.DID_ASSIGN_USERS, {
      number: numberEdit,
      user: userId
    }).then(({ data }) => {
      console.log(data)
      if (data.success) {
        console.log(userId, userData, userData.filter(user => userId === user._id))
        updateNumber(did, userData.filter(user => userId === user._id));
        setNumberEdit(false);
        notify.success(`User updated for number ${numberEdit.msisdn}`);
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  useEffect(() => {
    axios.get(ADMIN_ENDPOINTS.GET_USERS).then(({ data }) => {
        if (Array.isArray(data)) {
            setUserData(data)
            setUsers(data.map(user => ({ label: user.email, value: user._id })))
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoadingUsers(false))
  }, []);

  useEffect(() => {
    console.log(selected, selected.value === numberEdit?.users?.[0]?._id)
  }, [selected])

  return (
    <Modal
      title="Assign Users"
      className="max-w-xl !overflow-visible"
      activeModal={Boolean(numberEdit)}
      onClose={() => setNumberEdit(false)}
      centered
    >
      <form onSubmit={onSubmit} className="space-y-4 ">
        <FormGroup label="Users">
          <Select
            className="react-select"
            classNamePrefix="select"
            
            classNames={{
              control: () => "max-h-[37px]",
              valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
            }}
            isClearable={false}
            closeMenuOnSelect={true}
            components={animatedComponents}
            value={selected}
            options={users}
            isLoading={isLoadingUsers}

            onChange={(selectedOptions) => {
              setSelected(selectedOptions);
            }}
          />
        </FormGroup>

        <div className="mt-4">
          <Button text="Assign User" type="submit" className="btn btn-dark disabled:pointer-events-none" isLoading={isLoading} disabled={selected.value === numberEdit?.users?.[0]?._id} />
          {/* disabled={selected.value === numberEdit?.users?.[0]._id} */}
        </div>
      </form>
    </Modal>
  );
};

export default EditMsisdn;
