import { Request, Response, Router } from 'express';
import { drive_v3 } from 'googleapis';
import { print } from '@/utils/color-print';
import formidable from 'formidable';
import fs from 'fs/promises';
import { postManager } from '@/lib/post-manager';
import { validateRequest } from '@/middleware/validate-request';
import { prisma } from '@/prisma.config';

const fileRouter = Router();

// File upload endpoint
// POST /upload - Handle file upload using formidable
/**
 * Converts a formidable file object into an object that mimics the browser File interface.
 */
async function convertFormidableFile(file: formidable.File): Promise<File> {
    // Read the file content from the temporary file path provided by formidable
    const fileBuffer = await fs.readFile(file.filepath);

    // Return an object that implements the File interface
    return {
        // The arrayBuffer() method returns an ArrayBuffer of the file content
        arrayBuffer: async () =>
            fileBuffer.buffer.slice(
                fileBuffer.byteOffset,
                fileBuffer.byteOffset + fileBuffer.byteLength
            ),
        // Use the originalFilename from formidable, or fallback to a default name
        name: file.originalFilename || 'unknown',
        // Use the mimetype from formidable, or fallback to 'application/octet-stream'
        type: file.mimetype || 'application/octet-stream',
        // File size in bytes
        size: file.size,
        // Optional properties can be added if needed (lastModified, etc.)
    } as File;
}

fileRouter.post('/upload', (req: Request, res: Response) => {
    // Verify the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Authorization header is missing!' });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Token is missing from the Authorization header!' });
        return;
    }

    // Initialize formidable to parse the incoming FormData
    const form = new formidable.IncomingForm({
        // You can set options here if needed (e.g., uploadDir, keepExtensions, etc.)
    });

    // Parse the request
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(`Error parsing form data: ${err.message}`);
            res.status(500).json({ error: err.message });
            return;
        }

        // Retrieve additional fields and the file(s)
        const message = fields.message; // For example, "message" field from FormData
        let fileData = files.file; // "file" should match the key you used in formData.append('file', file)
        if (!fileData) {
            res.status(400).json({ error: 'File is required!' });
            return;
        }

        // If a single file was uploaded, convert it into an array
        const fileArray = Array.isArray(fileData) ? fileData : [fileData];

        try {
            // Convert each formidable file to a File-like object and process them concurrently
            const uploadResponses = await Promise.all(
                fileArray.map(async (file) => {
                    const convertedFile = await convertFormidableFile(file);
                    return await postManager.uploadFile(convertedFile, token);
                })
            );

            // Log the names of all uploaded files
            fileArray.forEach((file) => {
                console.log(`File uploaded: ${file.originalFilename}`);
            });

            res.status(200).json({
                data: uploadResponses,
                message: `${fileArray.length} file(s) uploaded successfully!`
            });
        } catch (uploadError) {
            console.error(`Error uploading the file(s): ${(uploadError as Error).message}`);
            res.status(500).json({ error: (uploadError as Error).message });
        }
    });
});

fileRouter.post('/create-folder', validateRequest, async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }
        const api_tokens = authHeader.split(" ")?.slice(1);
        if (!api_tokens.length) {
            throw new Error('Token is missing from the Authorization header!');
        }
        const token = api_tokens[0];
        console.log(token)
        const { folderName, parentId } = req.body;
        const folder = await postManager.createFolder(token, folderName, parentId);
        res.status(201).json({
            data: folder,
            message: `Folder created successfully!`
        });

    } catch (error) {
        console.error(`Error creating the folder: ${(error as Error).message}`);
        res.status(500).json({ error: (error as Error).message ?? error ?? 'Something went wrong, Try again later!' });
    }
})

// Get files list endpoint
fileRouter.get('/', validateRequest, async (req: Request, res: Response) => {
    const { postManager } = await import("@/lib/post-manager");
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }

        const tokens = authHeader.split(" ")?.slice(1);
        if (!tokens.length) {
            throw new Error('Token is missing from the Authorization header!');
        }

        const combinedData = await Promise.all(tokens?.map(async (token) => {
            return await postManager.list(token);

        }));

        const allFiles = combinedData.flat();
        const uniqueFilesMap = new Map<string, drive_v3.Schema$File>();
        // console.log(uniqueFilesMap)

        allFiles.forEach((file) => {
            if (file?.id) {
                uniqueFilesMap.set(file.id, file);
            }
        });

        const uniqueFiles = Array.from(uniqueFilesMap.values());

        res.status(200).json({ data: uniqueFiles });
    } catch (error) {
        print(`Error in listing the files :: ${(error as Error).message}`, 'red', undefined, 'error');
        res.status(500).json({ error: (error as Error).message });
    }
});

fileRouter.get('/:parentId', validateRequest, async (req: Request, res: Response) => {
    const { postManager } = await import("@/lib/post-manager");
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }

        const tokens = authHeader.split(" ")?.slice(1);
        if (!tokens.length) {
            throw new Error('Token is missing from the Authorization header!');
        }

        const { parentId } = req.params;
        console.log("Request params:", req.params);

        const combinedData = await Promise.all(tokens?.map(async (token) => {
            return await postManager.list(token, parentId);

        }));

        const allFiles = combinedData.flat();
        const uniqueFilesMap = new Map<string, drive_v3.Schema$File>();
        // console.log(uniqueFilesMap)

        allFiles.forEach((file) => {
            if (file?.id) {
                uniqueFilesMap.set(file.id, file);
            }
        });

        const uniqueFiles = Array.from(uniqueFilesMap.values());

        res.status(200).json({ data: uniqueFiles });
    } catch (error) {
        print(`Error in listing the files :: ${(error as Error).message}`, 'red', undefined, 'error');
        res.status(500).json({ error: (error as Error).message });
    }
});

// Delete file endpoint
fileRouter.delete('/', validateRequest, async (req: Request, res: Response) => {
    const { postManager } = await import("@/lib/post-manager");
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }

        const tokens = authHeader.split(" ")?.slice(1);;
        if (!tokens || !tokens.length) {
            throw new Error('Token is missing from the Authorization header!');
        }
        const { fileId } = req.body;
        await postManager.deleteUserFile(fileId, tokens);
        res.status(200).json({ message: "Deleted!" });
    } catch (error) {
        print(`Error in Deleting the file :: ${(error as Error).message}`, 'red');
        res.status(500).json({ error: (error as Error).message });
    }
});

fileRouter.get('/metadata/:fileId', validateRequest, async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }

        const tokens = authHeader.split(" ")?.slice(1);
        if (!tokens.length) {
            throw new Error('Token is missing from the Authorization header!');
        }

        const { fileId } = req.params;
        console.log(fileId)
        const chain = await postManager.getParentChain(fileId)
        console.log(chain)
        res.status(200).json({ data: chain })
    } catch (error) {
        print(`Error in Deleting the file :: ${(error as Error).message}`, 'red');
        res.status(500).json({ error: (error as Error).message });
    }
})

export default fileRouter;