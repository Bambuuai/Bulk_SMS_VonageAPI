import axios from "@/configs/axios-config";
import { handleAuth } from "@/components/partials/auth/store";
import { useDispatch } from "react-redux";
import { USER_ENDPOINTS } from "@/constant/endpoints";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const no_redirects = ["/register", "/forgot-password", "/reset-password", "/coming-soon", "/under-construction", "/faq", "/verify/account"]

export default function RouteValidator({ children }) {
  const router = useRouter();
  const { auth, username, isAdmin } = useSelector((state) => state.auth ?? {});
  const dispatch = useDispatch();
  const location = usePathname();

  useEffect(() => {
    const checkCredentials = async () => {
      if (no_redirects.some(path => location.startsWith(path))) {
        return;
      }

      console.log(auth)
      if (!auth && location !== "/login") {
        router.push("/login")
      }
      if (!username) {
        try {
          const { data } = await axios.get("/profile", { _silent: true })
          if (data["_id"]) {
            console.log("Running this")
            if (data["is_admin"] === false && location.startsWith("/admin")) {
              router.push("/user/dashboard")
            }
            if (data["is_admin"] && location.startsWith("/user")) {
              router.push("/admin/dashboard")
            }
            dispatch(handleAuth(data))
          }
        } catch (err) {
          // If Invalid, push to login and delete token
          console.log("Removing AUTH from localStorage")
          window?.localStorage.removeItem("auth")
          router.push("/login")

        }
      }
      if (auth && username && location === "/") {
        if (isAdmin) {
            router.push("/admin/dashboard")
        }
        if (!isAdmin) {
            router.push("/user/dashboard")
        }
      }
    }

    checkCredentials()
    console.log("Run twice")
    //darkMode;
  }, [router, auth, dispatch, location, username, isAdmin]);

    return children
}