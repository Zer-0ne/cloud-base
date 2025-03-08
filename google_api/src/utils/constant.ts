export const DateRFC3339 = () => {
    const date = new Date();

    // Get the components of the date
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // Construct the RFC 3339 string
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
};

export function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";

    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024)); // Determine the unit index
    const converted = bytes / Math.pow(1024, i); // Convert bytes to the selected unit
    return `${converted.toFixed(2)} ${sizes[i]}`; // Return formatted value
}


/**
 * Converts a storage unit string to its corresponding size in bytes.
 * The input string should contain a number followed by a valid storage unit (e.g., 'B', 'KB', 'MB', 'GB', 'TB', etc.).
 * The function assumes binary storage units (base 1024).
 * 
 * Example inputs:
 * - '15 GB' -> 15 * 1024^3 bytes
 * - '1 TB'  -> 1 * 1024^4 bytes
 * - '100 MB' -> 100 * 1024^2 bytes
 * 
 * @param {string} input - A string containing a number followed by a valid storage unit (e.g., '15 GB', '1 TB', '100 MB').
 * @returns {number | null} - The equivalent size in bytes. Returns `null` if the input format is invalid.
 * 
 * @example
 * const result = convertToBytes("1 GB"); // Returns 1073741824 bytes (1 * 1024^3)
 */
export const convertToBytes = (input: string): number | null => {
    // Regular expression to match numbers followed by storage units (case-insensitive)
    const match = input?.trim().match(/^(\d+(\.\d+)?)\s*(B|KB|MB|GB|TB|PB|EB|ZB|YB)$/i);

    if (!match) {
        console.error("Invalid input format. Please use a valid format like '15 GB', '1 TB', '100 MB', '200 KB', etc.");
        return null;
    }

    const value = parseFloat(match[1]); // Numeric value
    const unit = match[3].toUpperCase(); // Unit (B, KB, MB, GB, TB, etc.)

    // Conversion factors based on 1024
    switch (unit) {
        case 'B':
            return value; // Bytes
        case 'KB':
            return value * 1024; // KB to bytes
        case 'MB':
            return value * 1024 * 1024; // MB to bytes
        case 'GB':
            return value * 1024 * 1024 * 1024; // GB to bytes
        case 'TB':
            return value * 1024 * 1024 * 1024 * 1024; // TB to bytes
        case 'PB':
            return value * 1024 * 1024 * 1024 * 1024 * 1024; // PB to bytes
        case 'EB':
            return value * 1024 * 1024 * 1024 * 1024 * 1024 * 1024; // EB to bytes
        case 'ZB':
            return value * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024; // ZB to bytes
        case 'YB':
            return value * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024; // YB to bytes
        default:
            return null;
    }
};

export function convertBigIntToString(obj: any): any {
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToString);
    }
    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = convertBigIntToString(obj[key]);
        }
        return newObj;
    }
    return obj;
}