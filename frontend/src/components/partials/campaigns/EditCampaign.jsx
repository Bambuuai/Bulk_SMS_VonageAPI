import React, { useState, useEffect } from "react";
import CreatableSelect from 'react-select/creatable';
import makeAnimated from "react-select/animated";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import FormGroup from "@/components/ui/FormGroup";
import { USER_ENDPOINTS } from "@/constant/endpoints"
import Checkbox from "@/components/ui/Checkbox";
import axios from "@/configs/axios-config";

const animatedComponents = makeAnimated();

const EditCampaign = ({ campaignEdit, setCampaignEdit, updateLocalUser }) => {
  const [isDisabled, setIsDisabled] = useState(campaignEdit?.disabled)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groups, setGroups] = useState([]);
  const [groupOptions, setGroupOptions] = useState([])

  useEffect(() => {
    axios.get(USER_ENDPOINTS.FETCH_CONTACT_GROUPS).then(({ data }) => {
      if (Array.isArray(data)) {
        setGroupOptions(data.map(group => ({ value: group, label: group })))
      }
    }).finally(() => setIsLoadingGroups(false))
  }, [])

  const FormValidationSchema = yup
    .object({
      first_name: yup.string().default(campaignEdit?.first_name),
      last_name: yup.string().default(campaignEdit?.last_name),
      username: yup.string().default(campaignEdit?.username),
      disabled: yup.boolean().default(campaignEdit?.disabled),
    })
    .required();

  const {
    register,
    control,
    reset,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(FormValidationSchema),

    mode: "all",
  });

  useEffect(() => {
    reset(campaignEdit);
  }, [campaignEdit, reset]);

  useEffect(() => {
    if (campaignEdit) {
      setIsDisabled(campaignEdit?.disabled)
      console.log(campaignEdit)
    }
  }, [campaignEdit])

  const onSubmit = (update) => {

    setIsLoading(true)
    const body = {
      user_updates: [
        {
          first_name: update.first_name.trim(),
          last_name: update.last_name.trim(),
          username: update.username.trim(),
          disabled: isDisabled
        }
      ],
      user_ids: [campaignEdit._id]
    }
    console.log(update, body)
    axios.put(USER_ENDPOINTS.UPDATE_CAMPAIGNS, body).then(({ data }) => {
      console.log(data)
      if (data.modified) {
        updateLocalUser(data.users[0] || {});
        setCampaignEdit(false);
        notify.success("Campaign Edited Successfully");
      } else {
        notify.info("No valid updates")
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <Modal
      title="Edit Campaign"
      activeModal={Boolean(campaignEdit)}
      onClose={() => setCampaignEdit(false)}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
        <FormGroup label="Campaign Title" error={errors.title}>
          <input
            type="text"
            defaultValue={campaignEdit?.first_name}
            className="form-control py-2"
            {...register("title")}
          />
        </FormGroup>
        
        <FormGroup label="Message" error={errors.message}>
          <input
            type="text"
            defaultValue={campaignEdit?.last_name}
            className="form-control py-2"
            {...register("message")}
          />
        </FormGroup>
        <FormGroup label="Contact Groups">
            <CreatableSelect
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
                onCreateOption={(value) => {
                  const obj = { value: value, label: value }
                  setGroupOptions(former => [...former, obj])
                  setGroups(former => [...former, obj])
                }}
                isLoading={isLoadingGroups}
                isMulti
                required
                // {...register("groups")}
            />
        </FormGroup>

        <Checkbox
          label="Active"
          value={!isDisabled}
          onChange={() => setIsDisabled(!isDisabled)}
        />

        <div className="ltr:text-right rtl:text-left">
          <Button text="Update" type="submit" className="btn btn-dark text-center" isLoading={isLoading} />
        </div>
      </form>
    </Modal>
  );
};

export default EditCampaign;
