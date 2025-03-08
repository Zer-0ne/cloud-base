import { ExternalToast, toast } from "sonner"

export const success = (message: string, data?: ExternalToast) => toast.success(message, data)
export const info = (message: string, data?: ExternalToast) => toast.info(message, data)
export const defaultToast = (message: string, data?: ExternalToast) => toast(message, data)
export const error = (error: string, data?: ExternalToast) => toast(error, data)
export const loading = (message: string) => {
    const id = toast.loading(message);
    return id;
};