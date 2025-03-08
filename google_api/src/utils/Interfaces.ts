export interface SchemaField {
    type: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor | DateConstructor; // Use constructors
    required?: boolean; // If the field is required
    unique?: boolean; // If the field must be unique
    min?: number; // Minimum value (for numbers)
    max?: number; // Maximum value (for numbers)
    minLength?: number; // Minimum length (for strings/arrays)
    maxLength?: number; // Maximum length (for strings/arrays)
    itemType?: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor; // Type of items (for arrays)
    properties?: Record<string, SchemaField>; // Fields for nested objects
    default?: any; // Default value
}
type SchemaDefinition = {
    [key: string]: SchemaField;
};
export type GenerateInterfaceFromSchema<T extends SchemaDefinition> = {
    [K in keyof T]: T[K]['type'] extends StringConstructor
    ? T[K]['required'] extends true
    ? string
    : string | undefined
    : T[K]['type'] extends NumberConstructor
    ? T[K]['required'] extends true
    ? number
    : number | undefined
    : T[K]['type'] extends BooleanConstructor
    ? T[K]['required'] extends true
    ? boolean
    : boolean | undefined
    : T[K]['type'] extends ArrayConstructor
    ? T[K]['itemType'] extends ObjectConstructor
    ? T[K]['properties'] extends Record<string, any>
    ? GenerateInterfaceFromSchema<T[K]['properties']>[]
    : object[]
    : any[] // Fallback for other array types
    : T[K]['type'] extends ObjectConstructor
    ? T[K]['properties'] extends Record<string, any>
    ? GenerateInterfaceFromSchema<T[K]['properties']>
    : object
    : T[K]['type'] extends DateConstructor
    ? T[K]['required'] extends true
    ? Date
    : Date | undefined
    : unknown;
};

export interface ListFiles {
    query?: {
        filter?: string;        // Alternative for params
        fileType?: 'files' | 'folder';     // Alternative for type
    }
}
export interface Data {
    // file?: FormFile ;
    [key: string]: string | string[] | boolean | object | File | Data;
}

export type DrivePermissionRole = 'reader' | 'commenter' | 'writer' | 'fileOrganizer' | 'organizer' | 'owner';

export interface GoogleDriveFile {
    id: string; // Unique identifier for the file
    name: string; // Name of the file
    mimeType: string; // MIME type of the file
    thumbnailLink?: string; // Link to a thumbnail image of the file
    webViewLink?: string; // Link to view the file in a web browser
    parents?: string[]; // List of parent folder IDs
    createdTime?: string; // Date and time the file was created
    modifiedTime?: string; // Date and time the file was last modified
    size?: number; // Size of the file in bytes
    iconLink?: string; // Link to an icon representing the file type
    shared?: boolean; // Whether the file is shared
    sharedWithMeTime?: string; // Date and time the file was shared with the user
    owners?: { // Information about the file's owners
        kind: string; // Type of resource
        id: string; // Owner's ID
        displayName: string; // Owner's display name
        emailAddress: string; // Owner's email address
    }[];
    webContentLink?: string; // Link to download the file
    trashed?: boolean; // Whether the file is in the trash
    version?: string; // The version of the file
    // Add more fields as needed based on your requirements
}

export interface GoogleDriveResponse {
    files: GoogleDriveFile[];
}

export interface FileResource {
    name: string;
    mimeType: string;
    parents?: string[]; // Optional parent folder IDs
}

export interface SchemaField {
    type: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor | DateConstructor; // Use constructors
    required?: boolean; // If the field is required
    unique?: boolean; // If the field must be unique
    min?: number; // Minimum value (for numbers)
    max?: number; // Maximum value (for numbers)
    minLength?: number; // Minimum length (for strings/arrays)
    maxLength?: number; // Maximum length (for strings/arrays)
    itemType?: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor; // Type of items (for arrays)
    properties?: Record<string, SchemaField>; // Fields for nested objects
    default?: any; // Default value
}

export interface Token {
    message?: string;
    error?: string
    tokens: {
        name: string;
        token: string
    }[]
}

export interface userAlloctedSpace {
    usage: string;
    limit: string;
    drives: {
        driveId: string;
        allocatedSpace: string;
        usage: string
    }[]
}

export interface EncryptedData {
    serviceId: string; // Service ID as a string
    encrypted: string;    // Encrypted data as a string
    iv: string;         // Initialization vector as a string
    authTag: string;    // Authentication tag as a string
    createdTime?: string
}

export interface ApiKey {
    id: string
    key: string;
    name: string;
    user: string;
    drive?: object[]
    created_at: string;
    modify_at: string;
    allocatedSpace: string;
    createdTime: string
}

export interface Session {
    expires: string;
    user: User
}

export interface User {
    email: string;
    id: string;
    name: string;
    image: string;
    username: string;
    role: string;
    key: string[]
}

export interface ErrorBtn {
    label: string;
    link: string;
    method: string;
    body: {
        type: string;
        user_id: string;
    };
}
