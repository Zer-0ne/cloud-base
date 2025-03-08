import { Data } from "./Interfaces";

export const getCurrentDateTime = () => {
    const now = new Date();

    // Format the date and time
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // Use 24-hour format
    };

    // Get the formatted date and time
    const formattedDateTime = now.toLocaleString('en-US', options as Data);
    return formattedDateTime;
}
