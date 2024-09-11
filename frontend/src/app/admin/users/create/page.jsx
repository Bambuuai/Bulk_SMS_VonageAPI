"use client";

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup";
import Icon from "@/components/ui/Icon";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "@/configs/axios-config";
import notify from "@/app/notify";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints"

const FormValidationSchema = yup
  .object({
      first_name: yup.string().required("First name is Required"),
      last_name: yup.string().required("Last name is Required"),
      company: yup.string().required("Company is Required"),
      email: yup.string().email("Invalid email").required("Email is Required"),
      username: yup.string().required("Username is Required"),
      password: yup.string().required("Password is Required"),
    confirmPassword: yup
      .string()
      .required("Confirm the User's password")
      .oneOf([yup.ref("password")], "Passwords do not match"),
  })
  .required();

const CreateUserPage = () => {
  const [isLoading, setIsLoading] = useState(false);
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
    const {confirmPassword, ...body} = data

    console.log(body)
    axios.post(ADMIN_ENDPOINTS.CREATE_USER, body).then((response) => {
      if (response.data["success"]) {
        // notify.success("User created successfully. Check email for activation link.");
        notify.success("User created successfully.");
        reset();
      }
      console.log(response.data)
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title="Create User">
        <form className="grid grid-cols-2 gap-x-8 gap-y-5" onSubmit={handleSubmit(onSubmit)}>
          <InputGroup
            label="First Name"
            name="first_name"
            type="text"
            placeholder="Beige"
            prepend={<Icon icon="heroicons-outline:user" />}
            register={register}
            error={errors.first_name}
            merged
          />
          <InputGroup
            label="Last Name"
            name="last_name"
            type="text"
            placeholder="Kraken"
            prepend={<Icon icon="heroicons-outline:user" />}
            register={register}
            error={errors.last_name}
            merged
          />
          <InputGroup
            label="Company"
            name="company"
            type="text"
            placeholder="Amazon"
            prepend={<Icon icon="heroicons-outline:user-group" />}
            register={register}
            error={errors.company}
            merged
          />
          <InputGroup
            label="Username"
            name="username"
            type="text"
            placeholder="eagle2"
            prepend={<Icon icon="heroicons-outline:phone" />}
            register={register}
            error={errors.username}
            merged
          />
          <InputGroup
            label="Email"
            name="email"
            type="email"
            className="col-span-2"
            placeholder="beigeagle@company.com"
            prepend={<Icon icon="heroicons-outline:mail" />}
            register={register}
            error={errors.email}
            merged
          />
          <InputGroup
            label="Password"
            name="password"
            type="password"
            placeholder="........"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors.password}
            merged
          />
          <InputGroup
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="........"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors.confirmPassword}
            merged
          />
          <div className="space-y-4">
            <label class="block capitalize form-label"></label>
            <Button type="submit" text="Submit" icon="heroicons-outline:arrow-long-right" iconPosition="right" className="btn-dark w-full" isLoading={isLoading} />
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateUserPage;
