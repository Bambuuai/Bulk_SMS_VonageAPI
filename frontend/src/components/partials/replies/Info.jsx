import React from "react";
import SimpleBar from "simplebar-react";
import { useSelector } from "react-redux";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/Loading";
import Button from "@/components/ui/Button";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";

const socials = [
  {
    name: "facebook",
    icon: "bi:facebook",
    link: "#",
  },
  {
    name: "twitter",
    link: "#",
    icon: "bi:twitter",
  },
  {
    name: "instagram",
    link: "#",
    icon: "bi:instagram",
  },
];

const Info = () => {
  const { activechat, user } = useSelector((state) => state.chat);
  const firstName = user?.name?.split(" ")[0]
  const lastName = user?.name?.split(" ")[1]

  function addContactDnc() {
    // axios.post(USER_ENDPOINTS.)
  }

  return (
    <SimpleBar className="full-content-height h-full p-6">
      {
        user?.name ? (
          <>
            <h4 className="text-xl text-slate-900 font-medium mb-8">About</h4>
            <div className="h-[100px] w-[100px] rounded-full mx-auto mb-4">
              <div className="w-full h-full rounded-full text-2xl bg-slate-200 flex items-center justify-center font-bold">
                {firstName?.charAt(0) + lastName?.charAt(0)}
              </div>
            </div>
            <div className="text-center">
              <h5 className="text-base text-slate-600 dark:text-slate-300 font-medium mb-1">
                {user?.name}
              </h5>
              <h6 className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                {user?.notes}
              </h6>
            </div>
            <ul className="list-item mt-12 space-y-4 border-b border-slate-100 dark:border-slate-700 pb-5 -mx-6 px-6">
              <li className="flex justify-between text-sm text-slate-600 dark:text-slate-300 leading-[1]">
                <div className="flex space-x-2 items-start rtl:space-x-reverse">
                  <Icon
                    icon="heroicons-outline:location-marker"
                    className="text-base"
                  />
                  <span>Location</span>
                </div>
                <div className="font-medium">United States</div>
              </li>
              <li className="flex justify-between text-sm text-slate-600 dark:text-slate-300 leading-[1]">
                <div className="flex space-x-2 items-start rtl:space-x-reverse">
                  <Icon icon="heroicons-outline:user" className="text-base" />
                  <span>Added</span>
                </div>
                <div className="font-medium">Oct 2021</div>
              </li>
            </ul>
            <Button className="btn btn-danger w-full" onClick={addContactDnc}>Add to DNC</Button>
          </>
        ) : <Loading className="h-full" />
      }
    </SimpleBar>
  );
};

export default Info;
