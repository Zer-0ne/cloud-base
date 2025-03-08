export type WSMessage = {
    type: string;      // e.g. "auth", "system_setting", "error"
    action?: string;   // e.g. "update", "fetch" (used when sending a request)
    payload?: any;     // any payload you want to send (e.g. token, settings, etc.)
    status?: string;   // e.g. "success", "fetch_success", "update_success" (from server)
    data?: any;        // any data returned by the server (e.g. settings)
    message?: string;  // error or informational messages
};


/**
 * A simple WebSocket client wrapper.
 */
export class WSClient {
    private ws: WebSocket;
    private messageListeners: Array<(msg: WSMessage) => void> = [];
    private errorListeners: Array<(e: Event) => void> = [];
    private closeListeners: Array<(e: CloseEvent) => void> = [];

    constructor(url: string, protocols?: string | string[]) {
        this.ws = new WebSocket(url, protocols);
        this.initialize();
    }

    private initialize() {
        this.ws.onopen = (event: Event) => {
            console.log("WebSocket connected.");
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const msg: WSMessage = JSON.parse(event.data);
                this.messageListeners.forEach((callback) => callback(msg));
            } catch (err) {
                console.error("Failed to parse WS message", err);
            }
        };

        this.ws.onerror = (event: Event) => {
            this.errorListeners.forEach((callback) => callback(event));
        };

        this.ws.onclose = (event: CloseEvent) => {
            this.closeListeners.forEach((callback) => callback(event));
        };
    }

    /**
     * Registers a callback to be invoked when a message is received.
     */
    public onMessage(callback: (msg: WSMessage) => void) {
        this.messageListeners.push(callback);
    }

    /**
     * Registers a callback for WS errors.
     */
    public onError(callback: (e: Event) => void) {
        this.errorListeners.push(callback);
    }

    /**
     * Registers a callback for WS close event.
     */
    public onClose(callback: (e: CloseEvent) => void) {
        this.closeListeners.push(callback);
    }

    /**
     * Sends a message if the WebSocket is open.
     */
    public send(message: WSMessage) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn("WebSocket is not open. Ready state:", this.ws.readyState);
        }
    }

    /**
     * Closes the WebSocket connection.
     */
    public close() {
        this.ws.close();
    }

    /**
     * Returns the current ready state.
     */
    public get readyState() {
        return this.ws.readyState;
    }
}
