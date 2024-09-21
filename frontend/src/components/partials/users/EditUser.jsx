import React, { useState, useEffect } from "react";
import Switch from "@/components/ui/Switch";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import FormGroup from "@/components/ui/FormGroup";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints"
import Checkbox from "@/components/ui/Checkbox";
import axios from "@/configs/axios-config";


const EditUser = ({ userEdit, setUserEdit, updateLocalUser }) => {
  const [isDisabled, setIsDisabled] = useState(userEdit?.disabled)
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswd, setShowPasswd] = useState(false)
  
  const FormValidationSchema = yup
    .object({
      first_name: yup.string().default(userEdit.first_name),
      last_name: yup.string().default(userEdit.last_name),
      username: yup.string().default(userEdit.username),
      password: yup.string().default("").min(8, "Password must be at least 8 characters"),
      disabled: yup.boolean().default(userEdit.disabled),
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
    reset(userEdit);
    setShowPasswd(false);
  }, [userEdit, reset]);

  useEffect(() => {
    if (userEdit) {
      setIsDisabled(userEdit?.disabled)
      console.log(userEdit)
    }
  }, [userEdit])

  const onSubmit = (update) => {

    setIsLoading(true)
    const body = {
      user_updates: [
        {
          first_name: update.first_name.trim(),
          last_name: update.last_name.trim(),
          username: update.username.trim(),
          password: update.password.trim(),
          disabled: isDisabled
        }
      ],
      user_ids: [userEdit._id]
    }
    console.log(update, body)
    axios.put(ADMIN_ENDPOINTS.UPDATE_USER, body).then(({ data }) => {
      console.log(data)
      if (data.modified) {
        updateLocalUser(data.users[0] || {});
        setUserEdit(false);
        notify.success("User Edited Successfully");
      } else {
        notify.info("No valid updates")
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <Modal
      title="Edit User"
      activeModal={Boolean(userEdit)}
      onClose={() => setUserEdit(false)}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
        <FormGroup label="First Name" error={errors.first_name}>
          <input
            type="text"
            defaultValue={userEdit?.first_name}
            className="form-control py-2"
            {...register("first_name")}
          />
        </FormGroup>
        
        <FormGroup label="Last Name" error={errors.last_name}>
          <input
            type="text"
            defaultValue={userEdit?.last_name}
            className="form-control py-2"
            {...register("last_name")}
          />
        </FormGroup>
        <FormGroup label="Username" error={errors.username}>
          <input
            type="text"
            defaultValue={userEdit?.username}
            className="form-control py-2"
            {...register("username")}
          />
        </FormGroup>
        {
          showPasswd ? (
            <FormGroup className="border-t border-slate-100 dark:border-slate-700 py-4" label="Password" error={errors.password}>
              <input
                type="password"
                className="form-control py-2"
                {...register("password")}
              />
            </FormGroup>
          ) : ""
        }

        <Checkbox
          label="Active"
          value={!isDisabled}
          onChange={() => setIsDisabled(!isDisabled)}
        />

        <div className="ltr:text-right rtl:text-left flex justify-between items-center">
          <Switch
            label="Change Password"
            value={showPasswd}
            onChange={() => setShowPasswd(!showPasswd)}
          />
          <div className="flex gap-4">
            {/*<Button text="Change Password" type="submit" className="btn btn-dark text-center" isLoading={isLoading} />*/}
            <Button text="Update" type="submit" className="btn btn-dark text-center" isLoading={isLoading} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditUser;
