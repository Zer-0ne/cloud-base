"use client";
import React, { useState, useEffect, useRef } from 'react';
import useFetch from '@/hooks/useFetch';
import { getCookie, getData } from '@/utils/fetch-from-api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FileUploader({ folderId }: { folderId?: string }) {
    // Instead of a single file, we now store an array of files.
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [chunkProgress, setChunkProgress] = useState<number>(0);
    const [driveProgress, setDriveProgress] = useState<number>(0);
    const [progressLabel, setProgressLabel] = useState<string>('Preparing upload...');
    const [error, setError] = useState<string>('');
    const [selectedToken, setSelectedToken] = useState<string>('');
    const [showDialog, setShowDialog] = useState<boolean>(false);
    const [pendingUpload, setPendingUpload] = useState<boolean>(false);
    // Stores details of files that have finished uploading.
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; fileId: string }[]>([]);
    // To track which file (by index) is currently being uploaded.
    const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

    const { data: tokens } = useFetch(() => getData('api/user/api-keys'));
    const wsRef = useRef<WebSocket | null>(null);
    // A ref to hold the resolve callback for the current file upload promise.
    const currentUploadResolveRef = useRef<(fileId: string) => void>(undefined);

    // Establish the WebSocket connection when a token is selected.
    useEffect(() => {
        if (!selectedToken) return;
        const socket = new WebSocket(`ws://${window.location.hostname || 'localhost'}:5000/ws/file-upload`, []);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connection opened');
            socket.send(JSON.stringify({ type: 'auth', token: selectedToken }));
            if (pendingUpload) {
                uploadFiles();
                setPendingUpload(false);
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'progress') {
                    // Update progress depending on the current stage.
                    if (data.stage === 'server-chunk') {
                        setChunkProgress(data.percentage);
                        setProgressLabel(
                            data.percentage === 100
                                ? 'Server chunk received. Starting Drive upload...'
                                : 'Uploading to server...'
                        );
                    } else if (data.stage === 'drive-upload') {
                        setDriveProgress(data.percentage);
                        setProgressLabel(
                            data.percentage === 100
                                ? 'Upload complete!'
                                : 'Uploading to Drive...'
                        );
                    }
                } else if (data.type === 'complete') {
                    // When the server signals completion, resolve the current upload promise.
                    if (currentUploadResolveRef.current) {
                        currentUploadResolveRef.current(data.fileId);
                        currentUploadResolveRef.current = undefined;
                    }
                } else if (data.type === 'error') {
                    setError(data.message);
                    setUploading(false);
                }
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        };

        socket.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('WebSocket error occurred.');
            setUploading(false);
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
        };

        return () => {
            if (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            ) {
                socket.close();
            }
        };
    }, [selectedToken]);

    // Helper: Convert a Blob to a Base64 string.
    const convertBlobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
        });
    };

    // Uploads a single file in 1MB chunks and returns a promise that resolves with the fileId.
    const uploadSingleFile = async (file: File): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                setError('WebSocket is not connected.');
                return reject('WebSocket is not connected.');
            }

            setUploading(true);
            setChunkProgress(0);
            setDriveProgress(0);
            setProgressLabel('Preparing upload...');
            setError('');

            const chunkSize = 1024 * 1024; // 1 MB chunks
            const totalChunks = Math.ceil(file.size / chunkSize);

            // Set the current resolve callback so the WebSocket onmessage can resolve this upload.
            currentUploadResolveRef.current = (fileId: string) => {
                resolve(fileId);
            };

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(file.size, start + chunkSize);
                const blobChunk = file.slice(start, end);

                try {
                    const base64Data = await convertBlobToBase64(blobChunk);
                    // Remove header ("data:...;base64,")
                    const base64Content = base64Data.split(',')[1];

                    const uploadMessage = {
                        type: 'upload',
                        filename: file.name,
                        folderId,
                        content: base64Content,
                        contentType: file.type,
                        chunkIndex,
                        totalChunks,
                        ...(chunkIndex === 0 ? { fileSize: file.size } : {})
                    };

                    wsRef.current.send(JSON.stringify(uploadMessage));
                } catch (err) {
                    console.error('Error processing file chunk:', err);
                    setError('Error processing file chunk.');
                    setUploading(false);
                    return reject(err);
                }
            }
        });
    };

    // Loops through the selected files and uploads them one by one.
    const uploadFiles = async () => {
        for (let i = 0; i < files.length; i++) {
            setCurrentFileIndex(i);
            try {
                const fileId = await uploadSingleFile(files[i]);
                setUploadedFiles(prev => [...prev, { name: files[i].name, fileId }]);
            } catch (err) {
                console.error('Upload failed for file:', files[i].name);
                break;
            }
        }
        setUploading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Convert FileList to an array.
            setFiles(Array.from(e.target.files));
            // Reset any previous uploads.
            setUploadedFiles([]);
            setCurrentFileIndex(0);
        }
    };

    useEffect(() => {
        if (tokens && (tokens as { token: string }[])?.length < 2) {
            setSelectedToken((tokens as { token: string }[])[0].token);
        }
    }, [tokens])


    const handleUpload = async () => {
        if (files.length === 0) return;

        if (!selectedToken) {
            if (tokens && (tokens as { token: string }[]).length > 1) {
                setShowDialog(true);
                setPendingUpload(true);
                return;
            } else if (tokens && (tokens as { token: string }[]).length === 1) {
                setSelectedToken((tokens as { token: string }[])[0].token);
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    uploadFiles();
                }
                return;
            } else {
                setError("No API tokens available.");
                return;
            }
        } else {
            uploadFiles();
        }
    };

    return (
        <div className="space-y-4">
            {/* Dialog for selecting API token when multiple tokens are available */}
            {tokens &&
                (tokens as { token: string }[]).length > 1 &&
                showDialog && (
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Select API Token</DialogTitle>
                                <DialogDescription>
                                    Please select the API token you want to use for uploading.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                {(tokens as { token: string, name: string }[]).map((item, index) => (
                                    <Input
                                        readOnly
                                        key={index}
                                        value={item.name}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setSelectedToken(item.token);
                                            setShowDialog(false);
                                            if (
                                                wsRef.current &&
                                                wsRef.current.readyState === WebSocket.OPEN &&
                                                pendingUpload
                                            ) {
                                                uploadFiles();
                                                setPendingUpload(false);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

            <div className="flex items-center space-x-4">
                <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || uploading}
                    className="relative"
                >
                    <AnimatePresence mode="wait">
                        {uploading ? (
                            <motion.div
                                key="uploading"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center"
                            >
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading file {currentFileIndex + 1} of {files.length}...
                            </motion.div>
                        ) : (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </div>

            <AnimatePresence>
                {uploading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={progressLabel}
                                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                transition={{ duration: 0.5 }}
                                className="mb-2"
                            >
                                {progressLabel}
                            </motion.p>
                        </AnimatePresence>

                        <Progress
                            value={chunkProgress === 100 ? driveProgress : chunkProgress}
                            className="w-full"
                        />

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-2 flex items-center justify-between"
                        >
                            <span>
                                {chunkProgress === 100 ? driveProgress : chunkProgress}%{' '}
                                {chunkProgress === 100 ? 'Drive Upload' : 'Server Chunk'} completed
                            </span>
                            {chunkProgress === 100 && driveProgress === 100 && (
                                <CheckCircle className="text-green-500" />
                            )}
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {uploadedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 space-y-2"
                    >
                        {uploadedFiles.map((file, index) => (
                            <motion.p
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="text-green-600"
                            >
                                {file.name} uploaded! File ID: {file.fileId}
                            </motion.p>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="text-red-500"
                    >
                        Error: {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
