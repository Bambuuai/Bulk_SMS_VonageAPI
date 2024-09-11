import React, { useState, useEffect } from "react";
import Select, { components } from "react-select";
import Modal from "@/components/ui/Modal";
import { useSelector, useDispatch } from "react-redux";
import Button from "@/components/ui/Button";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import FormGroup from "@/components/ui/FormGroup";
import axios from "@/configs/axios-config";


const EditDNC = ({ setDncEdit, dncEdit, updateLocalDnc, UPDATE_ENDPOINT }) => {
  // const { editModal, dncEdit } = useSelector((state) => state.users);
  // const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false)

  const FormValidationSchema = yup
    .object({
      phone_number: yup.string().default(dncEdit.phone_number),
      reason: yup.string().default(dncEdit.reason),
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
    reset(dncEdit);
  }, [dncEdit, reset]);

  const onSubmit = (update) => {
    update.reason = update.reason.trim()
    setIsLoading(true)
    const body = {
      updates: [
        {
          reason: update.reason
        }
      ],
      phone_numbers: [update.phone_number]
    }
    console.log(update, body)
    axios.put(UPDATE_ENDPOINT, body).then(({ data }) => {
      console.log(data)
      if (data.modified) {
        updateLocalDnc(update);
        setDncEdit(false);
        notify.success("DNC Updated Successfully");
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <Modal
      title="Edit DNC"
      activeModal={Boolean(dncEdit)}
      onClose={() => setDncEdit(false)}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
        <FormGroup label="Reason" error={errors.reason}>
          <input
            type="text"
            defaultValue={dncEdit.reason}
            className="form-control py-2"
            {...register("reason")}
          />
        </FormGroup>

        <div className="">
          <Button text="Update DNC" type="submit" className="btn btn-dark" isLoading={isLoading} />
        </div>
      </form>
    </Modal>
  );
};

export default EditDNC;
