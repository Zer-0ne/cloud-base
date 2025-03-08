import React, { useState, useEffect, useRef } from 'react';
import useFetch from '@/hooks/useFetch';
import { getData } from '@/utils/fetch-from-api';

export const FileUpload = () => {
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [fileId, setFileId] = useState<string>('');
    const [error, setError] = useState<string>('');
    const { data: tokens } = useFetch(() => getData('api/user/api-keys'));
    const wsRef = useRef<WebSocket | null>(null);

    // Establish WebSocket connection when tokens are available.
    useEffect(() => {
        // Wait until tokens are loaded.
        if (!tokens || (tokens as any[]).length === 0) return;

        // Create a new WebSocket using your server's URL.
        const socket = new WebSocket('ws://localhost:5000');
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connection opened');
            // Use the first token from your fetched tokens for authentication.
            const token = (tokens[0] as { token: string }).token;
            socket.send(JSON.stringify({ type: 'auth', token }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'progress') {
                    setUploadProgress(data.percentage);
                } else if (data.type === 'complete') {
                    setFileId(data.fileId);
                } else if (data.type === 'error') {
                    setError(data.message);
                }
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        };

        socket.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('WebSocket error occurred.');
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
        };

        // Cleanup function to close the WebSocket when the component unmounts.
        return () => {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        };
    }, [tokens]); // Run this effect when tokens become available

    // Helper: Convert a Blob to a Base64 string.
    const convertBlobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
        });
    };

    // Handle file selection and upload in chunks.
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected.');
            setError('WebSocket is not connected.');
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        const chunkSize = 1024 * 1024; // 1 MB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(file.size, start + chunkSize);
            const blobChunk = file.slice(start, end);

            try {
                const base64Data = await convertBlobToBase64(blobChunk);
                // Remove the header ("data:image/png;base64," or similar)
                const base64Content = base64Data.split(',')[1];

                const uploadMessage = {
                    type: 'upload',
                    filename: file.name,
                    content: base64Content,
                    contentType: file.type,
                    chunkIndex,
                    totalChunks,
                    ...(chunkIndex === 0 ? { fileSize: file.size } : {})
                };
                if (chunkIndex === 0) {
                    uploadMessage.fileSize = file.size;
                }

                socket.send(JSON.stringify(uploadMessage));
            } catch (err) {
                console.error('Error processing file chunk:', err);
                setError('Error processing file chunk.');
                break;
            }
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
            <h1>File Upload via WebSocket</h1>
            <input type="file" onChange={handleFileChange} />
            {/* Progress Bar */}
            {uploadProgress > 0 && (
                <div style={{ margin: '1rem 0' }}>
                    <progress value={uploadProgress} max={100} style={{ width: '100%' }} />
                    <p>{uploadProgress}% completed</p>
                </div>
            )}
            {fileId && <p>Upload complete! File ID: {fileId}</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
};
