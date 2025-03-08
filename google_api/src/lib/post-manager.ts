import { GoogleService } from "./google-service";
// import { apiKey, Drives, Post, User } from "./Models/userSchema";
import { TokenManager } from "@/lib/jwt-token-manager";
import { ApiManager } from "@/lib/api-key-manager";
import { drive_v3 } from "googleapis";
import { PassThrough, Readable } from "stream";
import { print } from "@/utils/color-print";
import { ExternalAccountClientOptions, gaxios, JWTInput, } from 'google-auth-library';
import { tokenManager } from "./token-manager";
import { prisma } from "@/prisma.config";
import { Api_key } from "@prisma/client";
import { redisClient } from "@/redis.config";
import { convertBigIntToString } from "@/utils/constant";

interface ProgressMessage {
    type: 'progress';
    filename: string;
    loaded: number;
    total: number;
    percentage: number;
}


export class PostManager extends GoogleService {
    constructor() {
        super(); // Call the constructor of the base class with the project ID
    }
    // Convert buffer to a readable stream
    bufferToStream = (buffer: Buffer): Readable => {
        const readable = new Readable();
        readable._read = () => { }; // _read is a no-op
        readable.push(buffer);
        readable.push(null); // Signal end of stream
        return readable;
    };

    private isCacheStillValid = (lastUpdate: string) => {
        // Calculate the difference between current time and modifiedTime
        const TIME = 24 * 60 * 60 * 1000 //(24 hours)
        const now = new Date();
        const lastModifiedDate = new Date(lastUpdate);
        const timeDifference = now.getTime() - lastModifiedDate.getTime(); // Difference in milliseconds
        return !(timeDifference >= TIME)
    }

    /**
     * Uploads a file to Google Drive.
     * 
     * @param {File} file - The file to be uploaded.
     * @param {string} token - The authentication token for the user.
     * @param {string} [folderId] - Optional ID of the folder to upload the file to.
     * @returns {Promise<drive_v3.Schema$File>} - Returns the metadata of the uploaded file.
     * 
     * @throws {Error} - Throws an error if the upload fails.
     * : {
        name: string;
        size: string;
        type: string;
        content: string
    }
     */
    async uploadFile(file: File, token: string, folderId?: string): Promise<drive_v3.Schema$File> {
        return await this.loadManager.addTask(async () => {
            // const { apiKey, Drives, Post } = await import("./Models/userSchema")
            let fileSizeInBytes
            try {
                // Get the current user session

                // const user = await this.getCurrentUser()
                const bytes = await file.arrayBuffer()

                // Prepare file metadata for the upload
                const fileMetadata = {
                    name: file.name, // Name of the file
                    mimeType: file.type, // MIME type of the file
                    parents: folderId ? [folderId] : [], // Set the parent folder if provided
                };

                fileSizeInBytes = file.size.toString(); // Size of the file in bytes

                // Prepare media for the upload
                const media = {
                    mimeType: file.type, // MIME type of the file
                    // body: file.stream()
                    body: this.bufferToStream(Buffer.from(bytes)), // Stream of the file content
                    // body: this.bufferToStream(Buffer.from(file?.content?.split(",")[1], "base64")), // Stream of the file content
                };

                // Verify the user's access token
                const { accessKey, userId } = await TokenManager.verifyToken(token);
                const apiManager = new ApiManager(userId as string);
                const isApiKeyValid = await apiManager.verifyKey(accessKey);
                if (!isApiKeyValid) throw new Error('API key is not valid!');

                // Get the key details associated with the access key

                const keyDetails = await prisma.api_key.findUnique({
                    where: {
                        accessKey
                    },
                    include: {
                        drives: true
                    }
                });
                if (!(keyDetails?.drives)?.length) throw new Error('You don\'t have any allotted Drive!');

                let availableDriveId: string | undefined; // Variable to hold the available drive ID
                // Calculate total usage of space by summing the sizes of all posts
                const totalUsageInBytes = Number(keyDetails?.totalUsage!) + parseInt(fileSizeInBytes);
                keyDetails.totalUsage = BigInt(totalUsageInBytes)
                // keyDetails.drive.usage = (parseInt(keyDetails.drive.usage, 10) + parseInt(fileSizeInBytes)).toString();

                // Find an available drive with sufficient space
                // keyDetails?.drives = {"driveId","allocatedSpace"}[]
                for (const drive of keyDetails.drives) {
                    // Update the usage for the current drive
                    drive.usage = BigInt(Number(drive?.usage!) + parseInt(fileSizeInBytes, 10));

                    // const Drive = await Drives.getByID(drive.driveId)
                    // Drive.usage = (parseInt(drive.usage, 10) + parseInt(fileSizeInBytes, 10)).toString();
                    // Drive.usageInDrive = (parseInt(drive.usage, 10) + parseInt(fileSizeInBytes, 10)).toString();

                    // Check if the drive has sufficient space
                    if (drive.allocatedSpace! > totalUsageInBytes) {
                        availableDriveId = drive.driveId; // Set the available drive ID
                        break; // Exit the loop once a suitable drive is found
                    }
                }
                if (!availableDriveId) throw new Error('There is no more space available'); // Check if a drive was found

                const credential = await tokenManager.get_auth_token(availableDriveId)
                // console.log(keyDetails)


                // Upload the file to Google Drive
                const { data } = await this.drive.files.create({
                    requestBody: {
                        ...fileMetadata, // Include file metadata
                    },
                    media: media, // Include media for the upload
                    fields: 'id, name,quotaBytesUsed, contentHints,parents,mimeType,thumbnailLink,webViewLink,webContentLink,folderColorRgb,videoMediaMetadata,imageMediaMetadata,viewedByMeTime,sharedWithMeTime,modifiedTime,description,fullFileExtension', // Specify the fields to return
                    auth: credential // Authenticate using the service account

                });

                await this.drive.permissions.create({
                    fileId: data.id!,
                    auth: credential,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone'
                    }
                });

                // Update the total usage for the API key
                await prisma.api_key.update({
                    where: { accessKey: keyDetails.accessKey },
                    data: {
                        ...keyDetails,
                        drives: {
                            update: keyDetails.drives.map((drive) => ({
                                where: { id: drive.id }, // Use the unique identifier for the drive
                                data: {
                                    allocatedSpace: drive.allocatedSpace,
                                    usage: drive.usage,
                                },
                            })),
                        },
                    },
                    include: { drives: true },
                });



                const Drive = await prisma.drive.findUnique(
                    {
                        where: {
                            serviceId: availableDriveId
                        },
                        include: {
                            DriveKey: true
                        }
                    }
                )
                const { storageQuota } = await this.getDriveQuotaByServiceId(availableDriveId!) as drive_v3.Schema$About
                const storageQuotaType = {
                    limit: Number(storageQuota?.limit),
                    usage: Number(storageQuota?.usage),
                    usageInDrive: Number(storageQuota?.usageInDrive),
                    usageInDriveTrash: Number(storageQuota?.usageInDriveTrash),
                }
                const updatedDrive = {
                    ...storageQuotaType,
                    DriveKey: Drive?.DriveKey
                }
                await prisma.drive.update({
                    where: { serviceId: availableDriveId! },
                    data: {
                        ...updatedDrive, DriveKey: {
                            update: updatedDrive?.DriveKey?.map((driveKey) => ({
                                where: { id: driveKey.id },
                                data: {
                                    allocatedSpace: driveKey.allocatedSpace,
                                    usage: driveKey.usage,
                                    // driveId: driveKey.driveId,
                                },
                            })),
                        }
                    }
                })
                // } else {
                //     Drive.usage = (Drive?.usage! + parseInt(fileSizeInBytes, 10));
                //     Drive.usageInDrive = (Drive?.usageInDrive! + parseInt(fileSizeInBytes, 10));
                //     await Drives.update(availableDriveId!, Drive)
                // }

                // console.log(data)

                // Create a new post entry in the database for the uploaded file
                await prisma.post.create({
                    data: {
                        name: data.name,
                        id: data?.id!,
                        mimeType: data.mimeType!,
                        parents: data.parents || [],
                        thumbnailLink: data.thumbnailLink ?? data.contentHints?.thumbnail?.image,
                        webViewLink: data.webViewLink,
                        webContentLink: data.webContentLink,
                        folderColorRgb: data.folderColorRgb,
                        videoMediaMetadata: data.videoMediaMetadata || {},
                        imageMediaMetadata: data.imageMediaMetadata || {},
                        viewedByMeTime: data.viewedByMeTime,
                        sharedWithMeTime: data.sharedWithMeTime,
                        modifiedTime: data.modifiedTime,
                        description: data.description,
                        fullFileExtension: data.fullFileExtension,
                        user: {
                            connect: { username: userId }
                        },
                        accessKey,
                        driveId: availableDriveId,
                        size: parseInt(fileSizeInBytes)
                    }
                });

                return data; // Return the metadata of the uploaded file
            } catch (error) {
                console.error('Error uploading file:', error); // Log the error
                throw new Error(`Failed to upload file: ${(error as Error).message}`); // Throw a new error with the message
            }
        })
    }

    createFolder = async (token: string, folder: string, parentId?: string) => {
        return await this.loadManager.addTask(async () => {
            try {
                const fileMetadata = {
                    name: folder,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: parentId ? [parentId] : [],
                };

                // Verify token and API key
                const { accessKey, userId } = await TokenManager.verifyToken(token);
                const apiManager = new ApiManager(userId as string);
                const isApiKeyValid = await apiManager.verifyKey(accessKey);
                if (!isApiKeyValid) throw new Error('API key is not valid!');

                // Get key details
                const keyDetails = await prisma.api_key.findUnique({
                    where: { accessKey },
                    include: { drives: true }
                });
                if (!(keyDetails?.drives)?.length) throw new Error('You don\'t have any allotted Drive!');

                // Get first available drive
                let availableDriveId = keyDetails.drives[0]?.driveId;
                if (!availableDriveId) throw new Error('There is no drive available');

                const credential = await tokenManager.get_auth_token(availableDriveId);

                // Create folder in Google Drive
                const { data } = await this.drive.files.create({
                    requestBody: fileMetadata,
                    fields: 'id, name,owners, contentHints, parents, mimeType, thumbnailLink, webViewLink, webContentLink, folderColorRgb, videoMediaMetadata, imageMediaMetadata, viewedByMeTime, sharedWithMeTime, modifiedTime, description, fullFileExtension',
                    auth: credential
                });

                const ownerEmails = data?.owners?.map(owner => owner.emailAddress) || [];

                for (let { driveId } of keyDetails.drives.filter(drive => !ownerEmails.includes(drive.driveId))) {
                    await this.shareFile({
                        fileId: data?.id!,
                        role: 'writer',
                        emailAddress: driveId
                        , credential
                    })
                }

                // Set permissions
                await this.drive.permissions.create({
                    fileId: data.id!,
                    auth: credential,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone'
                    }
                });

                // Create post entry in database
                await prisma.post.create({
                    data: {
                        name: data.name,
                        id: data.id!,
                        mimeType: data.mimeType!,
                        parents: data.parents || [],
                        thumbnailLink: data.thumbnailLink ?? data.contentHints?.thumbnail?.image,
                        webViewLink: data.webViewLink,
                        webContentLink: data.webContentLink,
                        folderColorRgb: data.folderColorRgb,
                        videoMediaMetadata: data.videoMediaMetadata || {},
                        imageMediaMetadata: data.imageMediaMetadata || {},
                        viewedByMeTime: data.viewedByMeTime,
                        sharedWithMeTime: data.sharedWithMeTime,
                        modifiedTime: data.modifiedTime,
                        description: data.description,
                        fullFileExtension: data.fullFileExtension,
                        user: {
                            connect: { username: userId }
                        },
                        accessKey,
                        driveId: availableDriveId,
                        size: 0 // Folders don't have size
                    }
                });

                return data;

            } catch (error) {
                console.error('Error creating folder:', error);
                throw new Error(`Failed to create folder: ${(error as Error).message}`);
            }
        });
    }

    async uploadFileResumable(params: {
        stream: NodeJS.ReadableStream;
        filename: string;
        contentType: string;
        token: string;
        folderId?: string;
        totalSize: number;
        onProgress?: (progress: ProgressMessage) => void;
    }): Promise<drive_v3.Schema$File> {
        return await this.loadManager.addTask(async () => {
            const fileSizeInBytes = BigInt(params.totalSize); // Ensure BigInt from the start
            try {
                // Prepare file metadata
                const fileMetadata = {
                    name: params.filename,
                    mimeType: params.contentType,
                    parents: params.folderId ? [params.folderId] : [],
                };

                // Verify token and API key
                const { accessKey, userId } = await TokenManager.verifyToken(params.token);
                const apiManager = new ApiManager(userId as string);
                const isApiKeyValid = await apiManager.verifyKey(accessKey);
                if (!isApiKeyValid) throw new Error('API key is not valid!');

                // Fetch API key and drives
                const keyDetails = await prisma.api_key.findUnique({
                    where: { accessKey },
                    include: { drives: true },
                });
                if (!keyDetails?.drives?.length) throw new Error('You don’t have any allotted Drive!');

                // Find a drive with enough space
                let availableDriveId: string | undefined;
                const currentTotalUsage = BigInt(keyDetails.totalUsage || 0);
                const newTotalUsage = currentTotalUsage + fileSizeInBytes;

                for (const drive of keyDetails.drives) {
                    const currentDriveUsage = BigInt(drive.usage || 0);
                    const newDriveUsage = currentDriveUsage + fileSizeInBytes;
                    if (BigInt(drive.allocatedSpace!) > newTotalUsage) {
                        availableDriveId = drive.driveId;
                        break;
                    }
                }
                if (!availableDriveId) throw new Error('There is no more space available');

                const credential = await tokenManager.get_auth_token(availableDriveId);

                // Set up progress tracking
                const progressStream = new PassThrough();
                let uploadedBytes = 0;
                params.stream.on('data', (chunk: Buffer) => {
                    uploadedBytes += chunk.length;
                    if (params.onProgress) {
                        const percentage = Math.round((uploadedBytes / Number(params.totalSize)) * 100);
                        params.onProgress({
                            type: 'progress',
                            filename: params.filename,
                            loaded: uploadedBytes,
                            total: params.totalSize,
                            percentage,
                        });
                    }
                });
                params.stream.pipe(progressStream);

                const media = {
                    mimeType: params.contentType,
                    body: progressStream,
                };

                // Upload the file
                const { data } = await this.drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields:
                        'id, name, quotaBytesUsed, contentHints, parents, mimeType, thumbnailLink, webViewLink, webContentLink, folderColorRgb, videoMediaMetadata, imageMediaMetadata, viewedByMeTime, sharedWithMeTime, modifiedTime, description, fullFileExtension',
                    uploadType: 'resumable',
                    auth: credential,
                });

                // Set permissions
                await this.drive.permissions.create({
                    fileId: data.id!,
                    auth: credential,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone',
                    },
                });

                // Update database in a transaction after successful upload
                await prisma.$transaction(async (tx) => {
                    // Update Api_key totalUsage
                    await tx.api_key.update({
                        where: { accessKey },
                        data: { totalUsage: newTotalUsage },
                    });

                    // Update DriveKey usage
                    const selectedDrive = keyDetails.drives.find((d) => d.driveId === availableDriveId);
                    if (selectedDrive) {
                        await tx.driveKey.update({
                            where: { id: selectedDrive.id },
                            data: { usage: BigInt(selectedDrive.usage || 0) + fileSizeInBytes },
                        });
                    }

                    // Optionally update Drive model if syncing with Google Drive quota is required
                    // For simplicity, we skip this unless external validation is needed
                });

                // Create post entry
                await prisma.post.create({
                    data: {
                        name: data.name,
                        id: data.id!,
                        mimeType: data.mimeType!,
                        parents: data.parents || [],
                        thumbnailLink: data.thumbnailLink ?? data.contentHints?.thumbnail?.image,
                        webViewLink: data.webViewLink,
                        webContentLink: data.webContentLink,
                        folderColorRgb: data.folderColorRgb,
                        videoMediaMetadata: data.videoMediaMetadata || {},
                        imageMediaMetadata: data.imageMediaMetadata || {},
                        viewedByMeTime: data.viewedByMeTime,
                        sharedWithMeTime: data.sharedWithMeTime,
                        modifiedTime: data.modifiedTime,
                        description: data.description,
                        fullFileExtension: data.fullFileExtension,
                        user: { connect: { username: userId } },
                        accessKey,
                        driveId: availableDriveId,
                        size: fileSizeInBytes,
                    },
                });
                const current_user = await tokenManager.getUserProfile()
                await redisClient.del(`drive:${current_user?.username}${params.folderId || ''}`);

                return data;
            } catch (error) {
                console.error('Error uploading file:', error);
                throw new Error(`Failed to upload file: ${(error as Error).message}`);
            }
        });
    }

    /**
     * Deletes a file from Google Drive using its file ID.
     * 
     * This function makes an API call to the Google Drive API to delete the specified file. If the deletion
     * is successful, it returns the response from the API. If an error occurs, it logs the error message.
     * 
     * @param {string} token - The ID of the file to be deleted.
     * @param {string} fileId - The ID of the file to be deleted.
     * @returns {Promise<gaxios.GaxiosResponse<void> | undefined>} - Returns the API response if the deletion is successful; otherwise, it returns undefined.
     * 
     * @throws {Error} - Throws an error if there is an issue deleting the file.
     * 
     * @example
     * deleteFile('your-file-id')
     *     .then(response => console.log('File deleted successfully:', response))
     *     .catch(err => console.error('Error:', err));
     */
    deleteUserFile = async (fileId: string, tokens: string[]): Promise<gaxios.GaxiosResponse<void> | undefined> => {
        return this.loadManager.addTask(async () => {
            try {
                // Token verification and post retrieval as before
                let verifiedToken: { accessKey: string; userId?: string } | null = null;
                let prismaToken: Api_key | null = null;
                const post = await prisma.post.findUnique({
                    where: { id: fileId }
                });
                if (!post) {
                    throw new Error(`Post with ID ${fileId} not found.`);
                }
                const isFolder = (post.mimeType === 'application/vnd.google-apps.folder');

                for (const tok of tokens) {
                    try {
                        const { accessKey } = await TokenManager.verifyToken(tok);
                        const tDetails = await prisma.api_key.findUnique({
                            where: { accessKey }
                        });
                        if (post.accessKey == tDetails?.accessKey) {
                            verifiedToken = { accessKey };
                            prismaToken = tDetails;
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }
                if (!verifiedToken || !prismaToken) {
                    throw new Error("No valid token found.");
                }

                const keyDetails = await prisma.api_key.findUnique({
                    where: { accessKey: verifiedToken.accessKey },
                    include: { drives: true }
                });
                if (!keyDetails) {
                    throw new Error("Invalid API key or access key not found.");
                }

                // Destructure needed values
                const { driveId, size, id, accessKey: currentAccessKey } = post;
                if (verifiedToken.accessKey !== currentAccessKey) {
                    throw new Error("Access key does not match.");
                }

                // Check if driveId exists in API key's drives
                const drive = keyDetails.drives?.find((d: any) => d?.driveId === driveId);
                if (!drive) {
                    throw new Error(`Drive ID ${driveId} is not associated with the API key.`);
                }

                // Delete the file from the drive (this call should work for both files and folders)
                const deleteResponse = await this.drive.files.delete({
                    auth: await tokenManager.get_auth_token(driveId!),
                    fileId: fileId,
                });

                // Track deducted size
                let deductedSize = 0;
                if (isFolder) {
                    // Recursively delete and get the total size removed from the DB
                    deductedSize = await this.deleteRecursively(fileId);
                } else {
                    deductedSize = Number(post.size) || 0;
                    await prisma.post.delete({
                        where: { id }
                    });
                }

                // Update the allocated space and total usage in the API key.
                // Use the deducted size from deletion.
                const currentDrive = keyDetails.drives?.find((d: any) => d.driveId === driveId);
                if (!currentDrive) {
                    throw new Error(`Current drive with ID ${driveId} not found.`);
                }

                // Deduct the size from the current drive usage and API key total usage
                currentDrive.usage = BigInt(Number(currentDrive.usage) - deductedSize);
                keyDetails.totalUsage = BigInt(Number(keyDetails.totalUsage) - deductedSize);

                // Optionally, update the drive quota from the external API
                const { storageQuota } = await this.getDriveQuotaByServiceId(currentDrive.driveId!) as drive_v3.Schema$About;
                await prisma.drive.update({
                    where: { serviceId: currentDrive.driveId },
                    data: {
                        limit: Number(storageQuota?.limit),
                        usage: Number(storageQuota?.usage),
                        usageInDrive: Number(storageQuota?.usageInDrive),
                        usageInDriveTrash: Number(storageQuota?.usageInDriveTrash),
                    }
                });

                // Save the updated API key details
                await prisma.api_key.update({
                    where: { accessKey: verifiedToken.accessKey },
                    data: {
                        drives: {
                            update: {
                                where: { id: currentDrive.id },
                                data: { usage: currentDrive.usage },
                            },
                        },
                        totalUsage: keyDetails.totalUsage,
                    },
                });

                return deleteResponse;
            } catch (error) {
                print(`Error in deleting the file of the user ${(error as Error).message}`, 'red');
                throw new Error(`Failed to delete file of the user: ${(error as Error).message}`);
            }
        });
    };


    /**
     * 
     * @param fileId folder id
     * if the file is in the root folder, the folder id is the same as the file id
     * 
     */
    deleteRecursively = async (fileId: string): Promise<number> => {
        // Find all children of the current file/folder
        const children = await prisma.post.findMany({
            where: { parents: { has: fileId } },
        });

        // Initialize total size deducted
        let totalSizeDeducted = 0;

        // Process each child
        for (const child of children) {
            if (child.mimeType === 'application/vnd.google-apps.folder') {
                // Recursively delete folder and add its size
                totalSizeDeducted += await this.deleteRecursively(child.id);
            } else {
                // Add the file size (ensure a number, defaulting to 0 if undefined)
                totalSizeDeducted += Number(child.size) || 0;
                await prisma.post.delete({
                    where: { id: child.id },
                });
            }
        }

        // Optionally include the current folder's size (if your folders have a size value)
        const currentPost = await prisma.post.findUnique({ where: { id: fileId } });
        if (currentPost) {
            totalSizeDeducted += Number(currentPost.size) || 0;
        }

        // Finally, delete the current file/folder record
        await prisma.post.delete({
            where: { id: fileId },
        });

        return totalSizeDeducted;
    };

    deleteAll = async (driveId: string) => {
        return this.loadManager.addTask(async () => {
            // const { Drives } = await import("./Models/userSchema")
            try {

                const { data: { files = [] } = {} } = await this.drive.files.list({
                    auth: await this.loadManager.addTask(async () => await tokenManager.get_auth_token(driveId)),
                    fields: "files(id, name,mimeType, parents, thumbnailLink, webViewLink, webContentLink, folderColorRgb, videoMediaMetadata, imageMediaMetadata, viewedByMeTime, sharedWithMeTime, modifiedTime, description, fullFileExtension)",
                });
                for (let file of files) {
                    await this.drive.files.delete({
                        auth: await tokenManager.get_auth_token(driveId),
                        fileId: file?.id as string,
                    });
                }

                await prisma.drive.update({
                    where: { serviceId: driveId },
                    data: {
                        usage: 0,
                    }
                })
                print(`All files in drive: ${driveId} have been deleted successfully.`, 'green', undefined, 'info');
                return true
            } catch (error) {
                print(`Error in getting the files of the drive ${(error as Error).message}`, 'red', undefined, 'error')
                throw new Error(`Failed to get files of the drive: ${(error as Error).message}`);

            }
        })
    }

    /**
     * Fetches all posts for the current user by retrieving their metadata from Google Drive.
     * 
     * This function performs the following:
     * 1. Retrieves the {@link getCurrentUser|current user}.
     * 2. Fetches all posts associated with the user from a local data store ({@link Post}).
     * 3. Retrieves Google Drive file metadata for each post based on its `driveId`.
     * 4. Filters and returns only the files matching the post IDs.
     *
     * **Note**: The function minimizes redundant API calls by reusing {@link getCredentials|Credentials} for the same `driveId`.
     *
     * @returns {Promise<drive_v3.Schema$File[]>} - A promise that resolves to an array of Google Drive file metadata associated with the user's posts.
     * @throws Will throw an error if any operation in the process fails.
     *
     * ### Example Usage:
     * ```typescript
     * try {
     *     const posts = await allPost();
     *     console.log("Fetched posts:", posts);
     * } catch (error) {
     *     console.error("Failed to fetch posts:", error);
     * }
     * ```
     *
     * ### Explanation:
     * - **Step 1**: Retrieves the user details using {@link getCurrentUser|getCurrentUser()}.
     * - **Step 2**: Fetches all posts linked to the user. Each post contains an `id` and `driveId`.
     * - **Step 3**: Uses Google Drive API to fetch metadata for files associated with the `driveId` of each post.
     * - **Step 4**: Filters the files to include only those matching the `id` from the posts.
    */
    list = async (
        token: string,
        parentId?: string
    ): Promise<drive_v3.Schema$File[]> => {
        return this.loadManager.addTask(async () => {
            try {
                // Verify token and fetch posts related to the user.
                const data = await this.loadManager.addTask(
                    async () => await TokenManager.verifyToken(token)
                );
                const posts = (
                    await this.loadManager.addTask(async () =>
                        prisma.post.findMany({
                            where: { userId: data?.userId! },
                            include: { user: true },
                        })
                    )
                )

                const current_user = await tokenManager.getUserProfile()

                const isNotCacheExpire = await redisClient.get(`drive:${current_user?.username}${parentId || ''}`);
                if (isNotCacheExpire) {
                    // await redisClient.del(`drive:${current_user?.username}${parentId || ''}`);
                    print(`Cache data has been used.`, 'yellow', undefined, 'warn')
                    const postsMap = new Map();
                    posts.forEach((post) => {
                        postsMap.set(post.id, post);
                    });
                    // Recursive function to find the root parent id for a given post
                    function findRootParent(post: drive_v3.Schema$File) {
                        // If there is no parent in the post, this post itself is the root.
                        if (!post.parents || post.parents.length === 0) {
                            return post.id;
                        }
                        // Here, we assume the immediate parent is the last element in the parents array.
                        const parentId = post.parents[post.parents.length - 1];

                        // If the parent is not found in our posts list, return the parentId as the root.
                        if (!postsMap.has(parentId)) {
                            return parentId;
                        }

                        // If found, recursively continue to search for its root parent.
                        const parentPost = postsMap.get(parentId);
                        return findRootParent(parentPost);
                    }
                    // Create a set to store unique root parent ids that exist in the posts list.
                    const rootParentIds = new Set();
                    posts.forEach((post) => {
                        const rootId = parentId ? parentId : findRootParent(convertBigIntToString(post));
                        // Add the rootId to the set regardless of whether it exists in postsMap
                        rootParentIds.add(rootId);
                    });

                    const rootPosts = posts.filter((post) => {
                        if (!post.parents || post.parents.length === 0) return false;

                        // Check if any of the post's parents are in rootParentIds
                        return post.parents.some(parentId => rootParentIds.has(parentId));
                    });

                    return convertBigIntToString(rootPosts) as drive_v3.Schema$File[];
                }

                await redisClient.set(`drive:${current_user?.username}${parentId || ''}`, 1, 'EX', 1800); // for 30 minutes

                if (!posts || posts.length === 0) {
                    print("No posts available.", "yellow");
                    return [];
                }

                let existingCred: { driveId?: string } = {};
                const filteredFiles: drive_v3.Schema$File[] = [];
                let rootId = parentId ?? ''

                // Loop through posts to list files from each associated drive.
                for (const { driveId } of posts) {
                    const matchedFiles: drive_v3.Schema$File[] = [];
                    if (existingCred.driveId !== driveId) {
                        existingCred.driveId = driveId!;

                        // Build the options for the drive.files.list() call.
                        const listOptions: any = {
                            auth: await this.loadManager.addTask(
                                async () => await tokenManager.get_auth_token(existingCred.driveId)
                            ),
                            fields:
                                "files(id, name, mimeType, contentHints, size, parents, thumbnailLink, webViewLink, webContentLink, folderColorRgb, videoMediaMetadata, imageMediaMetadata, viewedByMeTime, sharedWithMeTime, modifiedTime, description, fullFileExtension)",
                        };

                        if (!rootId && rootId !== parentId) {
                            const { data: { id: rootID } } = await this.drive.files.get({
                                fileId: 'root',
                                auth: await this.loadManager.addTask(
                                    async () => await tokenManager.get_auth_token(existingCred.driveId)
                                ),
                            })
                            rootId = rootID!
                        }

                        // If a parentId is provided, filter the files by that parent.
                        if (parentId || rootId) {
                            listOptions.q = `'${parentId ?? rootId}' in parents`;
                        }
                        // console.log(parentId, rootId)

                        const { data: { files = [] } = {} } = await this.drive.files.list(
                            listOptions
                        );

                        const modifiedFiles = files.map(file => ({
                            ...file,
                            thumbnailLink: `http://localhost:5000/api/storage/${file.thumbnailLink?.split('https://lh3.googleusercontent.com/drive-storage/')[1].replace(/=s220$/, "")}`
                        }));


                        // console.log(modifiedFiles)

                        // If parentId was provided, simply use the returned files.
                        // Otherwise, filter files matching the post ids.
                        if (parentId) {
                            matchedFiles.push(...files);
                        } else {
                            matchedFiles.push(
                                ...files.filter((file) =>
                                    posts.some((post: any) => post.id === file.id)
                                ) as drive_v3.Schema$File[]
                            );
                        }
                        rootId = ''
                    }
                    filteredFiles.push(...matchedFiles);
                }

                if (parentId) {
                    print(
                        `Fetched ${filteredFiles.length} files from parent folder ${parentId}.`,
                        "green"
                    );
                } else {
                    print(
                        `Fetched ${filteredFiles.length} files related to posts.`,
                        "green"
                    );
                }
                for (const file of filteredFiles) {
                    await prisma.post.update({
                        where: { id: file.id! }, // Ensure `id` exists in your DB
                        data: {
                            mimeType: file.mimeType!,
                            parents: file.parents!,
                            webViewLink: file.webViewLink,
                            name: file.name,
                            modifiedTime: file.modifiedTime,
                            thumbnailLink: file?.thumbnailLink,
                            videoMediaMetadata: file.videoMediaMetadata!,
                            webContentLink: file.webContentLink,
                        }
                    });
                }
                // console.log(filteredFiles)
                return filteredFiles;
            } catch (error) {
                print(`Error in allPost: ${(error as Error).message}`, "red");
                throw new Error(`Error in allPost: ${(error as Error).message}`);
            }
        });
    };


    async getParentChain(
        fileId: string,
        chain: Array<{ index: number; id: string; name: string }> = [],
        isParent: boolean = false
    ): Promise<Array<{ index: number; id: string; name: string }>> {
        // Fetch the current file's record with only needed fields.
        const file = await prisma.post.findUnique({
            where: { id: fileId },
            select: { id: true, name: true, parents: true },
        });

        // If the file is not found and this is a recursive call, assume we've reached the root.
        if (!file) {
            if (isParent) {
                chain.push({ index: chain.length, id: fileId, name: "root" });
                return chain;
            }
            throw new Error(`File with id ${fileId} not found`);
        }

        // Always add the file to the chain.
        chain.push({ index: chain.length, id: file.id, name: file.name ?? "" });

        // If there are no parents, we've reached the root.
        if (!file.parents || file.parents.length === 0) {
            return chain;
        } else {
            // Recursively call getParentChain using the first parent's id.
            return await this.getParentChain(file.parents[0], chain, true);
        }
    }



}

export const postManager = new PostManager() 