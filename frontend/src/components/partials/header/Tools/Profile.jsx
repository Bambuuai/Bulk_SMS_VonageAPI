import React from "react";
import Dropdown from "@/components/ui/Dropdown";
import Icon from "@/components/ui/Icon";
import { Menu, Transition } from "@headlessui/react";
import { useDispatch, useSelector } from "react-redux";
import { handleLogout } from "@/components/partials/auth/store";
import { useRouter } from "next/navigation";

const ProfileLabel = () => {
  const {firstName, lastName} = useSelector(state => state.auth ?? {})

  return (
    <div className="flex items-center">
      <div className="flex-1 ltr:mr-[10px] rtl:ml-[10px]">
        <div className="lg:h-8 lg:w-8 h-7 w-7 rounded-full text-xs bg-slate-200 flex items-center justify-center font-semibold">
          {firstName?.charAt(0) + lastName?.charAt(0)}
        </div>
      </div>
      <div className="flex-none text-slate-600 dark:text-white text-sm font-normal items-center lg:flex hidden overflow-hidden text-ellipsis whitespace-nowrap">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap block font-medium"> {/* w-[85px] */}
          {firstName + " " + lastName}
        </span>
        <span className="text-base inline-block ltr:ml-[10px] rtl:mr-[10px]">
          <Icon icon="heroicons-outline:chevron-down"></Icon>
        </span>
      </div>
    </div>
  );
};

const Profile = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const ProfileMenu = [
    {
      label: "Profile",
      icon: "heroicons-outline:user",

      action: () => {
        router.push("/profile");
      },
    },
    {
      label: "Settings",
      icon: "heroicons-outline:cog",
      action: () => {
        router.push("/settings");
      },
    },
    {
      label: "Faq",
      icon: "heroicons-outline:information-circle",
      action: () => {
        router.push("/faq");
      },
    },
    {
      label: "Logout",
      icon: "heroicons-outline:login",
      action: () => {
        router.push("/login")
        dispatch(handleLogout(false));
      },
    },
  ];

  return (
    <Dropdown label={ProfileLabel()} classMenuItems="w-[180px] top-[58px]">
      {ProfileMenu.map((item, index) => (
        <Menu.Item key={index}>
          {({ active }) => (
            <div
              onClick={() => item.action()}
              className={`${
                active
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-600 dark:text-slate-300 dark:bg-opacity-50"
                  : "text-slate-600 dark:text-slate-300"
              } block     ${
                item.hasDivider
                  ? "border-t border-slate-100 dark:border-slate-700"
                  : ""
              }`}
            >
              <div className={`block cursor-pointer px-4 py-2`}>
                <div className="flex items-center">
                  <span className="block text-xl ltr:mr-3 rtl:ml-3">
                    <Icon icon={item.icon} />
                  </span>
                  <span className="block text-sm font-medium">{item.label}</span>
                </div>
              </div>
            </div>
          )}
        </Menu.Item>
      ))}
    </Dropdown>
  );
};

export default Profile;
