"use client";

import Select from "react-select";
import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import CreatableSelect from 'react-select/creatable';
import Textarea from "@/components/ui/Textarea";
import makeAnimated from "react-select/animated";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import FormGroup from "@/components/ui/FormGroup";
import InputGroup from "@/components/ui/InputGroup";
import Icon from "@/components/ui/Icon";
import Flatpickr from "react-flatpickr";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "@/configs/axios-config";
import notify from "@/app/notify";
import { USER_ENDPOINTS } from "@/constant/endpoints"
import "flatpickr/dist/themes/airbnb.css"
import { normalGroups } from "@/utils";
import {formatToDisplay} from "@/utils";

const FormValidationSchema = yup
  .object({
      name: yup.string().required("Campaign name is required"),
      message: yup.string().required("Campaign message is required"),
  })
  .required();

const animatedComponents = makeAnimated();

const batchSizeOptions = [
  { label: "50 messages per batch", value: 50 },
  { label: "100 messages per batch", value: 100 },
  { label: "150 messages per batch", value: 150 },
  { label: "200 messages per batch", value: 200 },
]

const bufferSizeOptions = [
  { label: "1 minute between batches", value: 1 },
  { label: "2 minutes between batches", value: 2 },
  { label: "5 minutes between batches", value: 5 },
]

const throttleOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
]

const CreateCampaignPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(true)
  const [groupOptions, setGroupOptions] = useState([])
  const [userNumbers, setUserNumbers] = useState([])
  
  const [includeOptOut, setIncludeOptOut] = useState(false);
  const [groups, setGroups] = useState([]);
  const [msisdn, setMsisdn] = useState({})
  const [batchSize, setBatchSize] = useState(batchSizeOptions[0])
  const [buffer, setBuffer] = useState(bufferSizeOptions[0])
  const [throttle, setThrottle] = useState(throttleOptions[0])


  useEffect(() => {
    axios.get(USER_ENDPOINTS.FETCH_CONTACT_GROUPS).then(({ data }) => {
      if (Array.isArray(data)) {
        setGroupOptions(data.map(group => ({ value: group, label: group })))
      }
    }).finally(() => setIsLoadingGroups(false))

    axios.get(USER_ENDPOINTS.GET_NUMBERS).then(({ data }) => {
      if (Array.isArray(data)) {
        setUserNumbers(data.map(number => ({ value: number.msisdn, label: formatToDisplay(number.msisdn) })))
      }
    }).finally(() => setIsLoadingNumbers(false))
  }, [])

  const {
    register,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm({
    resolver: yupResolver(FormValidationSchema),
    mode: "all",
  });

  const onSubmit = (data) => {
    setIsLoading(true)
    const body = {...data, sender_msisdn: msisdn.value, contact_groups: normalGroups(groups, true), batch_size: batchSize.value, buffer_time: buffer.value, throttle: throttle.value, include_opt_out: includeOptOut}
    console.log(body)
    axios.post(USER_ENDPOINTS.CREATE_CAMPAIGN, body).then((response) => {
      if (response.data["_id"]) {
        notify.success("Campaign Created Successfully");
        reset();
        setGroups([])
      }
      console.log(response.data)
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title="Create Campaign">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <InputGroup
              label="Campaign Name"
              name="name"
              type="text"
              placeholder="Whole Foods Advert"
              prepend={<Icon icon="heroicons-outline:user" />}
              register={register}
              error={errors.name}
              merged
            />
            <FormGroup label="Contact Groups">
              <Select
                className="react-select capitalize"
                classNamePrefix="select"
                
                classNames={{
                  control: () => "max-h-[37px]",
                  valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                }}
                isClearable={false}
                components={animatedComponents}
                value={groups}
                options={groupOptions}

                onChange={(selectedOptions) => {
                  setGroups(selectedOptions);
                }}
                isLoading={isLoadingGroups}
                isMulti
                required
                // {...register("groups")}
              />
            </FormGroup>
            
            <FormGroup label="Sender MSISDN">
              <Select
                className="react-select"
                classNamePrefix="select"
                classNames={{
                  control: () => "max-h-[37px]",
                  valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                }}
                
                // defaultValue={furits[2]}
                value={msisdn}

                onChange={setMsisdn}
                name="loading"
                options={userNumbers}
                isLoading={isLoadingNumbers}
                isClearable={false}
                id="numbers"
                required
                // onChange={(selectedOptions) => {
                //   setGroups(selectedOptions);
                // }}
              />
            </FormGroup>

            <FormGroup label="Batch Size">
              <Select
                className="react-select"
                classNamePrefix="select"
                classNames={{
                  control: () => "max-h-[37px]",
                  valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                }}
                value={batchSize}

                onChange={setBatchSize}
                name="batch_size"
                options={batchSizeOptions}
                id="batch_size"
                required
              />
            </FormGroup>

            <FormGroup label="Buffer Time">
              <Select
                className="react-select"
                classNamePrefix="select"
                classNames={{
                  control: () => "max-h-[37px]",
                  valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                }}
                value={buffer}

                onChange={setBuffer}
                name="buffer"
                options={bufferSizeOptions}
                id="buffer"
                required
              />
            </FormGroup>

            <FormGroup label="Throttle">
              <Select
                className="react-select"
                classNamePrefix="select"
                classNames={{
                  control: () => "max-h-[37px]",
                  valueContainer: () => "gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
                }}
                value={throttle}

                onChange={setThrottle}
                name="buffer"
                options={throttleOptions}
                id="buffer"
                required
              />
            </FormGroup>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 schedule-time">
            
            <Textarea 
              className="col-span-2"
              label="Message" 
              name="message" 
              placeholder="Do you want the best to eat? Click this link to learn more." 
              row="3"
              append={"Creation Sees"}
              error={errors.message}
              register={register} 
            />
            <div className="flex gap-x-10">
              <Checkbox
                label="Include Opt Out"
                value={includeOptOut}
                onChange={() => setIncludeOptOut(!includeOptOut)}
              />
            </div>
          </div>
          <div className="space-y-4">
            <Button type="submit" text="Submit" icon="heroicons-outline:arrow-long-right" iconPosition="right" className="btn-dark rounded-[999px]" isLoading={isLoading} />
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateCampaignPage;
