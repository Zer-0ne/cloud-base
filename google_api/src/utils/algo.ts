import crypto from 'crypto'
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

    const value = parseFloat(match[1]); // Convert input value (may have decimals)
    const unit = match[3].toUpperCase(); // Extract unit (B, KB, MB, GB, etc.)

    // Conversion factors based on 1024, ensuring result is an integer
    const conversionMap: Record<string, number> = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 ** 2,
        'GB': 1024 ** 3,
        'TB': 1024 ** 4,
        'PB': 1024 ** 5,
        'EB': 1024 ** 6,
        'ZB': 1024 ** 7,
        'YB': 1024 ** 8,
    };

    return Math.floor(value * conversionMap[unit]); // Ensure integer output
};




// Mapping: har digit (0-9) ke liye ek character assign kar rahe hain.
const digitToCharMap: Record<string, string> = {
    "0": "A",
    "1": "B",
    "2": "C",
    "3": "D",
    "4": "E",
    "5": "F",
    "6": "G",
    "7": "H",
    "8": "I",
    "9": "J"
};

export function generateCustomId(data?: string, salt: boolean = true): string {
    // Get the current timestamp as a string.
    const timestampStr = data ?? Date.now().toString();

    // Map each digit to a corresponding letter.
    let customId = "";
    for (const char of timestampStr) {
        customId += digitToCharMap[char] || '';
    }

    // Generate a random string using crypto.randomBytes, filter out any non-letters.
    const randomString = salt ? crypto
        .randomBytes(10)
        .toString('base64url')
        .replace(/[^a-zA-Z]/g, '') : '';

    // Combine the customId and the randomString, and return as lower-case.
    return `${customId}${randomString}`.toLowerCase();
}
