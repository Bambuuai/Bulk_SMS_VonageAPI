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


const EditQueue = ({ queueEdit, setQueueEdit, updateLocalQueue }) => {
  const [isDisabled, setIsDisabled] = useState(queueEdit?.disabled)
  const [isLoading, setIsLoading] = useState(false)
  const statusOptions = [
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress"},
    { value: "paused", label: "Paused"},
    { value: "completed", label: "Completed"},
    { value: "cancelled", label: "Cancelled"},
    { value: "failed", label: "Failed"}
  ]
  const [status, setStatus] = useState()

  const FormValidationSchema = yup
    .object({
      status: yup.string().default(queueEdit?.first_name),
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
    reset(queueEdit);
  }, [queueEdit, reset]);

  useEffect(() => {
    if (queueEdit) {
      setIsDisabled(queueEdit?.disabled)
      console.log(queueEdit)
    }
  }, [queueEdit])

  const onSubmit = (update) => {
    setIsLoading(true)
    const body = {
      queue_updates: [
        {
          first_name: update.first_name.trim(),
          last_name: update.last_name.trim(),
          queuename: update.queuename.trim(),
          disabled: isDisabled
        }
      ],
      queue_ids: [queueEdit._id]
    }
    console.log(update, body)
    axios.put(USER_ENDPOINTS.UPDATE_CAMPAIGN_QUEUES, body).then(({ data }) => {
      console.log(data)
      if (data.modified) {
        updateLocalQueue(data.queues[0] || {});
        setQueueEdit(false);
        notify.success("Queue Edited Successfully");
      } else {
        notify.info("No valid updates")
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <Modal
      title="Edit Queue"
      className="max-w-xl overflow-visible"
      activeModal={Boolean(queueEdit)}
      onClose={() => setQueueEdit(false)}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
        <FormGroup label="Status">
          <CreatableSelect
            className="react-select capitalize"
            classNamePrefix="select"

            isClearable={false}
            closeMenuOnSelect={true}
            components={animatedComponents}
            value={status}
            options={statusOptions}
            defaultValue={{value: queueEdit.status, label: queueEdit.status}}

            onChange={(selectedStatus) => {
              setStatus(selectedStatus);
            }}
            required
            // {...register("groups")}
          />
        </FormGroup>

        <div className="ltr:text-right rtl:text-left">
          <Button text="Update" type="submit" className="btn btn-dark text-center" isLoading={isLoading} />
        </div>
      </form>
    </Modal>
  );
};

export default EditQueue;
