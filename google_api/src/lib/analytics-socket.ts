import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { print } from '@/utils/color-print';
import { prisma } from '@/prisma.config';

// Extend the standard WebSocket to include an optional userId property
interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
}

// Interface for analytics update messages
interface AnalyticsUpdateMessage {
    type: 'analytics_update';
    data: {
        totalStorageUsed: bigint;
        totalApiUsage: bigint;
        totalFilesUploaded: bigint;
        totalDrivesUsed: bigint;
        totalRequestsMade: bigint;
        totalFilesShared: bigint;
        totalApiKeysUsed: bigint;
        storageQuotaRemaining: bigint;
        userPlanType: string;
        isActive: boolean;
    };
}

// Interface for error messages sent over WebSocket
interface ErrorMessage {
    type: 'error';
    message: string;
}

// Union type for messages that can be sent over this connection
type WebSocketMessage = AnalyticsUpdateMessage | ErrorMessage;

export function setupAnalyticsWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/analytics' });

    wss.on('connection', (ws: AuthenticatedWebSocket) => {
        print('New Analytics WebSocket connection established', 'green');

        ws.on('message', async (message: Buffer) => {
            try {
                // Parse the incoming message
                const data = JSON.parse(message.toString());
                console.log('Received message payload:', data);

                // Handle authentication messages
                if (data.type === 'auth') {
                    // Validate the authentication message payload
                    if (!data.userId) {
                        throw new Error('UserId is required for authentication');
                    }

                    // Store the userId on the WebSocket instance
                    ws.userId = data.userId;
                    console.log('User authenticated:', ws.userId);

                    // Send authentication success back to the client
                    // ws.send(JSON.stringify({ type: 'auth', status: 'success' }));

                    // Fetch initial analytics for the authenticated user
                    const analytics = await prisma.userAnalytics.findUnique({
                        where: { userId: ws.userId }
                    });
                    console.log('Initial analytics fetch:', analytics ? 'successful' : 'not found');

                    if (analytics) {
                        const updateMessage: AnalyticsUpdateMessage = {
                            type: 'analytics_update',
                            data: {
                                totalStorageUsed: analytics.totalStorageUsed,
                                totalApiUsage: analytics.totalApiUsage,
                                totalFilesUploaded: analytics.totalFilesUploaded,
                                totalDrivesUsed: analytics.totalDrivesUsed,
                                totalRequestsMade: analytics.totalRequestsMade,
                                totalFilesShared: analytics.totalFilesShared,
                                totalApiKeysUsed: analytics.totalApiKeysUsed,
                                storageQuotaRemaining: analytics.storageQuotaRemaining,
                                userPlanType: analytics.userPlanType,
                                isActive: analytics.isActive,
                            }
                        };
                        ws.send(JSON.stringify(updateMessage));
                    } else {
                        throw new Error('No analytics found for user');
                    }
                    return;
                }

                // For any message other than 'auth', ensure the connection is authenticated
                if (!ws.userId) {
                    throw new Error('Not authenticated');
                }

                // Handle analytics update requests
                if (data.type === 'request_update') {
                    const analytics = await prisma.userAnalytics.findUnique({
                        where: { userId: ws.userId }
                    });

                    if (analytics) {
                        const updateMessage: AnalyticsUpdateMessage = {
                            type: 'analytics_update',
                            data: {
                                totalStorageUsed: analytics.totalStorageUsed,
                                totalApiUsage: analytics.totalApiUsage,
                                totalFilesUploaded: analytics.totalFilesUploaded,
                                totalDrivesUsed: analytics.totalDrivesUsed,
                                totalRequestsMade: analytics.totalRequestsMade,
                                totalFilesShared: analytics.totalFilesShared,
                                totalApiKeysUsed: analytics.totalApiKeysUsed,
                                storageQuotaRemaining: analytics.storageQuotaRemaining,
                                userPlanType: analytics.userPlanType,
                                isActive: analytics.isActive,
                            }
                        };
                        ws.send(JSON.stringify(updateMessage));
                    } else {
                        throw new Error('No analytics found for user');
                    }
                }
            } catch (error) {
                console.error('WebSocket error:', error);
                const errorMessage: ErrorMessage = {
                    type: 'error',
                    message: (error as Error).message
                };
                ws.send(JSON.stringify(errorMessage));
            }
        });

        ws.on('close', () => {
            print('Analytics WebSocket connection closed', 'yellow');
        });
    });

    return wss;
}
