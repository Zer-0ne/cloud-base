import { print } from "@/utils/color-print";
import crypto from 'crypto';
import { GoogleService } from "./google-service";
import { prisma } from "@/prisma.config";
import { tokenManager } from "./token-manager";
import { redisClient } from "@/redis.config";
import { convertToBytes, formatBytes } from "@/utils/constant";
export class ApiManager {
    private userId: string;
    private name: string;
    private google = new GoogleService()

    constructor(userId: string, name?: string) {
        this.userId = userId;
        this.name = name || crypto.randomBytes(8).toString('base64url');
    }


    /**
     * This is the method to generate a key, allot the available drive to that key, and return the JWT token to the user.
     * 
     * 1. Retrieve all users and identify the current session user using {@link userId|Current User ID}.
     * 2. Get the existing key of the current user {@link userId|Current User ID} from the database using {@link User} model.
     * 3. Generate a new API key for the user from this method {@link crypto.randomBytes|Random Bytes} of 64 Bytes.
     * 4. Update the key array after creating the key using {@link User.update|Update Current User}.
     * 5. Return the JWT token to the user using {@link TokenManager|JWT Token Manager}.
     * 
     * @returns {Promise<string>} - JWT Token {@link TokenManager.createToken|Create JWT Token}.
     */
    async generateKey(): Promise<string | undefined> {
        const { loadManager } = await import('./load-manager');
        return loadManager.addTask(async () => {
            try {
                // Fetch the user based on the username (this.userId)
                const user = await prisma.user.findUnique({
                    where: { username: this.userId },
                    include: { apiKeys: true, drives: true },
                });

                if (!user) throw new Error(`${this.userId} not found.`);

                // Generate a new API key (64-byte hex string)
                const key = crypto.randomBytes(64).toString('hex');

                // Create a new API key entry in the database
                const projectId = await this.google.get_project_id();
                const newApiKey = await prisma.api_key.create({
                    data: {
                        accessKey: key,
                        name: this.name,
                        userId: this.userId,
                        projectId: projectId!
                    },
                });

                try {
                    // Fetch drives for the user from the Google service
                    const drives = await this.google.assignDriveToApiKey(newApiKey.limit);

                    // Assign drives to the API key
                    for (const drive of drives) {
                        const existingDrive = await prisma.drive.findUnique({
                            where: { serviceId: drive.driveId },
                        });

                        if (!existingDrive) {
                            await prisma.drive.create({
                                data: {
                                    serviceId: drive.driveId,
                                    limit: drive.allocatedSpace,
                                    alloted: true,
                                },
                            });
                        }

                        await prisma.driveKey.create({
                            data: {
                                allocatedSpace: Number(drive.allocatedSpace),
                                driveId: drive.driveId,
                                Api_key: { connect: { id: newApiKey.id } },
                            },
                        });
                    }

                    console.log(`Access Key for ${this.userId} has been created!`);

                    // Create and return a JWT token using the newly created API key
                    const { TokenManager } = await import('./jwt-token-manager');
                    return TokenManager.createToken({
                        userId: this.userId,
                        accessKey: key,
                        name: this.name,
                    });
                } catch (driveError) {
                    // If an error occurs while assigning drives, delete the newly created API key
                    console.error(`Error assigning drives: ${(driveError as Error).message}`);

                    await prisma.api_key.delete({ where: { id: newApiKey.id } });

                    throw new Error(`Drive assignment failed. API Key rolled back.`);
                }
            } catch (error) {
                console.error(`Error in creating Key :: ${(error as Error).message}`);
                throw error;
            }
        });
    }





    /**
     * This method verifies whether the provided API key is valid.
     * 
     * The verification process includes the following steps:
     * 1. Retrieve all users and identify the current session user using {@link userId|Current User ID}.
     * 2. Obtain the keys associated with the user.
     * 3. Check if the specified key is present in the user's keys.
     * 
     * @param {string} accessKey - The API key to be verified. This key is obtained after decrypting the JWT token.
     * @returns {boolean} - Returns true if the access key is valid; otherwise, returns false.
     */
    verifyKey = async (accessKey: string): Promise<boolean> => {
        const { loadManager } = await import('./load-manager')
        return loadManager.addTask(async () => {
            try {
                // const { User } = await import('./Models/userSchema');
                const user = await prisma.user.findUnique({
                    where: { username: this.userId },
                    include: { apiKeys: true, drives: true }
                });
                if (!user) throw new Error(`${this.userId} not found.`);
                const keys = user.apiKeys.map(item => item.accessKey) as string[];
                if (!keys.includes(accessKey)) throw new Error(`Access Key ${accessKey} is invalid`)
                return true
            } catch (error) {
                print(`Your are not Authorized!`, 'red')
                throw error
            }
        })
    }

    /**
     * This method allocates additional storage space to a specified API key.
     * 
     * The process involves the following steps:
     * 1. Verify the validity of the provided API key using {@link verifyKey|Verify Method}.
     * 2. Retrieve all available API keys from the data source using {@link apiKey.getAll|GET All API Key}.
     * 3. If the key is valid and exists in the retrieved data, proceed to:
     * 4. Assign the specified storage space to the corresponding API key using {@link GoogleService.assignDriveToApiKey|Assign Drive}.
     * 
     * @param {string} accessKey - The API key for which you want to allocate drive storage. This key is obtained after decrypting the JWT token.
     * @param {number} space - The total amount of storage space to be allocated (in bytes) to the API key.
     * @returns {Promise} - Updates the key data and returns the result from {@link apiKey.update|Update Current User}.
     * @throws {Error} - Throws an error if the access key is invalid or if an error occurs during the process.
     */

    increaseDriveStorage = async (accessKey: string, space: number): Promise<void> => {
        const { loadManager } = await import('./load-manager')
        return loadManager.addTask(async () => {
            try {
                await this.verifyKey(accessKey);
                const allKey = await prisma.api_key.findMany({ include: { drives: true } });
                const index = allKey.findIndex((item) => item.accessKey === accessKey);
                if (index === -1) throw new Error(`Access Key ${accessKey} is invalid`);
                allKey[index].limit = BigInt(space)
                const drives = allKey[index].drives;
                const totalAllocatedSpace = drives?.reduce((total, drive) => {
                    return total + Number((drive as unknown as {
                        driveId: string;
                        allocatedSpace: string
                    })?.allocatedSpace as string);
                }, 0);
                const addOnSpace = space - totalAllocatedSpace
                if (!(await redisClient.get("storage_limit"))) {
                    throw new Error("Storage limit not found. Please contact the administrator to set the allocated space limit for the API.");
                }
                const max_allocated_space = convertToBytes(`${(await redisClient.get("storage_limit"))!} GB`)!
                if (space > max_allocated_space) throw new Error(`You have exceeded the maximum allowed allocated space of ${formatBytes(max_allocated_space)}`)

                const drive = await this.google.assignDriveToApiKey(BigInt(addOnSpace))
                for (const allocation of drive) {
                    await prisma.drive.upsert({
                        where: { serviceId: allocation.driveId },
                        update: {
                        },
                        create: {
                            serviceId: allocation.driveId,
                            limit: BigInt(allocation.allocatedSpace),
                        }
                    });
                }
                await prisma.api_key.update({
                    where: { id: allKey[index]?.id },
                    data: {
                        limit: space,
                        drives: {
                            create: drive
                        }
                    }
                })
            } catch (error) {
                throw (error as Error).message
            }
        })
    }

    /**
     * This method reduces the allocated storage space for a specified API key.
     *
     * The process involves the following steps:
     * 1. Verify the validity of the provided API key using {@link verifyKey|Verify Method}.
     * 2. Retrieve all available API keys from the data source using {@link apiKey.getAll|GET All API Key}.
     * 3. If the key is valid and exists in the retrieved data, proceed to:
     * 4. Remove the specified storage space from the corresponding API key using {@link GoogleService.removeDriveFromApiKey|Remove Drive}.
     *
     * @param {string} accessKey - The API key from which you want to reduce drive storage. This key is obtained after decrypting the JWT token.
     * @param {number} space - The amount of storage space to be reduced (in bytes) from the API key.
     * @returns {Promise} - Updates the key data and returns the result from {@link apiKey.update|Update Current User}.
     * @throws {Error} - Throws an error if the access key is invalid, if requested reduction exceeds available space, or if an error occurs during the process.
     */
    decreaseDriveStorage = async (accessKey: string, space: number): Promise<void> => {
        const { loadManager } = await import('./load-manager')
        return loadManager.addTask(async () => {
            try {
                // Verify the access key
                await this.verifyKey(accessKey);

                // Find the API key by its accessKey
                const apiKey = await prisma.api_key.findUnique({
                    where: {
                        accessKey: accessKey, // Searching the Api_key by accessKey
                    },
                    include: {
                        drives: true, // Including related drives
                    },
                });

                if (!apiKey) {
                    throw new Error(`Access Key ${accessKey} is invalid`);
                }

                const drives = apiKey.drives;
                const totalAllocatedSpace = drives?.reduce((total, drive) => {
                    return total + (Number(drive.allocatedSpace) || 0); // Calculate the total allocated space
                }, 0);

                // Check if requested reduction doesn't exceed current allocation
                if (space > totalAllocatedSpace) {
                    throw new Error(`Cannot decrease storage by ${space} bytes. Current allocated space is ${totalAllocatedSpace} bytes`);
                }

                // Calculate the new allocated space
                // const newAllocatedSpace = totalAllocatedSpace - space;
                // console.log(totalAllocatedSpace, space)

                // Assuming `this.google.removeDriveFromApiKey()` removes the specified space from the drives
                await this.google.removeDriveFromApiKey(apiKey.accessKey, space);

                // Update the API key with new drive configuration and allocated space
                await prisma.api_key.update({
                    where: {
                        id: apiKey.id, // Use the unique ID of the apiKey
                    },
                    data: {
                        limit: BigInt(space), // Update the limit with the new allocated space
                    },
                });
            } catch (error) {
                throw (error as Error).message;
            }
        });
    }

    /**
     * Deletes posts associated with the provided access key and subsequently deletes the API key.
     * 
     * This function performs the following steps:
     * 1. **Verifies the provided access key**: Ensures that the access key is valid and associated with the current user using {@link verifyKey}.
     * 2. **Fetches the posts associated with the provided access key**: Retrieves all posts for the user and filters them based on the drive IDs linked to the access key using {@link Post}.
     * 3. **Filters posts based on the drive IDs associated with the access key**: Only posts that match the drive IDs will be considered for deletion.
     * 4. **Deletes each post with a retry mechanism for handling failures**: If a deletion fails, the function will retry up to a specified number of attempts before giving up, using a helper function {@link deletePost}.
     * 5. **Deletes the API key once all posts have been processed**: After all relevant posts are deleted, the associated API key is removed from the system using {@link apiKey.delete}.
     * 
     * @param {string} accessKey - The access key used to fetch posts associated with the drive IDs. This key must be valid and linked to the user making the request.
     * 
     * @throws {Error} Throws an error if the access key is invalid, if no posts are found for the user, or if any deletion fails after the maximum number of attempts.
     * 
     * @returns {Promise<string>} A message indicating the successful deletion of the API key.
     * 
     * @example
     * const apiManager = new ApiManager(userId);
     * try {
     *     const result = await apiManager.delete('your-access-key-here');
     *     console.log(result); // Output: "API Key your-access-key-here deleted successfully."
     * } catch (error) {
     *     console.error(`Failed to delete API key: ${error.message}`);
     * }
     */
    delete = async (accessKey: string): Promise<string> => {
        const { loadManager } = await import('./load-manager');
        return loadManager.addTask(async () => {
            try {
                // Verify the API key is valid
                await this.verifyKey(accessKey);

                // Fetch the API key with the related drives
                const key = await prisma.api_key.findUnique({
                    where: { accessKey },
                    include: { drives: true }
                });
                if (!key) throw new Error(`Access Key ${accessKey} is invalid`);

                // Fetch user and related drives
                const user = await prisma.user.findUnique({
                    where: { username: this.userId },
                    include: { drives: true, apiKeys: true } // Include related drives and apiKeys
                });

                // Extract drive IDs from the key
                const drives = key.drives.map(drive => drive.driveId);
                for (let driveId of drives) {
                    await prisma.drive.update({
                        where: { serviceId: driveId },
                        data: { alloted: false }
                    })
                }

                // Fetch posts associated with the user's drives
                const postsToDelete = await prisma.post.findMany({
                    where: {
                        userId: this.userId,
                        driveId: { in: drives }
                    }
                });

                // If no posts found for deletion, log a message and proceed with deletion
                if (postsToDelete.length === 0) {
                    print(`No posts found for user ${this.userId}. Continuing with key deletion.`, 'yellow', undefined, 'warn');
                }

                // Delete posts with retry logic
                const maxAttempts = 3;
                const deletePost = async (id: string) => {
                    let attempts = 0;
                    let deleted = false;
                    while (attempts < maxAttempts && !deleted) {
                        try {
                            const { PostManager } = await import('@/lib/post-manager');
                            const postManager = new PostManager();
                            const { TokenManager } = await import('@/lib/jwt-token-manager');
                            await postManager.deleteUserFile(id, [await TokenManager.createToken({
                                name: '',
                                userId: this.userId,
                                accessKey: accessKey,
                            }) as string]);
                            print(`Successfully deleted post with ID ${id}`, 'green');
                            deleted = true;
                        } catch (deleteError) {
                            attempts++;
                            print(`Error deleting post with ID ${id}: ${(deleteError as Error).message}`, 'red');
                            if (attempts < maxAttempts) {
                                print(`Retrying to delete post with ID ${id} (Attempt ${attempts + 1}/${maxAttempts})...`, 'yellow');
                            } else {
                                print(`Failed to delete post with ID ${id} after ${maxAttempts} attempts.`, 'red');
                            }
                        }
                    }
                };

                // Delete posts in parallel with retry logic
                if (postsToDelete.length > 0) {
                    await Promise.all(postsToDelete.map(post => deletePost(post.id)));
                }

                // Delete all DriveKeys associated with the API key first
                await prisma.driveKey.deleteMany({
                    where: {
                        Api_key: {
                            some: {
                                id: key.id  // Use the API key's id instead of accessKey
                            }
                        }
                    }
                });

                // Then delete the API key
                await prisma.api_key.delete({
                    where: { id: key.id }
                });

                // Remove the access key from the user
                await prisma.user.update({
                    where: { id: user?.id },
                    data: {
                        keys: {
                            set: user?.keys.filter(key => key !== accessKey)
                        }
                    }
                });


                print(`API Key ${accessKey} deleted successfully.`, 'green');
                return `API Key ${accessKey} deleted successfully.`;
            } catch (error) {
                print(`Error in delete operation: ${(error as Error).message}`, 'red');
                throw error;
            }
        });
    };

}