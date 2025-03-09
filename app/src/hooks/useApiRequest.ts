'use client'
import { ErrorBtn } from "@/utils/Interfaces";
import { useState } from "react";
import { toast } from "sonner";

type FetchState<T> = {
    data: T | null;
    error: Error | null;
    loading: boolean;
    button?: ErrorBtn;
};

interface Response<T> {
    message: string;
    error?: string;
    button?: ErrorBtn;
    data?: T | null
}

const useApiRequest = <T, P = undefined>(
    fetchFunction: (params?: P) => Promise<T | null>
) => {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        loading: false,
        button: undefined
    });

    const fetchData = async (params?: P) => {
        const actions: Record<string, (...args: any[]) => Promise<any>> = {
            POST: (route: string, data: object) => createData(route, data),
            GET: (route: string) => getData(route),
            DELETE: (route: string, data: object) => deleteData(route, data),
        };
        const { createData, deleteData, getData } = await import("@/utils/fetch-from-api");
        const toastId = toast.loading("Loading...");
        let response;
        setState({ data: null, error: null, loading: true });
        try {
            const result = await fetchFunction(params) as Response<T>;
            response = result;
            setState({ data: result.data as T, error: null, loading: false, button: result.button });
        } catch (err) {
            setState({ data: null, error: err as Error, loading: false });
        } finally {
            if (response?.error) {
                // If there is an error and a button, show a toast with an action
                if (response.button) {
                    const { method, link, body } = response.button
                    toast.error(response.error, {
                        action: {
                            label: response.button.label,
                            onClick: async () => {
                                // Trigger the corresponding API call
                                const toastId = toast.loading("Loading...");
                                const { message, error } = await actions[method](link, body);
                                // console.log(error)
                                toast[message ? 'success' : 'error'](message ?? error, { id: toastId });
                            },
                        },
                        id: toastId,
                    });
                } else {
                    // If there's an error but no button, just show a simple error toast
                    toast.error(response.error, { id: toastId });
                }
            } else {
                // If there's no error, show a success message
                if (response?.button) {
                    const { method, link, body } = response.button
                    toast.success(response.message ?? "Success", {
                        action: {
                            label: response.button.label,
                            onClick: async () => {
                                // Trigger the corresponding API call
                                if (method) {
                                    const toastId = toast.loading("Loading...");
                                    const { message, error } = await actions[method](link, body);
                                    // console.log(error)
                                    toast[message ? 'success' : 'error'](message ?? error, { id: toastId });
                                    return
                                }
                                window.open(link,'_blank')
                            },
                        },
                        id: toastId,
                    });
                }
                toast.success(response?.message ?? "Success", { id: toastId });

            }
        }
    };

    return { ...state, execute: fetchData };
};

export default useApiRequest;
