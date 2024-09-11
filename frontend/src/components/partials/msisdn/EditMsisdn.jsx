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
  const [selected, setSelected] = useState([]);
  const [users, setUsers] = useState([])
  const [userData, setUserData] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  useEffect(() => {
    // reset(numberEdit);
    let assignedUsers = []
    if (numberEdit) {
      assignedUsers = numberEdit?.users?.map(user => ({label: user.email, value: user._id}))
    }
    setSelected(assignedUsers)
  }, [numberEdit]);

  const onSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true)
    const did = numberEdit.msisdn
    const userIds = selected.map(option => option.value)

    console.log(selected)
    axios.post(ADMIN_ENDPOINTS.DID_ASSIGN_USERS, {
      number: numberEdit,
      users: userIds
    }).then(({ data }) => {
      console.log(data)
      if (data.success) {
        console.log(userIds, userData, userData.filter(user => userIds.includes(user._id)))
        updateNumber(did, userData.filter(user => userIds.includes(user._id)));
        setNumberEdit(false);
        notify.success(`User${selected.length > 1 ? "s" : ""} updated for number ${numberEdit.msisdn}`);
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
    console.log(selected)
  }, [selected])

  return (
    <Modal
      title="Assign Users"
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
            isMulti
          />
        </FormGroup>

        <div className="">
          <Button text={`Assign User${selected.length > 1 ? "s" : ""}`} type="submit" className="btn btn-dark" isLoading={isLoading} />
        </div>
      </form>
    </Modal>
  );
};

export default EditMsisdn;
