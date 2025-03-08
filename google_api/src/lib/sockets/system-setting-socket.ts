import { WebSocket } from "ws";
import { BaseWebSocketService } from "./sockets-manager";
import { IncomingMessage } from "http";
import { TokenManager } from "../jwt-token-manager";
import { redisClient } from "@/redis.config";

interface AuthMessage {
    type: string;
    token: {
        token: string;
    };
}

interface SystemSettingMessage {
    type: "system_setting";
    action: "update" | "fetch";
    // For the "update" action, payload contains the fields to update.
    payload?: {
        maintenance_mode?: boolean; // or 0/1 
        storage_limit?: number;     // in GB
        max_file_size?: number;     // in MB
    };
}

export class SystemSetting extends BaseWebSocketService {
    private token: string | null = null;

    protected async onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage) {
        try {
            const data = JSON.parse(message.toString());

            // Handle authentication message.
            if (data.type === "auth") {
                const authData = data as AuthMessage;
                this.token = authData?.token?.token;
                const token_data = TokenManager.decodeToken<{ userId: string }>(this.token);

                // Store the token in Redis with a TTL of 24 hours (86400 seconds).
                const key = `user:token:${token_data?.userId}`;
                const existingToken = await redisClient.get(key);
                if (!existingToken) {
                    await redisClient.set(key, this.token, "EX", 86400);
                }
                ws.send(JSON.stringify({ type: "auth", status: "success" }));
                return;
            }

            // Ensure the client is authenticated.
            if (!this.token) {
                throw new Error("Not authenticated");
            }

            // Decode token to get userId and check against the token stored in Redis.
            const token_data = TokenManager.decodeToken<{ userId: string }>(this.token!);
            const storedToken = await redisClient.get(`user:token:${token_data?.userId}`);
            if (!storedToken) {
                throw new Error("Authentication token not found or expired");
            }

            // Handle system settings messages.
            if (data.type === "system_setting") {
                const systemData = data as SystemSettingMessage;

                if (systemData.action === "update") {
                    if (!systemData.payload) {
                        throw new Error("Missing payload for update action");
                    }

                    const { maintenance_mode, storage_limit, max_file_size } = systemData.payload;

                    // Update maintenance_mode if provided
                    if (typeof maintenance_mode !== "undefined") {
                        // Convert boolean to string. Could also store "0"/"1" if preferred.
                        await redisClient.set("maintenance_mode", maintenance_mode.toString());
                    }

                    // Update storage_limit if provided
                    if (typeof storage_limit !== "undefined") {
                        await redisClient.set("storage_limit", storage_limit.toString());
                    }

                    // Update max_file_size if provided
                    if (typeof max_file_size !== "undefined") {
                        await redisClient.set("max_file_size", max_file_size.toString());
                    }

                    ws.send(JSON.stringify({ type: "system_setting", status: "update_success" }));
                    return;
                }

                if (systemData.action === "fetch") {
                    // Fetch all three fields from Redis
                    const maintenanceMode = await redisClient.get("maintenance_mode");
                    const storageLimit = await redisClient.get("storage_limit");
                    const maxFileSize = await redisClient.get("max_file_size");

                    // Convert or default each value
                    const parsedMaintenanceMode = maintenanceMode === "true"; // or parse "1" if you stored it as "1"/"0"
                    const parsedStorageLimit = storageLimit ? parseInt(storageLimit, 10) : 5;  // default to 5 (GB)
                    const parsedMaxFileSize = maxFileSize ? parseInt(maxFileSize, 10) : 100;   // default to 100 (MB)

                    // Send them back to the client
                    ws.send(
                        JSON.stringify({
                            type: "system_setting",
                            status: "fetch_success",
                            data: {
                                maintenance_mode: parsedMaintenanceMode,
                                storage_limit: parsedStorageLimit,
                                max_file_size: parsedMaxFileSize,
                            },
                        })
                    );
                    return;
                }

                // Unknown action
                ws.send(JSON.stringify({ type: "error", message: "Unknown system_setting action" }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: (error as Error).message }));
        }
    }
}
