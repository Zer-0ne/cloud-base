import { Schema } from "@/lib/schema";
import { convertToBytes } from "@/utils/constant";
import crypto from "crypto";
import { GenerateInterfaceFromSchema } from "@/utils/Interfaces";

// User Schema
const userSchema = {
    _id: { type: String, unique: true, default: 'uuid_generate_v4()' },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: "user" },
    image: { type: String },
    keys: { type: Array, default: [] },
    hasApiAccess: { type: Boolean, default: false },
    canMakeMultipleApis: { type: Boolean, default: false },
    createdTime: { type: String },
    name: { type: String },
};
export const User = new Schema<GenerateInterfaceFromSchema<typeof userSchema>>(userSchema, {
    name: "users",

});

// Key Schema
const keySchema = {
    serviceId: { type: String, unique: true, required: true },
    encrypted: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
};
export const key = new Schema<GenerateInterfaceFromSchema<typeof keySchema>>(keySchema, {
    name: "keys",
});

// Post Schema
const postSchema = {
    _id: { type: String, unique: true },
    driveId: { type: String },
    size: { type: Number },
    user: { type: String },
    name: { type: String },
    accessKey: { type: String },
    parents: { type: Array, itemType: String },
    thumbnailLink: { type: String },
    webViewLink: { type: String },
    webContentLink: { type: String },
    folderColorRgb: { type: String },
    videoMediaMetadata: { type: Object },
    imageMediaMetadata: { type: Object },
    viewedByMeTime: { type: String },
    sharedWithMeTime: { type: String },
    modifiedTime: { type: String },
    description: { type: String },
    fullFileExtension: { type: String },
};
export const Post = (userId: string) =>
    new Schema<GenerateInterfaceFromSchema<typeof postSchema>>(postSchema, {
        name: "posts",
    });

// API Key Schema
const apiKeySchema = {
    key: { type: String, unique: true },
    accessKey: { type: String },
    user: { type: String, required: true },
    name: { type: String },
    drive: {
        type: Array,
        itemType: Object,
        properties: {
            driveId: { type: String },
            allocatedSpace: { type: Number, default: 0 },
            usage: { type: Number, default: 0 },
        },
    },
    _id: { type: String, unique: true, default: 'uuid_generate_v4()' },
    totalUsage: { type: Number, default: 0 },
    // allocatedSpace: { type: Number, required: true, default: convertToBytes(localStorage.getItem('defaultQuota') ?? localStorage.setItem('defaultQuota', '5 GB')!) },
};
export const apiKey = new Schema<GenerateInterfaceFromSchema<typeof apiKeySchema>>(apiKeySchema, {
    name: "api_keys",

});

const requestSchema = {
    _id: { type: String, unique: true, default: 'uuid_generate_v4()' },
    user_id: { type: String, required: true }, // Request karne wale user ka ID
    type: { type: String, required: true }, // e.g., "increase_space", "grant_api_access"
    status: { type: String, default: "pending" }, // pending, approved, rejected
    details: { type: Object, default: JSON.stringify({}) }, // Additional details for the request
    granted_by: { type: String },
    createdAt: { type: String, default: 'CURRENT_TIMESTAMP' },
    // updatedAt: { type: Date },
};
export const Requests = new Schema<GenerateInterfaceFromSchema<typeof requestSchema>>(requestSchema, {
    name: "requests",
})
// Drives Schema
const drivesSchema = {
    serviceId: { type: String, unique: true, required: true },
    limit: { type: Number },
    usage: { type: Number },
    usageInDriveTrash: { type: Number },
    usageInDrive: { type: Number },
    alloted: { type: Boolean, default: false },
    _id: { type: String, unique: true, default: 'uuid_generate_v4()' },
    keys: {
        type: Array,
        default: [],
        itemType: Object,
        properties: {
            userId: { type: String },
            accessKey: { type: String },
            name: { type: String },
        },
    },
};
export const Drives = new Schema<GenerateInterfaceFromSchema<typeof drivesSchema>>(drivesSchema, {
    name: "drives",
});

// Example schema with proper TypeScript types
const userAnalyticsSchema = {
    user_id: { type: String, required: true, unique: true }, // User's unique ID
    last_login_time: { type: String }, // Time of last login
    total_storage_used: { type: Number, default: 0 }, // Total storage used by the user in bytes
    total_api_usage: { type: Number, default: 0 }, // Total API usage by the user
    total_files_uploaded: { type: Number, default: 0 }, // Total files uploaded by the user
    total_drives_used: { type: Number, default: 0 }, // Total number of drives used by the user
    recent_activity: {
        type: Array,
        itemType: Object,
        properties: {
            activity_type: { type: String }, // e.g., "upload", "download", "api-call"
            timestamp: { type: String },
            file_id: { type: String, },
            drive_id: { type: String },
            status: { type: String }, // e.g., "success", "failed"
            ip_address: { type: String }, // IP address from which the activity was performed
        },
    },
    last_activity_time: { type: String }, // Time of the last activity
    total_requests_made: { type: Number, default: 0 }, // Number of requests made by the user
    // keys: { type: Array, default: [] },

    requests_status: {
        type: Array,
        itemType: Object,
        properties: {
            request_id: { type: String },
            status: { type: String }, // "pending", "approved", "rejected"
            type: { type: String }, // e.g., "increase_space", "grant_api_access"
            created_at: { type: String },
            updated_at: { type: String },
            request_details: { type: Object }, // Additional details regarding the request
        },
    },
    total_files_shared: { type: Number, default: 0 }, // Number of files shared by the user
    total_drive_access_requests: { type: Number, default: 0 }, // Number of access requests to drives
    total_files_deleted: { type: Number, default: 0 }, // Total files deleted by the user
    total_api_keys_used: { type: Number, default: 0 }, // Total API keys used by the user
    storage_quota_limit: { type: Number, default: 0 }, // User’s storage quota limit
    storage_quota_remaining: { type: Number, default: 0 }, // Remaining storage quota for the user
    created_at: { type: String, default: 'CURRENT_TIMESTAMP' }, // Date when the user analytics record was created
    updated_at: { type: String }, // Date when the user analytics record was last updated
    user_type: { type: String, default: "regular" }, // Type of the user (e.g., "regular", "premium")
    is_active: { type: Boolean, default: true }, // Whether the user is active
    last_password_change_time: { type: String }, // Time when the password was last changed
    two_factor_enabled: { type: Boolean, default: false }, // Whether the user has enabled two-factor authentication
    total_login_attempts: { type: Number, default: 0 }, // Number of login attempts by the user
    failed_login_attempts: { type: Number, default: 0 }, // Number of failed login attempts
    last_failed_login_time: { type: String }, // Time of last failed login attempt
    average_session_duration: { type: Number, default: 0 }, // Average session duration
    total_time_spent_online: { type: Number, default: 0 }, // Total time spent online (in seconds)
    total_messages_sent: { type: Number, default: 0 }, // Number of messages sent by the user
    total_notifications_received: { type: Number, default: 0 }, // Number of notifications received
    total_notifications_read: { type: Number, default: 0 }, // Number of notifications read
    user_device_info: {
        type: Array,
        itemType: Object,
        properties: {
            device_type: { type: String }, // Device type (e.g., mobile, desktop)
            os: { type: String }, // Operating system
            browser: { type: String }, // Browser used
            device_id: { type: String }, // Device identifier
        },
    },
    user_region: { type: String }, // Region where the user primarily accesses the system
    profile_completeness: { type: Number, default: 0 }, // Profile completeness (percentage or score)
    last_profile_update_time: { type: String }, // Last time the profile was updated
    total_files_edited: { type: Number, default: 0 }, // Number of files edited by the user
    total_file_shares_received: { type: Number, default: 0 }, // Number of files shared with the user
    user_plan_type: { type: String, default: "basic" }, // Type of user plan
    total_api_requests_made: { type: Number, default: 0 }, // Total number of API requests made by the user
    data_exported: { type: Boolean, default: false }, // Whether the user has exported data
    data_imported: { type: Boolean, default: false }, // Whether the user has imported data
    total_shared_folders: { type: Number, default: 0 }, // Number of shared folders
    total_folder_created: { type: Number, default: 0 }, // Number of folders created
    content_interactions: {
        type: Array,
        itemType: Object,
        properties: {
            content_type: { type: String }, // Type of content (e.g., file, post)
            interaction_type: { type: String }, // Type of interaction (e.g., "like", "comment")
            timestamp: { type: String }, // Timestamp of the interaction
        },
    },
    user_feedback: {
        type: Array,
        itemType: Object,
        properties: {
            feedback_type: { type: String }, // Type of feedback (e.g., "bug report", "feature request")
            message: { type: String }, // Feedback message
            rating: { type: Number }, // Rating (if applicable)
            timestamp: { type: String }, // Time the feedback was provided
        },
    },
}


export const UserAnalytics = new Schema<GenerateInterfaceFromSchema<typeof userAnalyticsSchema>>(userAnalyticsSchema, {
    name: "user_analytics"
});