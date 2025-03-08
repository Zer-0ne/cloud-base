/***
 * 
 * 
 * DEPRESIATED
 */



import { Server as WebSocketServer } from 'ws';
import { Server } from 'http';
import { postManager } from '@/lib/post-manager';
import { print } from '@/utils/color-print';
import { PassThrough } from 'stream';

// Interface for progress message sent to the client
interface ProgressMessage {
    type: 'progress';
    filename: string;
    loaded: number; // e.g. number of chunks received or bytes uploaded
    total: number;  // total chunks or total file size in bytes
    percentage: number;
    stage?: 'server-chunk' | 'drive-upload';
}

// Interface for a completion message
interface CompletionMessage {
    type: 'complete';
    filename: string;
    fileId: string;
}

// Interface for an error message
interface ErrorMessage {
    type: 'error';
    message: string;
}

// Interface for tracking an active upload session
interface UploadSession {
    stream: PassThrough;
    totalChunks: number;    // total chunks expected
    receivedChunks: number; // number of chunks received so far
    fileSize: number;       // total file size in bytes (sent in first chunk)
    filename: string;
    contentType: string;
}

export function setupWebSocketServer(server: Server) {
    const wss = new WebSocketServer({ server });
    // Map to track upload sessions keyed by filename.
    const fileUploads: Record<string, UploadSession> = {};

    wss.on('connection', (ws) => {
        print('New WebSocket connection established', 'green');
        let token: string | null = null;

        ws.on('message', async (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());

                // Handle authentication message.
                if (data.type === 'auth') {
                    token = data.token;
                    ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
                    return;
                }

                // Verify authentication.
                if (!token) {
                    throw new Error('Not authenticated');
                }

                // Handle file upload messages (resumable upload).
                if (data.type === 'upload') {
                    // Expected: filename, content (base64), contentType, chunkIndex, totalChunks.
                    // On first chunk (chunkIndex === 0), client must include fileSize.
                    const { filename, content, contentType, chunkIndex, totalChunks } = data;

                    if (chunkIndex === 0) {
                        if (!data.fileSize) {
                            throw new Error('Missing fileSize in first chunk');
                        }
                        const fileSize: number = data.fileSize;
                        // Create a new PassThrough stream for this file.
                        const stream = new PassThrough();
                        fileUploads[filename] = {
                            stream,
                            totalChunks,
                            receivedChunks: 0,
                            fileSize,
                            filename,
                            contentType,
                        };

                        // Immediately initiate a resumable upload.
                        postManager.uploadFileResumable({
                            stream,
                            filename,
                            contentType,
                            token,
                            folderId: data.folderId, // optional
                            totalSize: fileSize,
                            onProgress: (progress: ProgressMessage) => {
                                // Mark these progress events as "drive-upload" progress.
                                ws.send(JSON.stringify({ ...progress, stage: 'drive-upload' }));
                            },
                        })
                            .then((result) => {
                                const completionMessage: CompletionMessage = {
                                    type: 'complete',
                                    filename,
                                    fileId: result.id!,
                                };
                                ws.send(JSON.stringify(completionMessage));
                            })
                            .catch((error) => {
                                const errorMessage: ErrorMessage = {
                                    type: 'error',
                                    message: error.message,
                                };
                                ws.send(JSON.stringify(errorMessage));
                            });
                    }

                    // For each incoming chunk, write it to the corresponding stream.
                    const session = fileUploads[filename];
                    if (session) {
                        session.stream.write(Buffer.from(content, 'base64'));
                        session.receivedChunks++;

                        // Calculate progress based on chunks received.
                        const chunkPercentage = Math.round((session.receivedChunks / totalChunks) * 100);
                        const progressMessage: ProgressMessage = {
                            type: 'progress',
                            filename,
                            loaded: session.receivedChunks,
                            total: totalChunks,
                            percentage: chunkPercentage,
                            stage: 'server-chunk',
                        };
                        ws.send(JSON.stringify(progressMessage));

                        // When the final chunk is received, end the stream.
                        if (chunkIndex === totalChunks - 1) {
                            session.stream.end();
                            delete fileUploads[filename];
                        }
                    }
                }
            } catch (error) {
                const errorMessage: ErrorMessage = {
                    type: 'error',
                    message: (error as Error).message,
                };
                ws.send(JSON.stringify(errorMessage));
            }
        });

        ws.on('close', () => {
            print('WebSocket connection closed', 'yellow');
        });
    });

    return wss;
}
