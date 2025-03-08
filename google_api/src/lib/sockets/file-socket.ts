// ----------------- File Upload Service -----------------

import { IncomingMessage } from "http";
import { BaseWebSocketService } from "./sockets-manager";
import { postManager } from "../post-manager";
import { PassThrough } from "stream";
import { WebSocket } from "ws";

// Interfaces for progress, completion, and error messages
interface ProgressMessage {
    type: 'progress';
    filename: string;
    loaded: number;
    total: number;
    percentage: number;
    stage?: 'server-chunk' | 'drive-upload';
}

interface CompletionMessage {
    type: 'complete';
    filename: string;
    fileId: string;
}

interface ErrorMessage {
    type: 'error';
    message: string;
}

// Interface for tracking an active upload session
interface UploadSession {
    stream: PassThrough;
    totalChunks: number;
    receivedChunks: number;
    fileSize: number;
    filename: string;
    contentType: string;
}

/**
 * FileUploadService extends the base class and implements file upload handling.
 * It uses a PassThrough stream for each file and sends progress updates.
 */
export class FileUploadService extends BaseWebSocketService {
    private fileUploads: Record<string, UploadSession> = {};
    private token: string | null = null;

    protected onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage): void {
        try {
            const data = JSON.parse(message.toString());

            // Handle authentication message.
            if (data.type === 'auth') {
                this.token = data.token;
                ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
                return;
            }

            // Verify authentication.
            if (!this.token) {
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
                    this.fileUploads[filename] = {
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
                        token: this.token,
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
                const session = this.fileUploads[filename];
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
                        delete this.fileUploads[filename];
                    }
                }
            }

        } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: (error as Error).message }));
        }
    }
}