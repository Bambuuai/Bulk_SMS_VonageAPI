import { inter } from "@/app/layout" 
import Icon from "@/components/ui/Icon";

const themeMap = {
    error: "danger",
    success: "success",
    info: "info",
    warning: "warning"
}

const iconMap = {
    error: "exclamation-triangle",
    success: "check-badge",
    info: "information-circle",
    warning: "no-symbol"
}

export default function CustomToast({ message, type, closeToast }) {
    return (
        <div className={`alert px-5 alert-${themeMap[type]} light-mode font-medium ${inter.className}`}>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="flex-0 text-[22px]">
                    <Icon icon={`heroicons-solid:${iconMap[type]}`} />
                </div>
                <div className="flex-1">{message}</div>
                <div className="flex-0 text-2xl cursor-pointer" onClick={closeToast}>
                    <Icon icon="heroicons-outline:x" />
                </div>
          </div>
        </div>
    )
}