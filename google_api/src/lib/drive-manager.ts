import { print } from "@/utils/color-print";
import { GoogleService } from "./google-service";
import { TokenManager } from "./jwt-token-manager";
import { prisma } from "@/prisma.config";

export class DriveManager extends GoogleService {
    /**
     * Creates service accounts and their associated keys based on the remaining quota for the project.
     * 
     * This function first retrieves the {@link LimitOfAccount|limit} of service accounts allowed for the project. It then calculates
     * the number of remaining service accounts that can be created. If there are remaining accounts, it creates {@link createServiceAccount}
     * them one by one, introducing a delay between each creation to comply with API rate limits. Each service
     * account is created along with its key, and any errors during the creation process are logged without
     * interrupting the creation of subsequent accounts.
     * 
     * @returns {Promise<boolean>} - Returns true if all drives are created successfully.
     * 
     * @throws {Error} - Throws an error if there is an issue retrieving the account limit or during the creation
     *                   of service accounts or keys.
     * 
     * @example
     * createAllDrives()
     *     .then(() => console.log('All drives created successfully!'))
     *     .catch(err => console.error('Error:', err));
     */
    createAllDrives = async (): Promise<boolean> => {
        try {
            const limit = await this.LimitOfAccount('iam');

            // Calculate remaining service accounts to create
            const activeDrive = await this.ListServiceAccount();
            const remainingDrive = activeDrive
                ? parseInt(limit?.find(limit => limit.name === 'ServiceAccountsPerProject')?.values?.DEFAULT || "0") - (activeDrive?.accounts?.length || 0)
                : 0;
            if (remainingDrive < 1) {
                print('All Drive Already Exist!', 'cyan')
            }
            if (remainingDrive > 0) {
                print(`Remaining Drives to Create: ${remainingDrive}`);

                // Create an array of promises for each service account creation
                const promises = Array.from({ length: remainingDrive }, (_, index) =>
                    new Promise<void>(resolve => {
                        setTimeout(async () => {
                            try {
                                const serviceAccount = await this.createServiceAccount();

                                // Introduce a delay before creating the service account key
                                await new Promise(res => setTimeout(res, 3000)); // 3 seconds delay

                                await this.createServiceAccountKey(serviceAccount?.email as string);
                                // print(`Service Account Created: ${serviceAccount?.email}`,'green');
                                resolve(); // Resolve the promise when the operation is completed
                            } catch (error) {
                                print(`Error in creating service account: ${(error as Error).message}`, 'red');
                                resolve(); // Resolve even on error to continue other operations
                            }
                        }, index * 25000); // 1-minute delay for each account creation
                    })
                );

                // Wait for all promises to resolve
                await Promise.all(promises);
            }

            print('All Drives Created Successfully!');
            return true;
        } catch (error) {
            print('Something went wrong while creating all drives', 'red');
            throw error;
        }
    };

    deletAllDrives = async () => {
        const errors: string[] = []; // Array to collect error messages

        try {
            const allKey = await prisma.key.findMany({
                where: {
                    serviceId: {
                        not: "admin-cloud@admin-cloud-storage.iam.gserviceaccount.com"
                    }
                }
            });

            if (allKey.length < 1) throw new Error('No Drives Available');

            // Create an array of promises for each service account deletion
            const promises = allKey?.map((currentkey, index) =>
                new Promise<void>(async (resolve) => {
                    setTimeout(async () => {
                        try {
                            const data = await this.deletServiceAccount(currentkey?.serviceId! as string);
                            if (!data) throw new Error('Failed to delete service account');

                            // Introduce a delay before deleting the key
                            await new Promise(res => setTimeout(res, 3000)); // 3 seconds delay
                            await prisma.drive.delete({
                                where: { serviceId: currentkey.serviceId }
                            });
                            // await prisma.key.delete({ where: { serviceId: currentKey.serviceId } });
                            print(`Key Deleted: ${currentkey.serviceId}`, 'green');
                        } catch (error) {
                            const errorMessage = `Error in deleting service account ${currentkey?.serviceId}: ${(error as Error).message}`;
                            print(errorMessage, 'red');
                            errors.push(errorMessage); // Collect error messages
                        } finally {
                            resolve(); // Resolve the promise when the operation is completed
                        }
                    }, index * 25000); // 25 seconds delay for each account deletion
                })
            );

            // Wait for all promises to resolve
            await Promise.all(promises);

            if (errors.length > 0) {
                print('Some errors occurred during deletion:', 'yellow');
                errors.forEach(err => print(err, 'red'));
            } else {
                print('All Drives Deleted Successfully!', 'green');
            }
        } catch (error) {
            print('Error retrieving keys or during deletion process:', 'red');
            print((error as Error).message, 'red');
            throw error; // Rethrow the error for further handling if needed
        }
    }



    getallocatedStorage = async () => {
        try {
            const allKey = (await prisma.api_key.findMany({
                include: {
                    drives: true
                }
            }));

            if (!allKey || allKey.length < 1) {
                throw new Error('No Drives Available');
            }

            // Use reduce to accumulate driveIds and totalAllocatedSpace
            const { driveIds, totalAllocatedSpace } = allKey.reduce((acc, item) => {
                item.drives?.forEach((drive) => {
                    acc.driveIds.push(drive.driveId!);
                    acc.totalAllocatedSpace += Number(drive.allocatedSpace);
                });
                return acc;
            }, { driveIds: [] as string[], totalAllocatedSpace: 0 });

            return { driveIds, totalAllocatedSpace };

        } catch (error) {
            print('Error retrieving keys or during deletion process:', 'red', undefined, 'error');
            print((error as Error).message, 'red', undefined, 'error');
            throw error; // Rethrow the error for further handling if needed
        }
    };


    getAllocatedStorageForApi = async (token: string) => {
        try {
            const { accessKey } = await TokenManager.verifyToken(token);

            const allKey = (await prisma.api_key.findUnique({
                where: { accessKey },
                include: {
                    drives: true
                }
            }));

            if (!allKey) {
                throw new Error('No Api Key Available');
            }

            // Use reduce to accumulate driveIds and totalAllocatedSpace
            const { totalUsage, limit, drives } = allKey

            return { usage: totalUsage, limit, drives };

        } catch (error) {
            print('Error retrieving keys or during deletion process:', 'red', undefined, 'error');
            print((error as Error).message, 'red', undefined, 'error');
        }
    };

}