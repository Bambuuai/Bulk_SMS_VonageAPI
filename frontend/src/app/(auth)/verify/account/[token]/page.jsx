"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "@/configs/axios-config";
import { ACTIVATE_USER_ENDPOINT } from "@/constant/endpoints"
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

const defaultStyles = "opacity-1 translate-y-0 duration-150 ease-in-out"
const messageInitial = {opacity: 0, translateY: -12}
const animateMessage = {opacity: 1, translateY: 0, transition: {delay: 0.2}}
const exitMessage = {opacity: 0, translateY: 12}

const VerifyUser = ({ params }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const router = useRouter()
//   If laggy anims become an issue, use framer motion AnimatePresence to render the divs

  useEffect(() => {
    axios.get(ACTIVATE_USER_ENDPOINT + "/" + params.token).then(({ data }) => {
        if (data.success) {
            setActivated(true)
            setTimeout(() => {
                router.push("/login")
            }, 5000)
        }
    }).finally(() => setIsLoading(false))
  }, [])

  return (
    <>
      <div
        className="loginwrapper bg-auto bg-repeat bg-center"
        style={{
          backgroundImage: `url(/assets/images/custom/9.svg)`,
        }}
      >
        <div className="lg-inner-column justify-center">
          <div className="lg:w-1/2 w-full flex flex-col items-center justify-center">
            <div className="auth-box-3 lg:!mr-auto rounded-lg py-14">
              <div className="mobile-logo text-center mb-6 lg:hidden block">
                <Link href="/">
                  <img
                    src=""
                    alt=""
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center relative h-36 flex justify-center">
                <motion.div className={`absolute flex flex-col items-center`} animate={isLoading ? animateMessage : exitMessage}>
                    <div className="activation-loader">
                        <div className="before"></div>
                        <div className="after"></div>
                    </div>
                    <h6 className="font-black uppercase text-base mt-10">Activating your account...</h6>
                </motion.div>  
                <motion.div className="absolute flex flex-col items-center" initial={messageInitial} animate={!isLoading && activated ? animateMessage : messageInitial}>
                    <Icon icon="heroicons-solid:check-badge" className="-mt-3" color="#50C793" width={100} />
                    <h6 className="font-black uppercase text-[15px] mt-3">Account Activated</h6>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                        You will be redirected to the <Link className="text-primary-500" href="/login">login page</Link> in 5s.
                    </p>
                </motion.div>
                <motion.div className="absolute flex flex-col items-center" initial={messageInitial} animate={!isLoading && !activated ? animateMessage : messageInitial}>
                    <Icon icon="heroicons-solid:x-circle" color="#F1595C" width={100} />
                    <h6 className="font-black uppercase text-[15px] mt-3">Invalid Link</h6>
                </motion.div>
                {/* <div className="text-slate-500 dark:text-slate-400 text-base">
                  Sign in to your account to start using Bulk
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyUser;
