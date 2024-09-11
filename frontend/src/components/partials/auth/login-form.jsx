import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import Button from "@/components/ui/Button";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { handleAuth } from "./store";
import axios from "@/configs/axios-config";
import { TOKEN_ENDPOINT } from "@/constant/endpoints";
import qs from "qs";
import notify from "@/app/notify"

const schema = yup
  .object({
    username: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();
const LoginForm = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    //
    mode: "all",
  });
  const router = useRouter();
  const onSubmit = (values) => {
    setIsLoading(true)

    axios.post(TOKEN_ENDPOINT, qs.stringify(values)).then(({ data }) => {
      const access_token = data["access_token"]
      if (access_token) {
        dispatch(handleAuth(data))
        notify.success("Login is successful")
        if (data["is_admin"] === true) {
          router.push("/admin/dashboard");
        }
        if (data["is_admin"] === false) {
          router.push("/user/dashboard")
        }
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
      <Textinput
        name="username"
        label="email"
        defaultValue="johnlake@gmail.com"
        type="email"
        register={register}
        error={errors?.username}
      />
      <Textinput
        name="password"
        label="password"
        type="password"
        defaultValue="password"
        register={register}
        error={errors.password}
      />
      <div className="flex justify-between">
        {/* <Checkbox
          value={checked}
          onChange={() => setChecked(!checked)}
          label="Keep me signed in"
        /> */}
        <Link
          href="/forgot-password"
          className="text-sm text-slate-800 dark:text-slate-400 leading-6 font-medium"
        >
          Forgot Password?{" "}
        </Link>
      </div>

      <Button type="submit" text="Sign in" className="btn btn-dark block w-full text-center" isLoading={isLoading} />
    </form>
  );
};

export default LoginForm;
