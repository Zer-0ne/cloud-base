import { useState, useEffect, useCallback, useRef } from 'react';
import useFetch from '@/hooks/useFetch';
import { getData } from '@/utils/fetch-from-api';

interface WebSocketMessage {
    type: string;
    action?: string;
    payload?: any;
    status?: string;
    data?: any;
    message?: string;
}

interface UseWebSocketOptions {
    url: string;
    onMessage?: (message: WebSocketMessage) => void;
    autoConnect?: boolean;
}

export const useWebSocket = ({ url, onMessage, autoConnect = true }: UseWebSocketOptions) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: tokens } = useFetch(() => getData('api/user/api-keys'));
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Store onMessage callback in ref to avoid dependency changes
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Initialize WebSocket connection
    const connect = useCallback(() => {
        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        // Don't create a new connection if one already exists
        if (wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            setError(null);

            // Send auth message with token
            if (tokens?.[0]) {
                socket.send(
                    JSON.stringify({
                        type: 'auth',
                        token: { token: tokens[0] },
                    })
                );
            }
        };

        socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);

                // Handle errors
                if (message.type === 'error') {
                    setError(message.message || 'Unknown error occurred');
                    console.error('WebSocket error:', message.message);
                }

                // Call custom message handler if provided
                onMessageRef.current?.(message);
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
                setError('Failed to parse message');
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('WebSocket connection error');
            setIsConnected(false);
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            wsRef.current = null;

            // Attempt to reconnect after 5 seconds
            if (autoConnect) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            }
        };
    }, [url, tokens, autoConnect]);

    // Connect on mount and cleanup on unmount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, autoConnect]);

    // Send message helper
    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError('WebSocket is not connected');
            return;
        }

        try {
            wsRef.current.send(JSON.stringify(message));
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message');
        }
    }, []);

    // Manually disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    return {
        isConnected,
        error,
        sendMessage,
        connect,
        disconnect
    };
};