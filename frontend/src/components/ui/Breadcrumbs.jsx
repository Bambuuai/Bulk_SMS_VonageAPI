import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

const Breadcrumbs = ({ menuItems }) => {
  const location = usePathname();
  const locationName = location.replace("/", "");
  
  const [isHide, setIsHide] = useState(null);
  const [groupTitle, setGroupTitle] = useState("");
  
  useEffect(() => {
    const currentMenuItem = menuItems.find(
      (item) => item.link === locationName
    );

    const currentChild = menuItems.find((item) =>
      item.child?.find((child) => child.childlink === locationName)
    );

    if (currentMenuItem) {
      setIsHide(currentMenuItem.isHide);
    } else if (currentChild) {
      setIsHide(currentChild?.isHide || false);
      setGroupTitle(currentChild?.title);
    }
  }, [location, locationName, menuItems]);

  return (
    <>
      {!isHide ? (
        <div className="md:mb-6 mb-4 flex space-x-3 rtl:space-x-reverse">
          <ul className="breadcrumbs">
            <li className="text-primary-500">
              <Link href="/login" className="text-lg">
                <Icon icon="heroicons-outline:home" />
              </Link>
              <span className="breadcrumbs-icon rtl:transform rtl:rotate-180">
                <Icon icon="heroicons:chevron-right" />
              </span>
            </li>
            {groupTitle && (
              <li className="text-primary-500">
                <button type="button" className="capitalize">
                  {groupTitle}
                </button>
                <span className="breadcrumbs-icon rtl:transform rtl:rotate-180">
                  <Icon icon="heroicons:chevron-right" />
                </span>
              </li>
            )}
            {
              locationName.split("/").map((path, index, arr) => 
                <li key={index} className={index !== arr.length - 1 ? "text-primary-500" : ""}>
                  <Link type="button" href={arr.slice(0,index+1).join("/")} className="uppercase font-medium text-xs">
                    {path}
                  </Link>
                  {
                    index === arr.length - 1 ? "" : 
                    <span className="breadcrumbs-icon rtl:transform rtl:rotate-180">
                      <Icon icon="heroicons:chevron-right" />
                    </span>
                  }
                </li>
              )
            }
          </ul>
        </div>
      ) : null}
    </>
  );
};

export default Breadcrumbs;
