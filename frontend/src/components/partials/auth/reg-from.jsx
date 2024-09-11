import React, { useState } from "react";
import notify from "@/app/notify";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import axios from "@/configs/axios-config";
import { REGISTER_ENDPOINT } from "@/constant/endpoints"

const schema = yup
  .object({
    first_name: yup.string().required("Please provide your first name to proceed"),
    last_name: yup.string().required("Your last name is required to complete the registration"),
    company: yup.string().required("Admin's company is Required"),
    username: yup.string().required("A unique username is required for your account"),
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup
      .string()
      .min(6, "Password must be at least 8 characters")
      .max(20, "Password shouldn't be more than 20 characters")
      .required("A password is required to secure your account"),
    // gateway: yup.string(),
    // msisdn: yup.string().required("No User Phone Number provided"),
    // confirm password
    confirmPassword: yup
      .string().required("Confirm your password")
      .oneOf([yup.ref("password")], "The passwords you entered do not match. Please try again."),
  })
  .required();

const RegForm = () => {
  // const dispatch = useDispatch();

  // const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "all",
  });

  const router = useRouter();

  const onSubmit = (data) => {
    // dispatch(handleRegister(data));
    setIsLoading(true)
    const {confirmPassword, ...body} = data

    console.log(body)
    axios.post(REGISTER_ENDPOINT, body).then((response) => {
      if (response.data["username"]) {
        notify.success("Registration Successful");
        router.push("/login");
      }
      console.log(response.data)
    }).finally(() => {
      setIsLoading(false)
    })
    
    // console.log(results)
    // setTimeout(() => {
    // }, 3000);

    // toast.success("User logged in successfully", {
    //   position: "top-right",
    //   autoClose: 1500,
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    //   progress: undefined,
    //   theme: "light",
    // });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 ">
      <Textinput
        name="username"
        label="Username"
        type="text"
        placeholder="nomad"
        register={register}
        error={errors.username}
      />
      <Textinput
        name="first_name"
        label="First Name"
        type="text"
        placeholder="John"
        register={register}
        error={errors.first_name}
      />
      <Textinput
        name="last_name"
        label="Last Name"
        type="text"
        placeholder="Lake"
        register={register}
        error={errors.last_name}
      />
      <Textinput
        name="email"
        label="Email Address"
        type="email"
        placeholder="johnlake@gmail.com"
        register={register}
        error={errors.email}
      />
      <Textinput
        name="password"
        label="Password"
        type="password"
        placeholder="unique-password"
        register={register}
        error={errors.password}
      />
      <Textinput
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="unique-password"
        register={register}
        error={errors.confirmPassword}
      />
      <Textinput
        name="company"
        label="Company"
        type="text"
        placeholder="Amazon"
        register={register}
        error={errors.company}
      />
      {/* <Textinput
        name="password"
        label="passwrod"
        type="password"
        placeholder=" Enter your password"
        register={register}
        error={errors.password}
      /> */}
      {/* <Checkbox
        id="tcs"
        name="tcs"
        label="You accept our Terms and Conditions and Privacy Policy"
        value={checked}
        onChange={() => setChecked(!checked)}
      /> */}
      <Button type="submit" text="Create an account" className="btn btn-dark block w-full text-center " isLoading={isLoading} />
    </form>
  );
};

export default RegForm;
