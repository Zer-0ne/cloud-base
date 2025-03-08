'use client'
import { useState, useCallback, useEffect } from "react";

type FetchState<T> = {
    data: T | null;
    error: Error | null;
    loading: boolean;
};

interface Response<T> {
    message: string;
    error?: string;
    data?: T | null
}

const useFetch = <T>(fetchFunction: () => Promise<T | null>) => {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        loading: false,
    });

    const fetchData = useCallback(async () => {
        setState({ data: null, error: null, loading: true });
        try {
            const result = await fetchFunction() as Response<T>;
            setState({ data: result?.data!, error: null, loading: false });
        } catch (err) {
            setState({ data: null, error: err as Error, loading: false });
        }
    }, [fetchFunction]);

    // Automatically call fetchData on page load (component mount)
    useEffect(() => {
        fetchData();
    }, []);

    return { ...state, refetch: fetchData };
};

export default useFetch;
