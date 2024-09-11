import notify from "@/app/notify";
import { handleApiErr } from "@/utils";
import defaultAxios from "axios";

let access_token = false
if (typeof window !== "undefined") {
    access_token = window?.localStorage.getItem("auth")
}
const axios = defaultAxios.create({
    // baseURL: "https://fastapi-9ji4.onrender.com",
    baseURL: "http://localhost:8000",
})

axios.interceptors.request.use(
    (config) => {
        const access_token = typeof window !== "undefined" ? window.localStorage.getItem("auth") : null;
        console.log(config)
        if (access_token && (config.url.startsWith("/admin") || config.url.startsWith("/user")) || config.url === "/profile") {
            config.headers.Authorization = `Bearer ${access_token}`;
        }
        return config;
    }
);

axios.interceptors.response.use(
    response => {
        return response
    },
    (error) => {
        handleApiErr(error)
        return Promise.reject(error);
    }
)

export default axios