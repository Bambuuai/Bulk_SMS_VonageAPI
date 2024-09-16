"use client";

import Card from "@/components/ui/Card";
import CreatableSelect from 'react-select/creatable';
import makeAnimated from "react-select/animated";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { useForm, useFieldArray } from "react-hook-form";
import InputGroup from "@/components/ui/InputGroup";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints"
import notify from "@/app/notify";
import { useEffect, useState } from "react";
import DropZone from "@/components/partials/froms/DropZone";
import {formatToVonage, verifyNumbers} from "@/utils";


const animatedComponents = makeAnimated();



// const schema = yup
//   .object({
//     reason: yup.string(),
//     phone_number: yup.string().matches(/^[1-9]\d{8,14}$/, "Phone number is not valid").required("Phone number is required")
//   }).required()

const AddCONTACTs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [groupOptions, setGroupOptions] = useState([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const { register, control, handleSubmit, reset, setValue, watch, setError, formState: { errors } } = useForm({
    defaultValues: {
        contacts: [{name: "", phone_number: "", groups: [""], notes: ""}]
    },
    // resolver: yupResolver(schema)
  });

  useEffect(() => {
    axios.get(USER_ENDPOINTS.FETCH_CONTACT_GROUPS).then(({ data }) => {
      if (Array.isArray(data)) {
        setGroupOptions(data.map(group => ({ value: group, label: group })))
      }
    }).finally(() => setIsLoadingGroups(false))
  }, [])

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  function getInputs(file) {
    setLoadingFile(true)
    const formData = new FormData()
    formData.append("file", file)

    axios.post(USER_ENDPOINTS.IMPORT_CONTACTS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(({ data }) => {
      if (Array.isArray(data) && data.length) {
        data.forEach(contact => {
          contact.groups = contact.groups.map(group => ({ value: group.toLowerCase(), label: group }))
          return contact
        })
        console.log(data)
        append(data)
      }
    })
    .catch(err => console.log(err))
    .finally(() => setLoadingFile(false))
  }
  
  function onSubmit({ contacts }) {
    setIsLoading(true)
    const hasErrors = verifyNumbers(contacts, setError, "contacts")
    if (hasErrors) {
      setIsLoading(false)
      return;
    }
    contacts = formatToVonage(contacts)

    contacts.forEach(contact => {
      contact.groups = contact?.groups?.filter(group => group) ?? []
      if (contact.groups.length) {
        contact.groups = contact.groups.map(group => typeof group === "string" ? group?.toLowerCase() : group?.value?.toLowerCase())
      } else {
        contact.groups = ["default"]
      }
      return contact
    })
    console.log(fields)
    console.log(contacts)
    axios.post(USER_ENDPOINTS.ADD_CONTACTS, contacts).then(({ data }) => {
      if (Array.isArray(data)) {
        notify.success(`Contact${data.length > 1 ? "(s)" : ""} Added Successfully`)
        reset()
      }
    }).finally(() => {
       setIsLoading(false)
    })
  }

  const groups = [
    {value: "default", label: "Default"}
  ]

  return (
    <div className="space-y-10">
      <Card
        title="Add Contacts"
        headerslot={
          <Button
            text="Add New Contact"
            icon="heroicons-outline:plus"
            className="btn-dark"
            onClick={() => append()}
            disabled={isLoading}
          />
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {fields.map((item, index) => (
            <div
              className="lg:grid-cols-4 md:grid-cols-2 grid-cols-1 grid gap-5 mb-8 last:mb-0"
              key={index}
            >
                <div className="flex-1">
                    <InputGroup
                        label="Name"
                        type="text"
                        id={`name-${index}`}
                        placeholder="Jin Sakai"
                        register={register}
                        name={`contacts[${index}].name`}
                        required
                    />
                </div>
                <div className="flex-1">
                    <InputGroup
                        label="Phone Number"
                        type="tel"
                        id={`phone-${index}`}
                        placeholder="+23470329126405"
                        register={register}
                        error={errors?.contacts?.[index]?.phone_number}
                        name={`contacts[${index}].phone_number`}
                        required
                    />
                </div>
                <div className="flex-1">
                    {/* <InputGroup
                        label="Groups"
                        type="text"
                        id={`groups-${index}`}
                        placeholder="Leave empty to use default group"
                        register={register}
                        name={`contacts[${index}].groups`}
                    /> */}
                    <label className="form-label">Groups</label>
                    <CreatableSelect
                      id={`groups-${index}`}
                      name={`contacts[${index}].groups`}
                      className="react-select capitalize"
                      classNamePrefix="select"

                      classNames={{
                        control: () => "max-h-[37px]",
                        valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                      }}
                      options={groupOptions}
                      isLoading={isLoadingGroups}
                      isClearable={false}
                      closeMenuOnSelect={true}
                      components={animatedComponents}

                      defaultValue={item?.groups || []}
                      value={watch(`contacts[${index}].groups`)}
                      onChange={(selectedOptions) => {
                        setValue(`contacts[${index}].groups`, selectedOptions || []);
                      }}

                      isMulti
                    />
                </div>

              <div className="flex justify-between items-start space-x-5">
                <div className="flex-1">
                    <InputGroup
                        label="Notes"
                        type="text"
                        id={`notes-${index}`}
                        placeholder="User loves whole foods"
                        register={register}
                        name={`contacts[${index}].notes`}
                    />
                </div>
                <div className="flex-none h-full relative">
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="inline-flex items-center justify-center h-full w-10 bg-danger-500 text-lg border rounded border-danger-500 text-white disabled:opacity-40 disabled:pointer-events-none disabled:!cursor-not-allowed"
                    disabled={isLoading}
                  >
                    <Icon icon="heroicons-outline:trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="ltr:text-right rtl:text-left">
            <Button type="submit" text="Submit" className="btn-dark" isLoading={isLoading} />
          </div>
        </form>
      </Card>

      <div className="xl:col-span-2 col-span-1">
        <Card title="File upload">
          <DropZone loading={loadingFile} onFilesSelected={getInputs} />
        </Card>
      </div>
    </div>
  );
};

export default AddCONTACTs;
