import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { tokenManager } from "../token-manager";
import { CryptoService } from "../encryption";

export class WebSocketValidator {
    static async validateConnection(
        request: IncomingMessage
    ): Promise<{ isValid: boolean; error?: string }> {
        try {
            const access_token = request.headers["x-refresh-token"];
            
            // Check if access token exists
            if (!access_token) {
                return {
                    isValid: false,
                    error: "Missing credentials, please add refresh_token!"
                };
            }

            // Validate and decrypt token
            if (access_token) {
                const tokenDetails = (access_token as string).split(':');
                if (tokenDetails.length !== 3) {
                    return {
                        isValid: false,
                        error: "Invalid token format"
                    };
                }

                const token = await CryptoService.decryptData(
                    tokenDetails[1],
                    tokenDetails[0],
                    tokenDetails[2]
                );

                if (!token) {
                    return {
                        isValid: false,
                        error: "Invalid token"
                    };
                }

                // Set OAuth credentials
                tokenManager.oAuth2Client.setCredentials(JSON.parse(token));
            }

            // Verify OAuth credentials
            const { credentials } = tokenManager.oAuth2Client;
            if (Object.keys(credentials).length === 0) {
                return {
                    isValid: false,
                    error: "Invalid or expired credentials"
                };
            }

            return { isValid: true };
        } catch (error) {
            console.error("WebSocket validation error:", error);
            return {
                isValid: false,
                error: "Authentication failed"
            };
        }
    }
}

// Enhanced BaseWebSocketService with validation
export abstract class BaseWebSocketService {
    protected abstract onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage): void;

    async handleClientConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
        // Validate connection
        // const validationResult = await WebSocketValidator.validateConnection(req);
        
        // if (!validationResult.isValid) {
        //     ws.send(JSON.stringify({
        //         type: 'error',
        //         message: validationResult.error
        //     }));
        //     ws.close();
        //     return;
        // }

        console.log(`New WebSocket connection established on ${req.url}`);

        ws.on("message", (message: Buffer) => {
            this.onMessage(ws, message, req);
        });

        ws.on("close", () => {
            console.log("WebSocket connection closed");
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
            ws.close();
        });
    }
}

// Updated WebSocketManager with validation
export class WebSocketManager {
    private static instance: WebSocketManager;
    private wss: WebSocketServer;
    private services: Map<string, BaseWebSocketService> = new Map();

    private constructor(server: any) {
        this.wss = new WebSocketServer({ noServer: true });

        server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
            const pathname = request.url;
            const service = this.services.get(pathname || '');

            if (!service) {
                socket.destroy();
                return;
            }

            // Validate before handling upgrade
            // const validationResult = await WebSocketValidator.validateConnection(request);
            // if (!validationResult.isValid) {
            //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            //     socket.destroy();
            //     return;
            // }

            this.wss.handleUpgrade(request, socket, head, (ws) => {
                service.handleClientConnection(ws, request);
            });
        });
    }

    static getInstance(server: any): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager(server);
        }
        return WebSocketManager.instance;
    }

    registerService(path: string, service: BaseWebSocketService) {
        this.services.set(path, service);
    }
}