'use server'

import { cookies } from "next/headers";
// import { print } from "./color-print";
import { WebSocket } from 'ws'
// import { apiKey } from "@/lib/Models/userSchema";
// import { TokenManager } from "@/lib/jwt";
import { Logs } from "@/components/admin-panel";
import { revalidatePath } from "next/cache";
import { ErrorBtn } from "./Interfaces";

/**
 * Fetch data from the server using the specified HTTP method and route.
 *
 * This function constructs a request to the specified API route, including any cookies
 * that are currently stored in the browser. It supports various HTTP methods such as
 * GET, POST, DELETE, and PUT, and can send data to the server in JSON format.
 *
 * @param {string} route - The API route to send the request to. This should be a relative
 *                         path that will be appended to the base URL defined in the
 *                         environment variable `process.env.URL`.
 * @param {string} method - The HTTP method to use for the request. This can be one of the
 *                          following: 'GET', 'POST', 'DELETE', or 'PUT'.
 * @param {object} [data] - The data to be sent to the server. This should be an object
 *                          that will be serialized to JSON. This parameter is optional;
 *                          if not provided, the request will be sent without a body.
 *
 * @returns {Promise<T | null>} - Returns a promise that resolves to the response data
 *                                 as a JSON object of type T if the request is successful;
 *                                 otherwise, returns null.
*
* @throws {Error} - Throws an error if the fetch operation fails due to network issues
*                   or if the response cannot be parsed as JSON. This can be handled
*                   by the calling function to provide appropriate error handling.
*
* @example
* // Example usage of dataFetch function
* const fetchData = async () => {
*     const data = await dataFetch('user/profile', 'GET');
*     if (data) {
*         console.log('User Profile:', data);
*     } else {
*         console.error('Failed to fetch user profile');
*     }
* };
*/
const dataFetch = async <T>(route: string, method: string, authHeaders?: string, data?: object): Promise<T | null> => {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    // const refershToken = allCookies.find(cookie => cookie.name === 'token')?.value ?? ''
    const refershToken = await getCookie('token')
    // console.log(refershToken)
    // console.log(refershToken)

    // Create a cookie string to send in the headers
    const cookieHeader = allCookies?.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    // console.log(`${process.env.GOOGLE_API_URL}/${route}`)

    const response = await fetch(`${process.env.GOOGLE_API_URL}/${route}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            ...(authHeaders && { Authorization: `Bearer ${authHeaders}` }),
            'x-refresh-token': refershToken!,
        },
        body: data ? JSON.stringify(data) : undefined,
        redirect: 'manual' // This will prevent automatic following of redirects
    });

    // Handle redirects separately
    if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get('Location');
        return redirectUrl as T;
    } else {
        // Check if the response is JSON
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const res = await response.json();
            // console.log(res)
            return res;
        } else {
            // If not JSON, read the text and log it for debugging
            const text = await response.text();
            // console.error('Expected JSON but received:', text);
            throw new Error(`Expected JSON response, but got: ${text}`);
        }
    }
}

export const getData = async <T>(route: string, headers?: string, data?: object): Promise<T | null> => {
    try {
        // console.log('Route testing ', route)
        const response = await dataFetch<T>(route, 'GET', headers, data);
        return response as T;
    } catch (error) {
        console.error('Error getting data:', (error as Error).message);
        return null; // Agar error aaye to null return karna
    }
}


export const deleteData = async (route: string, data: object, headers?: string): Promise<object | null> => {
    try {
        const { message } = await dataFetch<{ message: string | null }>(route, 'DELETE', headers, data) as { message: string };
        return { message, data: true };
    } catch (error) {
        console.error('Error deleting data:', error);
        return { error: (error as Error).message, data: false };
    }
};

async function extractIdFromUrl(url: string) {
    return url.split('https://lh3.googleusercontent.com/drive-storage/')[1];
}

export const getURL = async (url: string): Promise<string> => {
    return `${process.env.GOOGLE_API_URL?.replace('google_api', 'localhost')}/api/storage/${await extractIdFromUrl(url?.replace(/=s220$/, ""))}`;
};


export const createData = async <T = object>(
    route: string,
    data: object,
    headers?: string
): Promise<{ data: T; message: string, error: string; button?: ErrorBtn } | null> => {
    try {
        const { data: resData, message, error, button } = await dataFetch<{ data: T; message: string }>(
            route,
            'POST',
            headers,
            data
        ) as { data: T, message: string; error: string, button?: ErrorBtn };
        return { data: resData, message, error, button };
    } catch (error) {
        console.error('Error creating data:', error);
        return null
    }
};

export const getCookie = async (key: string) => {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(key);
    if (cookie) {
        return cookie.value
    }
    return undefined
}

const webSocket = async () => {
    const refershToken = await getCookie('token')
    const ws = new WebSocket('ws://example.com', {

        headers: {
            'x-refresh-token': refershToken!,
        }
    });

}

export const setCookie = async (token: string) => {
    try {
        const cookieStore = await cookies();
        // console.log(token)
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // Set an expiration date if needed
            // maxAge: 60 * 60 * 24 * 7, // 1 week
        });
        return true
    } catch (error) {
        console.error('Error setting cookie:', error)
        return false
    }
}
