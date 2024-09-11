import { toast, ToastOptions } from "react-toastify";
import CustomToast from "@/components/ui/Toast"

const defaultProps = {
    icon: false, 
    autoClose: 3500,
    closeButton: false, 
    closeOnClick: true,
    className: "custom-toast",
    position: "top-right",
    theme: "light",
}

const notify = (message, toastProps) =>
    toast(<CustomToast message={message} />, { ...toastProps, icon: false });

notify.error = (message, toastProps) =>
    toast.error(<CustomToast message={message} type="error" />, { ...defaultProps, ...toastProps });

notify.success = (message, toastProps) =>
    toast.success(<CustomToast message={message} type="success" />, { ...defaultProps, ...toastProps });

notify.info = (message, toastProps) =>
    toast.info(<CustomToast message={message} type="info" />, { ...defaultProps, ...toastProps });

notify.warning = (message, toastProps) =>
    toast.warning(<CustomToast message={message} type="warning" />, { ...defaultProps, ...toastProps });


export default notify