import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { BaseWebSocketService } from "./sockets-manager";
import { ApiManager } from "@/lib/api-key-manager";
import { TokenManager } from "@/lib/jwt-token-manager";
import { tokenManager } from "@/lib/token-manager";
import { CryptoService } from "@/lib/encryption";

// Message Interfaces
interface AuthMessage {
    type: 'auth';
    token: {
        token: string;
    };
}

interface ApiCreateMessage {
    type: 'api';
    action: 'create';
    payload: {
        name: string;
    };
}

interface ApiListMessage {
    type: 'api';
    action: 'list';
}

interface ApiDeleteMessage {
    type: 'api';
    action: 'delete';
    payload: {
        token: string;
    };
}

type ApiMessage = ApiCreateMessage | ApiListMessage | ApiDeleteMessage;

export class UserApiService extends BaseWebSocketService {
    private token: string | null = null;
    private currentUser: any = null; // Replace with your actual user type

    /**
     * Override handleClientConnection to perform header-based validation on connection.
     */
    async handleClientConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
        // Validate the request headers similar to your Express middleware.
        const valid = await this.validateRequestHeaders(req, ws);
        if (!valid) {
            return;
        }

        console.log(`New WebSocket connection established on ${req.url}`);

        ws.on("message", (message: Buffer) => {
            this.onMessage(ws, message, req);
        });

        ws.on("close", () => {
            console.log("WebSocket connection closed");
        });
    }

    /**
     * Validates the incoming request headers.
     * If the "x-refresh-token" header is missing or invalid, sends an error and closes the connection.
     */
    private async validateRequestHeaders(req: IncomingMessage, ws: WebSocket): Promise<boolean> {
        try {
            const accessToken = req.headers["x-refresh-token"];
            if (!accessToken) {
                ws.send(JSON.stringify({ type: 'error', message: "Missing credentials, please add refresh_token!" }));
                ws.close();
                return false;
            }

            // The token is expected in the format: part1:part2:part3
            const tokenDetails = (accessToken as string).split(':');
            const decryptedToken = await CryptoService.decryptData(tokenDetails[1], tokenDetails[0], tokenDetails[2]);

            // Set the decrypted token as credentials on your OAuth2 client.
            tokenManager.oAuth2Client.setCredentials(JSON.parse(decryptedToken!));

            const { credentials } = tokenManager.oAuth2Client;
            if (Object.keys(credentials).length === 0) {
                ws.send(JSON.stringify({ type: 'error', message: "Invalid credentials" }));
                ws.close();
                return false;
            }
            return true;
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: "Error during request validation" }));
            ws.close();
            return false;
        }
    }

    /**
     * Processes incoming messages. First, it expects an "auth" message to load the user's profile.
     * After authentication, clients may perform API actions such as create, list, or delete.
     */
    protected async onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage) {
        try {
            const data = JSON.parse(message.toString());

            // Handle the authentication message.
            if (data.type === 'auth') {
                const authData = data as AuthMessage;
                this.token = authData.token.token;
                const currentUser = await tokenManager.getUserProfile();
                if (!currentUser) {
                    ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Please login' }));
                    return;
                }
                this.currentUser = currentUser;
                ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
                return;
            }

            // Require that the user has been authenticated.
            if (!this.currentUser) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
                return;
            }

            // Process API actions.
            if (data.type === 'api') {
                const apiMessage = data as ApiMessage;
                switch (apiMessage.action) {
                    case 'create': {
                        // Check if the user is allowed to create APIs.
                        if (!this.currentUser.hasApiAccess) {
                            ws.send(JSON.stringify({
                                type: 'api',
                                status: 'error',
                                error: "You do not have access to create API",
                                button: {
                                    label: "API Creation Request for Admin",
                                    link: "/api/admin/api-creation-request",
                                    method: "POST",
                                    body: {
                                        type: "has_api_access",
                                        user_id: this.currentUser.username,
                                    },
                                },
                            }));
                            return;
                        }
                        if (this.currentUser.apiKeys.length > 1 && !this.currentUser.canMakeMultipleApis) {
                            ws.send(JSON.stringify({
                                type: 'api',
                                status: 'error',
                                error: "You do not have permission to create multiple APIs",
                                button: {
                                    label: "Request Permission to Create API",
                                    link: "/api/user/api-key/api-creation-request",
                                    method: "POST",
                                    body: {
                                        type: "can_make_multiple_apis",
                                        user_id: this.currentUser.username,
                                    },
                                },
                            }));
                            return;
                        }
                        const payload = apiMessage.payload;
                        if (!payload || !payload.name) {
                            ws.send(JSON.stringify({ type: 'api', status: 'error', message: 'API name is required' }));
                            return;
                        }
                        const apiManager = new ApiManager(this.currentUser.username, payload.name);
                        const newToken = await apiManager.generateKey();
                        ws.send(JSON.stringify({
                            type: 'api',
                            status: 'success',
                            message: "Token Created Successfully",
                            data: { token: newToken }
                        }));
                        break;
                    }
                    case 'list': {
                        // Check if the user has any API keys.
                        if (!this.currentUser.apiKeys || this.currentUser.apiKeys.length === 0) {
                            ws.send(JSON.stringify({
                                type: 'api',
                                status: 'redirect',
                                location: "/api/user/api-creation",
                                message: "No API keys found. Please create one."
                            }));
                            return;
                        }
                        const tokens = [];
                        for (const key of this.currentUser.apiKeys) {
                            const token = await TokenManager.createToken({
                                accessKey: key.accessKey,
                                name: key.name!,
                                userId: this.currentUser.username,
                            });
                            tokens.push({
                                name: key.name,
                                token: token
                            });
                        }
                        ws.send(JSON.stringify({ type: 'api', status: 'success', data: tokens }));
                        break;
                    }
                    case 'delete': {
                        const payload = apiMessage.payload;
                        if (!payload || !payload.token) {
                            ws.send(JSON.stringify({
                                type: 'api',
                                status: 'error',
                                message: 'Token is required!'
                            }));
                            return;
                        }
                        // Verify the token to extract the accessKey.
                        const verified = await TokenManager.verifyToken(payload.token);
                        const accessKey = verified.accessKey;
                        if (!accessKey) {
                            ws.send(JSON.stringify({
                                type: 'api',
                                status: 'error',
                                message: 'Invalid token'
                            }));
                            return;
                        }
                        const apiManager = new ApiManager(this.currentUser.username);
                        await apiManager.delete(accessKey);
                        ws.send(JSON.stringify({
                            type: 'api',
                            status: 'success',
                            message: 'Access key deleted successfully'
                        }));
                        break;
                    }
                    default:
                        ws.send(JSON.stringify({ type: 'api', status: 'error', message: 'Unknown API action' }));
                }
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: (error as Error).message }));
        }
    }
}
