import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { BaseWebSocketService } from "./sockets-manager";
import { prisma } from "@/prisma.config";
import { TokenManager } from "../jwt-token-manager"
import { redisClient } from "@/redis.config";


interface AuthMessage {
    type: 'auth';
    token: {
        token: string
    };
}

interface AnalyticsMessage {
    type: 'analytics';
    action: 'update' | 'fetch';
    // For the "update" action, payload contains the fields to update.
    payload?: Record<string, any>;
}

/**
 * UserAnalyticsService handles WebSocket connections for updating and fetching
 * user analytics, storing tokens in Redis.
 */
export class UserAnalyticsService extends BaseWebSocketService {
    private token: string | null = null;

    protected async onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage) {
        try {
            const data = JSON.parse(message.toString());

            // Handle authentication message.
            if (data.type === 'auth') {
                const authData = data as AuthMessage;
                this.token = authData?.token?.token;
                const token_data = TokenManager.decodeToken<{ userId: string }>(this.token);
                // Store the token in Redis with a TTL of 24 hours.
                const key = `user:token:${token_data?.userId}`;
                await redisClient.set(key, this.token, "EX", 86400);
                ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
                return;
            }
            

            // Ensure the client is authenticated.
            if (!this.token) {
                throw new Error('Not authenticated');
            }

            // Decode token to get userId and check against the token stored in Redis.
            const token_data = TokenManager.decodeToken<{ userId: string }>(this.token!);
            const storedToken = await redisClient.get(`user:token:${token_data?.userId}`);
            // console.log(JSON.stringify(storedToken), this.token,token_data)
            if (!storedToken) {
                throw new Error('Authentication token not found or expired');
            }

            // Handle analytics messages.
            if (data.type === 'analytics') {
                const analyticsData = data as AnalyticsMessage;

                // Process update actions.
                if (analyticsData.action === 'update') {
                    if (!analyticsData.payload) {
                        throw new Error('Missing payload for update action');
                    }
                    upsertUserAnalytics(token_data?.userId!, analyticsData.payload)
                        .then((updatedRecord) => {
                            ws.send(JSON.stringify({
                                type: 'analytics',
                                status: 'updated',
                                analytics: updatedRecord
                            }));
                        })
                        .catch((error: Error) => {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: error.message
                            }));
                        });
                    return;
                }

                // Process fetch actions.
                if (analyticsData.action === 'fetch') {
                    const analyticsRecord = await fetchUserAnalytics(token_data?.userId!);
                    ws.send(jsonStringifyWithBigInt({
                        type: 'analytics',
                        status: 'fetched',
                        analytics: analyticsRecord
                    }));
                    return;
                }

                // Unknown action.
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown analytics action' }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: (error as Error).message }));
        }
    }
}

const fetchUserAnalytics = async (userId: string) => {
    return await prisma.userAnalytics.findUnique({
        where: { userId },
        include: {
            contentInteractions: true,
            recentActivities: true,
            requestStatuses: true,
            userDeviceInfos: true,
            user: true,
            userFeedbacks: true
        }
    });
};

const upsertUserAnalytics = async (userId: string, payload: Record<string, any>) => {
    // Convert each numeric value in the payload to BigInt
    const convertedPayload: Record<string, any> = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => {
            if (typeof value === 'number') {
                return [key, BigInt(value)];
            }
            return [key, value];
        })
    );

    return await prisma.userAnalytics.upsert({
        where: { userId },
        update: convertedPayload,
        create: {
            userId,
            ...convertedPayload
        },
        include: {
            contentInteractions: true,
            recentActivities: true,
            requestStatuses: true,
            userDeviceInfos: true,
            user: true,
            userFeedbacks: true
        }
    });
};

const jsonStringifyWithBigInt = (obj: any) => {
    return JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
};

