import { convertToBytes, DateRFC3339, generateCustomId } from "@/utils/algo";
import { print } from "@/utils/color-print";
import { EncryptedData, ListFiles } from "@/utils/Interfaces";
// import { auth } from "@root/google.config";
import { drive_v3, google, iam_v1, serviceusage_v1 } from "googleapis";
import crypto, { randomUUID } from 'crypto'
import { ExternalAccountClientOptions, gaxios, JWTInput, OAuth2Client } from 'google-auth-library';
import { CryptoService } from "./encryption";
import { loadManager } from "./load-manager";
import { prisma } from "@/prisma.config";
import { localStorage } from "./local-storage-manager";
import { tokenManager } from "./token-manager";
import { redisClient } from "@/redis.config";

export class GoogleService {
    public projectId: string | undefined = undefined;
    protected loadManager = loadManager;
    private readonly iam = google.iam("v1");
    private readonly enable_api = [
        'cloudresourcemanager.googleapis.com', // Cloud Resource Manager API
        // 'compute.googleapis.com',              // Compute Engine API
        'admin.googleapis.com',                // Admin SDK API
        'servicemanagement.googleapis.com',    // Service Management API
        'servicecontrol.googleapis.com',       // Service Control API
        'people.googleapis.com',               // People API
        'drive.googleapis.com',                // Google Drive API
        'iam.googleapis.com',                   // Identity and Access Management (IAM) API
        'iamcredentials.googleapis.com'
    ]
    protected readonly drive = google.drive("v3");
    protected readonly driveScopes = ["https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.appdata",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.meet.readonly",
        "https://www.googleapis.com/auth/drive.metadata",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/drive.photos.readonly",
        "https://www.googleapis.com/auth/drive.readonly"]

    constructor() {
        tokenManager.getUserInfo()
            .then(userInfo => {
                this.projectId = generateCustomId(userInfo?.id!, false);
            })
            .catch(error => {
                console.error("Error generating projectId: ", error.message);
            });
    }

    get_project_id = async () => {
        return generateCustomId((await tokenManager.getUserInfo())?.id!, false)
    }

    enable_required_api = async () => {
        try {
            const auth = await tokenManager.get_auth_token();
            const apiHandler = google.serviceusage('v1');
            const projectId: string = generateCustomId((await tokenManager.getUserInfo())?.id!, false)
            // List services with proper filter and fields
            const { data } = await apiHandler.services.list({
                parent: `projects/${projectId}`,
                filter: 'state:ENABLED',  // Only get ENABLED services
                fields: 'services.name,services.state', // Only get required fields
                pageSize: 200, // Get more services per page
                auth
            });

            // Better logging for debugging
            console.log('Currently enabled services:', data.services?.map(s => s.name));

            // Improve how we check enabled services
            const enabledServices = new Set(
                data.services?.map(service => {
                    const parts = service.name?.split('/');
                    return parts?.[parts.length - 1]; // Get last part of service name
                }) || []
            );

            // Better logging of what we're checking
            console.log('Services we need to enable:', this.enable_api);
            console.log('Already enabled services:', Array.from(enabledServices));

            for (const api of this.enable_api) {
                const isEnabled = enabledServices.has(api);
                console.log(`Checking ${api} - Currently enabled: ${isEnabled}`);

                if (!isEnabled) {
                    console.log(`Enabling API: ${api}`);
                    await apiHandler.services.enable({
                        name: `projects/${this.projectId}/services/${api}`,
                        auth
                    });

                    // Wait for the API to be fully enabled
                    await this.waitForApiEnabled(apiHandler, auth, api);
                } else {
                    console.log(`API ${api} is already enabled, skipping...`);
                }
            }
            this.grantNeccessaryRoles()
        } catch (error) {
            console.error('Error enabling required APIs:', error);
            throw error;
        }
    };

    async grantNeccessaryRoles() {
        try {
            // Authenticate and initialize the API client
            const auth = await tokenManager.get_auth_token();
            const user = await tokenManager.getUserProfile();

            const cloudResourceManager = google.cloudresourcemanager('v1');

            // Get the current IAM policy for the project
            const getPolicyResponse = await cloudResourceManager.projects.getIamPolicy({
                resource: this.projectId, // FIX: Use projectId instead of user.email
                auth
            });

            let policy = getPolicyResponse.data;

            if (!policy.bindings) {
                policy.bindings = [];
            }

            // Define roles to be granted
            const rolesToGrant = [
                { role: 'roles/owner', member: `user:${user.email}` },
                { role: 'roles/iam.serviceAccountTokenCreator', member: `user:${user.email}` }, // FIX: Grant impersonation role
                { role: 'roles/iam.serviceAccountUser', member: `user:${user.email}` }
            ];

            let policyUpdated = false;

            for (const { role, member } of rolesToGrant) {
                let binding = policy.bindings.find(b => b.role === role);
                if (binding) {
                    if (!binding.members?.includes(member)) {
                        binding.members?.push(member);
                        policyUpdated = true;
                    }
                } else {
                    policy.bindings.push({ role, members: [member] });
                    policyUpdated = true;
                }
            }

            if (!policyUpdated) {
                console.log(`User ${user.email} already has the necessary roles.`);
                return;
            }

            // Set the updated IAM policy
            await cloudResourceManager.projects.setIamPolicy({
                resource: this.projectId,
                requestBody: { policy },
                auth
            });

            console.log(`Granted necessary roles to ${user.email} in project ${this.projectId}.`);

        } catch (error) {
            console.error('Error granting roles:', error);
        }
    }



    // Add helper method to wait for API to be fully enabled
    private async waitForApiEnabled(
        apiHandler: any,
        auth: any,
        api: string,
        maxAttempts = 10
    ): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            const { data: serviceData } = await apiHandler.services.get({
                name: `projects/${this.projectId}/services/${api}`,
                auth
            });

            if (serviceData.state === 'ENABLED') {
                console.log(`API ${api} is now fully enabled`);
                return;
            }

            console.log(`Waiting for API ${api} to be fully enabled... Attempt ${i + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
        }

        throw new Error(`Timeout waiting for API ${api} to be enabled`);
    }


    /**
     * This function creates a key for a Google Cloud service account.
     * 
     * Steps:
     * 1. Import the user schema model.
     * 2. Call the Google IAM API to create a service account key.
     * 3. Decode the private key data from the response.
     * 4. Encrypt the decoded private key data through {@link CryptoService.encryptData|Encrypt Data}.
     * 5. Store the encrypted key data in the database {@link key|Key}.
     * 
     * @param {string} serviceAccountId - The unique ID of the service account.
     * @returns {Promise<Record<string, any> | undefined>} - Returns the result of storing the encrypted credentials or throws an error if the operation fails.
     * 
     * @throws {Error} - Throws an error if the key creation fails.
     * 
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/create - Google Cloud IAM API documentation for creating service account keys.
     * @ref https://cloud.google.com/iam/docs/service-accounts - Overview of Google Cloud service accounts.
     * @ref https://cloud.google.com/iam/docs/creating-managing-service-account-keys - Guide on creating and managing service account keys.
     * 
     * @example
     * const serviceAccountId = 'your-service-account-id@your-project.iam.gserviceaccount.com';
     * createServiceAccountKey(serviceAccountId)
     *     .then(result => console.log('Key created:', result))
     *     .catch(err => console.error('Error:', err));
     */
    createServiceAccountKey = async (serviceAccountId: string): Promise<Record<string, any> | undefined> => {
        type ServiceAccountPrivateKeyType = 'TYPE_GOOGLE_CREDENTIALS_FILE' | 'TYPE_PKCS12_FILE' | 'TYPE_UNSPECIFIED'
        type ServiceAccountKeyAlgorithm = 'KEY_ALG_UNSPECIFIED' | 'KEY_ALG_RSA_1024' | 'KEY_ALG_RSA_2048'
        try {
            const { data: credentials } = await this.iam.projects.serviceAccounts.keys.create({
                name: `projects/-/serviceAccounts/${serviceAccountId}`,
                requestBody: {
                    privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' as ServiceAccountPrivateKeyType, // Specify the type of key
                },
                auth: await tokenManager.get_auth_token(),
            })
            const decodedPrivateKey: JWTInput = JSON.parse(
                credentials && Buffer.from(credentials?.privateKeyData as string, 'base64').toString('utf-8')
            );
            print(`Authentication key for the service account ${serviceAccountId} has been successfully created.`, 'green');
            // Encrypt the decoded key data
            const { encrypted, iv, authTag } = await CryptoService.encryptData(JSON.stringify(decodedPrivateKey));

            return await prisma.key.create({
                data: {
                    encrypted, iv, authTag,
                    serviceId: serviceAccountId,
                }

            })
        } catch (error) {
            print('Error to create the key for service account' + (error as Error).message)
        }
    }


    /**
     * Fetches and decrypts the key associated with the specified service ID.
     * 
     * Steps:
     * 1. Import the user schema model.
     * 2. Retrieve all encrypted keys from the database.
     * 3. Check if any keys are found; if not, throw an error.
     * 4. Find the key that matches the provided service ID.
     * 5. Decrypt the found key data {@link decryptKeyData|Decrypt Data}.
     * 
     * @param {string} serviceId - The unique ID of the service for which the key is being fetched.
     * @returns {Promise<JWTInput | ExternalAccountClientOptions | undefined>} - Returns the decrypted key data associated with the service ID, or undefined if not found.
     * 
     * @throws {Error} - Throws an error if no keys are found or if the decryption fails.
     * 
     * @example
     * const serviceId = 'your-service-id';
     * fetchKeyByServiceId(serviceId)
     *     .then(decryptedKey => console.log('Decrypted Key:', decryptedKey))
     *     .catch(err => console.error('Error:', err));
     */
    private fetchKeyByServiceId = async (serviceId: string): Promise<JWTInput | ExternalAccountClientOptions | undefined> => {
        return this.loadManager.addTask(async () => {
            try {
                // console.log(serviceId)

                const data = await prisma.key.findUnique({
                    where: {
                        serviceId
                    }
                });
                if (!data) {
                    throw new Error('No keys found in the file!');
                }
                return this.decryptKeyData(data as EncryptedData)
            } catch (error) {
                print(`Error fetching key: ${(error as Error).message}`, "red");
                throw error;
            }
        })
    }

    /**
     * Decrypts the provided encrypted key data using the specified initialization vector (IV) and authentication tag.
     * 
     * Steps:
     * 1. Extract the encrypted data, IV, and authentication tag from the input.
     * 2. Call the decryption service to decrypt the data {@link CryptoService.decryptData|Decrypt Data Crypto Service}.
     * 3. Parse the decrypted data from JSON format.
     * 
     * @param {EncryptedData} data - The encrypted data object containing the encrypted key, IV, and authentication tag.
     * @returns {Promise<JWTInput | ExternalAccountClientOptions | undefined>} - Returns the decrypted key data as a JavaScript object.
     * 
     * @throws {Error} - Throws an error if the decryption fails or if the data cannot be parsed.
     * 
     * @example
     * const encryptedData = {
     *     encrypted: 'encryptedString',
     *     iv: 'initializationVector',
     *     authTag: 'authenticationTag'
     * };
     * decryptKeyData(encryptedData)
     *     .then(decryptedKey => console.log('Decrypted Key:', decryptedKey))
     *     .catch(err => console.error('Error:', err));
     */
    private decryptKeyData = async (data: EncryptedData): Promise<JWTInput | ExternalAccountClientOptions | undefined> => {
        return this.loadManager.addTask(async () => {
            const { encrypted, iv, authTag } = data;
            try {
                const key = await CryptoService.decryptData(encrypted, iv, authTag);
                return JSON.parse(key)
            } catch (error) {
                print(`Error decrypting the data: ${(error as Error).message}`, "red");
                throw error;
            }
        })
    }


    /**
     * Retrieves a list of keys associated with the specified service account.
     * 
     * This function calls the Google IAM API to fetch all user-managed keys for the given service account.
     * 
     * @param {string} service - The unique ID of the service account (without the domain).
     * @returns {Promise<iam_v1.Schema$ServiceAccountKey[] | undefined>} - Returns an array of keys associated with the service account, or undefined if an error occurs.
     * 
     * @throws {Error} - Throws an error if the API call fails or if there is an issue retrieving the keys.
     * 
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/list - Google Cloud IAM API documentation for listing service account keys.
     * 
     * @example
     * const serviceAccountId = 'your-service-account-id';
     * getListOfKeys(serviceAccountId)
     *     .then(keys => console.log('Keys:', keys))
     *     .catch(err => console.error('Error:', err));
     */
    getListOfKeys = async (service: string): Promise<iam_v1.Schema$ServiceAccountKey[] | undefined> => {
        return this.loadManager.addTask(async () => {
            try {
                const { data: list } = await this.iam.projects.serviceAccounts.keys.list({
                    name: `projects/copycodecommunity/serviceAccounts/${service}@copycodecommunity.iam.gserviceaccount.com`,
                    keyTypes: ['USER_MANAGED'],
                    auth: await tokenManager.get_auth_token()
                })
                return list?.keys
            } catch (error) {
                print('error in listing the key ' + (error as Error).message)
                return

            }
        })
    }


    /**
     * Retrieves the public key of a specified service account.
     * 
     * This function calls the Google IAM API to fetch the public key associated with the given service account key name.
     * 
     * @param {string} name - The unique identifier of the service account key in the format: [uniqueid-service]@[project-name]/keys/[keyid].
     * @returns {Promise<iam_v1.Schema$ServiceAccountKey | undefined>} - Returns the public key of the specified service account, or undefined if an error occurs.
     * 
     * @throws {Error} - Throws an error if the API call fails or if there is an issue retrieving the key.
     * 
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/get - Google Cloud IAM API documentation for retrieving a service account key.
     * 
     * @example
     * const keyName = 'your-service-account-id@your-project.iam.gserviceaccount.com/keys/your-key-id';
     * getSpecificKey(keyName)
     *     .then(publicKey => console.log('Public Key:', publicKey))
     *     .catch(err => console.error('Error:', err));
     */
    getSpecificKey = async (name: string): Promise<iam_v1.Schema$ServiceAccountKey | undefined> => {
        return this.loadManager.addTask(async () => {
            try {
                // print(name)
                const { data } = await this.iam.projects.serviceAccounts.keys.get({
                    name: name as string,
                    publicKeyType: 'TYPE_X509_PEM_FILE',
                    auth: await tokenManager.get_auth_token()
                })
                return data;
            } catch (error) {
                print('error in getting  the key ' + (error as Error).message)
                return

            }
        })
    }

    /**
     * Retrieves the storage information of the Google Drive associated with the current service account.
     * 
     * This function calls the Google Drive API to fetch the storage quota details for the specified service account.
     * 
     * @param {string} [serviceId] - The optional unique identifier of the service account or Drive ID. If not provided, the default service account will be used.
     * @returns {Promise<drive_v3.Schema$About | undefined>} - Returns the storage quota information of the current service account, or null if an error occurs.
     * 
     * @throws {Error} - Throws an error if the API call fails or if there is an issue retrieving the storage information.
     * 
     * @ref https://developers.google.com/drive/api/reference/rest/v3/about/get?apix_params=%7B%22fields%22%3A%22storageQuota%22%7D - Google Drive API documentation for retrieving storage quota information.
     * 
     * @fields_of_storage - The field that contains the storage quota information.
     * 
     * @example
     * const serviceId = 'your-service-account-id';
     * getDriveQuotaByServiceId(serviceId)
     *     .then(storageInfo => console.log('Storage Info:', storageInfo))
     *     .catch(err => console.error('Error:', err));
     */
    getDriveQuotaByServiceId = async (serviceId?: string): Promise<drive_v3.Schema$About | undefined> => {
        try {
            const { data } = await this.drive.about.get({
                fields: 'storageQuota',
                auth: serviceId ? await tokenManager.get_auth_token(serviceId) : await tokenManager.get_auth_token()
                // auth: await handleGoogleAuth(this.token_code, this.driveScopes, serviceId ? { ...await this.fetchKeyByServiceId(serviceId) } : undefined)
            })
            return data
        } catch (error) {
            print(`error in getting  the storage info of the ${serviceId}` + (error as Error).message)
            throw error

        }
    }


    async processInBatches<T>(
        tasks: (() => Promise<T>)[],
        batchSize: number
    ): Promise<T[]> {
        const results: T[] = [];

        for (let i = 0; i < tasks.length; i += batchSize) {
            // Slice the tasks into the current batch
            const batch = tasks.slice(i, i + batchSize);

            // Wait for all tasks in the batch to complete
            const batchResults = await Promise.all(batch?.map((task) => task()));

            // Add the batch results to the final results
            results.push(...batchResults);
        }

        return results;
    }




    /**
     * Retrieves the storage information for all drives associated with the service accounts.
     * 
     * This function checks if {@link Drives.getAll|Drive} data exists in the local database . If it does, it uses that data; 
     * otherwise, it fetches the storage quota information from the Google Drive API for each service account.
     * The results are then combined and returned.
     * 
     * @returns {Promise<{ limit: string, usage: string, usageInDrive: string, usageInDriveTrash: string }>} - 
     * Returns an object containing the total storage limit, usage, usage in drive, and usage in drive trash.
     * 
     * @throws {Error} - Throws an error if the API call fails or if there is an issue retrieving the storage information.
     * 
     * @example
     * getDriveStorage()
     *     .then(storageInfo => console.log('Drive Storage Info:', storageInfo))
     *     .catch(err => console.error('Error:', err));
     */
    getDriveStorage = async (): Promise<{
        limit: number;
        usage: number;
        usageInDrive: number;
        usageInDriveTrash: number;
    }> => {
        try {
            print("Fetching local drive data...", "blue");

            // Get cached drive data
            const localDrives = await prisma.drive.findMany();
            print(`Found ${localDrives.length} drives in local cache.`, "green");

            if (localDrives.length === (await prisma.drive.findMany())?.length) {
                const total = localDrives.reduce(
                    (acc, drive) => ({
                        limit: acc?.limit! + Number(drive.limit!),
                        usage: acc?.usage! + Number(drive.usage!),
                        usageInDrive: (acc.usageInDrive! + Number(drive.usageInDrive!)),
                        usageInDriveTrash: (acc.usageInDriveTrash! + Number(drive.usageInDriveTrash!)),
                    }),
                    { limit: 0, usage: 0, usageInDrive: 0, usageInDriveTrash: 0 }
                );

                print(`Using cached totals: ${JSON.stringify(total)}`, "green");
                return total;
            }

            print("Fetching new data from API with concurrency limit...", "blue");
            const serviceKeys = await prisma.drive.findMany();

            if (!serviceKeys.length) {
                throw new Error("No service keys found for fetching data.");
            }

            // Create tasks for each service key
            const tasks = serviceKeys?.map((serviceKey) => async () => {
                try {
                    print(`Fetching data for service ID: ${serviceKey.serviceId}`, "blue");
                    const data = (await this.getDriveQuotaByServiceId(serviceKey.serviceId)) as drive_v3.Schema$About;

                    const currentDrive = await prisma.drive.findUnique({
                        where: {
                            serviceId: serviceKey.serviceId as string
                        },
                        include: {
                            DriveKey: true
                        }
                    })

                    const driveData = {
                        serviceId: serviceKey.serviceId,
                        id: currentDrive?.id! ?? randomUUID(),
                        limit: Number(data?.storageQuota?.limit) || 0,
                        usage: Number(data?.storageQuota?.usage) || 0,
                        usageInDrive: Number(data?.storageQuota?.usageInDrive) || 0,
                        usageInDriveTrash: Number(data?.storageQuota?.usageInDriveTrash) || 0,
                    };

                    print(`Fetched data for service ID ${serviceKey.serviceId}: ${JSON.stringify(driveData)}`, "green");

                    // Save to local cache
                    const updatedData = { ...driveData, keys: currentDrive?.DriveKey };

                    currentDrive
                        ? await prisma.drive.update({
                            where: {
                                serviceId: serviceKey.serviceId!
                            },
                            data: updatedData
                        })
                        : await prisma.drive.create({
                            data: driveData
                        })

                    return driveData;
                } catch (error) {
                    print(
                        `Error fetching data for service ID ${serviceKey.serviceId}: ${(error as Error).message}`,
                        "red"
                    );
                    return null;
                }
            });

            // Fetch data with a concurrency limit of 10
            const newDrives = await this.processInBatches(tasks, 10);

            // Filter out null results
            const validDrives = newDrives.filter((drive) => drive !== null) as {
                limit: number;
                usage: number;
                usageInDrive: number;
                usageInDriveTrash: number;
            }[];

            // Calculate totals
            const total = validDrives.reduce(
                (acc, drive) => ({
                    limit: (acc.limit! + drive.limit!),
                    usage: (acc.usage! + drive.usage!),
                    usageInDrive: (acc.usageInDrive! + drive.usageInDrive!),
                    usageInDriveTrash: (acc.usageInDriveTrash! + drive.usageInDriveTrash!),
                }),
                { limit: 0, usage: 0, usageInDrive: 0, usageInDriveTrash: 0 }
            );

            print(`Final combined totals from API: ${JSON.stringify(total)}`, "green");
            return total;
        } catch (error) {
            print(`Error getting the storage info of the drive: ${(error as Error).message}`, "red");
            throw error;
        }
    };




    /**
     * Creates a service account in the specified project.
     * 
     * This function generates a random username for the service account and uses the Google Cloud IAM API
     * to create the service account with that username. It returns the details of the created service account.
     * 
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/create
     * @returns {Promise<iam_v1.Schema$ServiceAccount| undefined>} - Returns the details of the created service account.
     * 
     * @throws {Error} - Throws an error if the service account creation fails.
     * 
     * @example
     * createServiceAccount()
     *     .then(accountDetails => console.log('Created Service Account:', accountDetails))
     *     .catch(err => console.error('Error:', err));
     */
    createServiceAccount = async (): Promise<iam_v1.Schema$ServiceAccount | undefined> => {
        return this.loadManager.addTask(async () => {
            const iam = google.iam('v1');
            const username = generateCustomId()
            // const username = crypto.randomBytes(20).toString('base64url').replace(/[^a-zA-Z]/g, '')
            try {
                const { data } = await iam.projects.serviceAccounts.create({
                    // The resource name of the project in which to create the service account.
                    name: `projects/${this.projectId}`,
                    requestBody: {
                        accountId: username,
                        serviceAccount: {
                            displayName: username,
                        },
                    },
                    auth: await tokenManager.get_auth_token(),
                });
                print(`Service Account Created: ${data?.email}`, 'green');
                return data
            } catch (error) {
                print(`Error creating service account:, ${(error as Error).message}`, 'red');
            }
        })
    }

    /**
     * Deletes a service account in the specified project.
     * 
     * This function uses the Google Cloud IAM API to delete the specified service account.
     * It returns a promise that resolves when the service account is successfully deleted.
     * 
     * @param {string} serviceId - The ID of the service account to be deleted.
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/delete
     * @returns {Promise<gaxios.GaxiosResponse<iam_v1.Schema$Empty> | undefined>} - Returns a promise that resolves when the service account is deleted.
     * 
     * @throws {Error} - Throws an error if the service account deletion fails.
     * 
     * @example
     * deleteServiceAccount('service-account-id')
     *     .then(() => console.log('Service Account deleted successfully'))
     *     .catch(err => console.error('Error:', err));
     */
    deletServiceAccount = async (serviceId: string): Promise<gaxios.GaxiosResponse<iam_v1.Schema$Empty> | boolean> => {
        return this.loadManager.addTask(async () => {
            const iam = google.iam('v1');
            try {
                return await iam.projects.serviceAccounts.delete({
                    auth: await tokenManager.get_auth_token(),
                    name: `projects/${this.projectId}/serviceAccounts/${serviceId}`
                })
            } catch (error) {
                print(`Error deleting the service account:, ${(error as Error).message}`, 'red');
                return false
            }
        })
    }


    /**
     * Retrieves the maximum limit of service accounts that can be created in a project.
     * 
     * This function queries the Google Cloud Service Usage API to get the quota limits for the specified
     * service type (IAM, Service, Compute, or Cloud Resource Manager). It returns the limits associated
     * with the service accounts for the project.
     * 
     * @ref https://cloud.google.com/service-usage/docs/reference/rest/v1/services
     * @param {'iam' | 'service' | 'compute' | 'cloudresourcemanager'} action - The type of service for which to retrieve the limit.
     * @returns {Promise<serviceusage_v1.Schema$QuotaLimit[] | undefined>} - Returns the quota limits for the specified service.
     * 
     * @throws {Error} - Throws an error if there is an issue retrieving the service account limits.
     * 
     * @example
     * LimitOfAccount('iam')
     *     .then(limits => console.log('Service Account Limits:', limits))
     *     .catch(err => console.error('Error:', err));
     */
    LimitOfAccount = async (action: 'iam' | 'service' | 'compute' | 'cloudresourcemanager'): Promise<serviceusage_v1.Schema$QuotaLimit[] | undefined> => {
        const service = {
            iam: 'iam.googleapis.com', // for service account and other qoute and limit
            service: 'serviceusage.googleapis.com',
            compute: 'compute.googleapis.com',
            cloudresourcemanager: 'cloudresourcemanager.googleapis.com' // for project related limit
        }
        const service_usage = google.serviceusage('v1');
        try {
            const projectId = this.projectId
            const { data } = await service_usage.services.get({
                name: `projects/${projectId}/services/${service[action]}`,
                auth: await tokenManager.get_auth_token(),
            })
            // print((Error).config?.quota?.limits?.filter(limit => limit.name==='ServiceAccountsPerProject')[0].values?.DEFAULT)
            return data.config?.quota?.limits
        } catch (error) {
            print("Error from the Limit of the service Account :: " + (error as Error).message)
        }
    }

    /**
     * Retrieves the remaining usable space for a specified drive by calculating the total allocated space
     * from all assigned drives.
     * 
     * This function fetches {@link apiKey.getAll|all API keys} and their associated drives, groups the drives by their ID, and
     * calculates the total allocated space for each drive. It then checks if the specified drive has reached
     * its allocated limit and returns the remaining usable space.
     * 
     * @param {string} driveId - The ID of the drive for which to retrieve the remaining usable space.
     * @param {number} totalFreeSpace - The total free space available for the drive.
     * @returns {Promise<number>} - Returns the remaining usable space for the specified drive.
     * 
     * @throws {Error} - Throws an error if there is an issue fetching the assigned drives or calculating space.
     * 
     * @example
     * getAssignedDrives('example-drive-id.iam.gserviceaccount.com', 1000000)
     *     .then(remainingSpace => console.log('Remaining Usable Space:', remainingSpace))
     *     .catch(err => console.error('Error:', err));
     */
    private getAssignedDrives = async (driveId: string, totalFreeSpace: bigint): Promise<bigint | number> => {
        return this.loadManager.addTask(async () => {
            try {
                // console.log("totalFreeSpace " + totalFreeSpace)
                const allKeys = await prisma.api_key.findMany({
                    include: {
                        drives: true
                    }
                });
                const drives = allKeys
                    .filter(item => (item?.drives?.length as number) > 0) // Filter out items without drives
                    .flatMap(item => item?.drives?.flat()); // Flatten nested arrays of drives

                // Group drives by driveId and calculate the total allocated space for each drive
                const driveAllocation = drives.reduce((acc, curr) => {
                    const existing = acc[curr?.driveId as string];
                    // console.log(existing)
                    if (existing) {
                        existing.allocatedSpace += Number(curr.allocatedSpace!);
                    } else {
                        acc[curr.driveId!] = { allocatedSpace: Number(curr.allocatedSpace!) };
                    }
                    return acc;
                }, {} as Record<string, { allocatedSpace: number }>);
                // console.log(`driveAllocation ${JSON.stringify(driveAllocation)}`)

                // console.log(driveAllocation[driveId?.replace('.iam.gserviceaccount.com',"")])

                const allocatedSpace: bigint = BigInt(driveAllocation[driveId?.replace('', "")]?.allocatedSpace || 0);
                // console.log(`allocateSpace ${allocatedSpace}`)

                // Prevent reassigning if the drive is fully allocated
                if (allocatedSpace >= totalFreeSpace) {
                    await prisma.drive.update({
                        where: { serviceId: driveId },
                        data: { alloted: true }
                    })
                    return 0; // Fully allocated; no space left
                }

                // Calculate remaining usable space
                return BigInt(Number(Math.max(Number(totalFreeSpace) - Number(allocatedSpace), 0)));
            } catch (error) {
                print(`Error while fetching assigned drives: ${(error as Error).message}`);
                throw new Error("Failed to retrieve assigned drives. Please try again later.");
            }
        })
    };

    private async checkHowManyServiceAccountIsRequiredToCreate(limit: number) {
        try {
            // Set default drive limit of 15GB
            const driveLimit = convertToBytes('15 GB');

            // Calculate how many service accounts are needed
            const accountsToCreate = Math.ceil(limit / Number(driveLimit));

            // Get the IAM service account limit per project
            const serviceAccountLimits = await this.LimitOfAccount('iam');
            const maxServiceAccountsPerProject = parseInt(
                serviceAccountLimits?.find(limit => limit.name === 'ServiceAccountsPerProject')?.values?.DEFAULT || "0"
            );

            let accounts: iam_v1.Schema$ServiceAccount[] = [];
            let remainingAccountsToCreate = accountsToCreate;

            // Get all existing projects from Google Cloud
            const cloudResourceManager = google.cloudresourcemanager('v1');
            const { data: projectsList } = await cloudResourceManager.projects.list({
                filter: 'lifecycleState:ACTIVE',
                auth: await tokenManager.get_auth_token()
            });

            const allProjects = projectsList.projects || [];

            // Function to get total service accounts in a project
            const getProjectServiceAccounts = async (projectId: string) => {
                this.projectId = projectId;
                const serviceAccounts = await this.ListServiceAccount();
                return serviceAccounts?.accounts?.length || 0;
            };

            // Track which project we're currently working with
            let currentProjectIndex = 0;
            const baseProjectId = generateCustomId((await tokenManager.getUserInfo())?.id!, false);

            while (remainingAccountsToCreate > 0) {
                let currentProject = allProjects[currentProjectIndex];

                if (!currentProject) {
                    // Create new project with incremented suffix
                    const newProjectId = `${baseProjectId}-${currentProjectIndex + 1}`;

                    await this.create_app_project(newProjectId);

                    // Wait for project creation to complete
                    await this.waitForProjectCreation(newProjectId);

                    // Get the newly created project
                    const { data: newProject } = await cloudResourceManager.projects.get({
                        projectId: newProjectId,
                        auth: await tokenManager.get_auth_token()
                    });

                    currentProject = newProject;
                    allProjects.push(currentProject);

                    // Enable required APIs for the new project
                    this.projectId = newProjectId;
                    await this.enable_required_api();
                }

                // Get current count of service accounts in this project
                const currentServiceAccounts = await getProjectServiceAccounts(currentProject.projectId!);
                const remainingSlots = maxServiceAccountsPerProject - currentServiceAccounts;

                if (remainingSlots > 0) {
                    // Calculate how many accounts we can create in this project
                    const accountsToCreateInThisProject = Math.min(remainingSlots, remainingAccountsToCreate);

                    // Create service accounts in this project
                    for (let i = 0; i < accountsToCreateInThisProject; i++) {
                        const newAccount = await this.createServiceAccount() as iam_v1.Schema$ServiceAccount;
                        accounts.push(newAccount);
                        remainingAccountsToCreate--;
                        // Add delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 20000));
                    }
                }

                // Move to next project if we still need more accounts
                currentProjectIndex++;
            }

            // Restore original project ID
            this.projectId = allProjects[0]?.projectId || baseProjectId;
            return accounts;
        } catch (error) {
            console.error("Error in checkHowManyServiceAccountIsRequiredToCreate:", error);
            throw error;
        }
    }

    // Helper function to wait for project creation
    private async waitForProjectCreation(projectId: string, maxAttempts = 10): Promise<void> {
        const cloudResourceManager = google.cloudresourcemanager('v1');
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const { data: project } = await cloudResourceManager.projects.get({
                    projectId: projectId
                });

                if (project.lifecycleState === 'ACTIVE') {
                    return;
                }
            } catch (error) {
                // Project might not be ready yet
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between attempts
        }

        throw new Error(`Project ${projectId} creation timed out`);
    }


    /**
     * Assigns storage space to service accounts based on the specified limit.
     * 
     * This function retrieves a {@link ListServiceAccount|list of available service accounts} and calculates the free space for each
     * account's drive. It allocates storage space to the drives until the specified limit is reached or
     * until there is no more available space. The function returns an array of drive allocations.
     * 
     * @param {string} [limit="16106127360"] - The maximum storage limit to allocate in bytes (default is 16 GB).
     * @returns {Promise<{driveId: string;allocatedSpace: string;}[]>} - Returns an array of objects representing the allocated drives and their allocated space.
     * 
     * @throws {Error} - Throws an error if there is an issue retrieving service accounts or if the requested limit cannot be satisfied.
     * 
     * @example
     * assignDriveToApiKey("10737418240") // 10 GB
     *     .then(drives => console.log('Allocated Drives:', drives))
     *     .catch(err => console.error('Error:', err));
     */
    assignDriveToApiKey = async (limit: bigint = BigInt(16106127360)): Promise<{ driveId: string; allocatedSpace: number; }[]> => {
        return this.loadManager.addTask(async () => {
            try {
                // let effectiveLimit = localStorage.getItem('defaultQuota') ? Number(convertToBytes(localStorage.getItem('defaultQuota')!)) : limit;
                let effectiveLimit = limit;
                const serviceAccounts = await this.ListServiceAccount();
                const availableServiceAccounts = serviceAccounts?.accounts;
                const drives: {
                    driveId: string;
                    allocatedSpace: number;
                }[] = [];
                let remainingLimit: bigint = limit; // Remaining space to allocate in bytes
                const existingDrive = await prisma.drive.findMany()
                const filteredServiceAccounts = availableServiceAccounts?.filter(acc => {
                    // Find the corresponding drive using the serviceId
                    const drive = existingDrive.find(d => d.serviceId === acc?.email);

                    // If no corresponding drive is found or if the drive is not allocated, include it
                    return !drive || !drive.alloted;
                });
                // const filteredServiceAccounts = availableServiceAccounts
                // console.log(filteredServiceAccounts)
                // If no service accounts available, create a new one
                if (!filteredServiceAccounts.length) {
                    // let accountCreated = false;
                    // while (!accountCreated) {
                    //     const data = await this.createServiceAccount();
                    //     const storage = await this.getDriveQuotaByServiceId(data?.email!);

                    //     if (Number(storage?.storageQuota?.limit!) > Number(effectiveLimit)) {
                    //         accountCreated = true;
                    //         filteredServiceAccounts.push(data);
                    //     }
                    // }
                    const accounts = await this.checkHowManyServiceAccountIsRequiredToCreate(Number(limit))
                    filteredServiceAccounts.push(...accounts)
                }

                let totalUnallocatedSpace: bigint = BigInt(0);
                for (const acc of filteredServiceAccounts) {
                    const storage = await this.getDriveQuotaByServiceId(acc?.email!);
                    const driveLimit = BigInt(parseInt(storage?.storageQuota?.limit as string));
                    const driveUsage = BigInt(parseInt(storage?.storageQuota?.usage as string));
                    const freeSpace = driveLimit - driveUsage;
                    // getAssignedDrives se milne wala value drive ka unused space ho sakta hai
                    const unusedStorage = BigInt(await this.getAssignedDrives(acc?.email!, freeSpace));
                    totalUnallocatedSpace += unusedStorage;
                }

                // Agar combined unallocated space effectiveLimit se kam hai, to additional service accounts create karo
                if (totalUnallocatedSpace < effectiveLimit) {
                    const additionalNeeded = Number(effectiveLimit - totalUnallocatedSpace);
                    const additionalAccounts = await this.checkHowManyServiceAccountIsRequiredToCreate(additionalNeeded);
                    // Additional accounts array ko filtered list mein add kar dein
                    filteredServiceAccounts.push(...additionalAccounts);
                }

                for (const acc of filteredServiceAccounts || []) {
                    if (Number(remainingLimit) > BigInt(0)) {
                        const storage = await this.getDriveQuotaByServiceId(acc?.email as string);
                        const freeSpace = parseInt(storage?.storageQuota?.limit as string) - parseInt(storage?.storageQuota?.usage as string);

                        // Get the remaining free space available for this drive
                        const unusedStorage = await this.getAssignedDrives(acc?.email as string, BigInt(freeSpace));

                        // console.log(`Remaining limit: ${remainingLimit}, Unused storage for ${acc?.email}: ${unusedStorage}`);

                        if (unusedStorage > 0) {
                            const allocation: bigint = BigInt(Math.min(Number(remainingLimit), Number(unusedStorage))); // Allocate the smaller of remainingLimit or unusedStorage
                            drives.push({
                                driveId: (acc?.email as string)?.replace("", "")!,
                                allocatedSpace: Number(allocation)
                            });
                            remainingLimit -= allocation; // Reduce remaining limit
                        }
                    }
                }

                if (Number(remainingLimit) > 0) {
                    throw new Error(`Not enough storage to satisfy the requested limit. Remaining: ${remainingLimit} bytes`);
                }

                return drives;
            } catch (error) {
                print("Error while assigning storage to the API key: " + (error as Error).message);
                throw new Error((error as Error).message);
            }
        })
    };


    /**
     * Removes or reduces storage allocation from drives associated with an API key.
     * 
     * This method processes storage reduction by iterating through the drives associated
     * with the API key and applying one of three operations:
     * 1. Complete removal of a drive if its space matches the reduction amount
     * 2. Partial reduction of a drive's allocated space
     * 3. Complete removal of a drive and continuation to the next if more space needs to be reduced
     * 
     * @param {string} accessKey - The unique identifier of the API key
     * @param {number} space - The amount of storage space to remove (in bytes)
     * @throws {Error} If no drives are found or if the requested space reduction cannot be satisfied
     * @returns {Promise<void>} 
     * 
     * @example
     * await removeDriveFromApiKey("api-key-123", 5000000);
     */
    removeDriveFromApiKey = async (accessKey: string, space: number): Promise<{
        id: string;
        usage: number;
        accessKey: string;
        userId: string;
        allocatedSpace: number;
        driveId: string;
    }[]> => {
        try {
            // Input validation
            if (!accessKey) throw new Error("Access key is required");
            if (space <= 0) throw new Error("Space to remove must be greater than 0");

            // Fetch API key data and associated drives
            const apiKeyData = await prisma.api_key.findUnique({
                where: {
                    accessKey
                },
                include: {
                    drives: {
                        include: {
                            drive: true
                        }
                    }
                }
            });

            if (!apiKeyData?.drives?.length) {
                throw new Error("No drives found for this API key");
            }

            const drives = apiKeyData.drives;
            const totalSpace = drives.reduce((sum, drive) => sum + Number(drive.allocatedSpace), 0);

            if (space > totalSpace) {
                throw new Error(`Cannot remove ${space} bytes. Only ${totalSpace} bytes available`);
            }
            let remainingSpace = totalSpace - space;

            // Helper function to remove drive access and update drive details
            const removeDriveAccess = async (driveId: string): Promise<void> => {
                await prisma.driveKey.deleteMany({
                    where: {
                        driveId: driveId,
                    },
                });
                await prisma.drive.update({
                    where: { serviceId: driveId },
                    data: {
                        alloted: false
                    }
                })
            };

            // Process drives until the required space is reduced
            while (remainingSpace > 0 && drives.length > 0) {
                const currentDrive = drives[0];
                const driveSpace = currentDrive.allocatedSpace;

                if (driveSpace <= remainingSpace) {
                    // Remove entire drive allocation
                    await removeDriveAccess(currentDrive.driveId);
                    remainingSpace -= Number(driveSpace);

                    // Remove the drive from the list
                    drives.splice(drives.indexOf(currentDrive), 1);

                    // Stop processing if remaining space is zero
                    if (remainingSpace === 0) break;
                } else {
                    // Partial reduction in the drive's allocated space
                    currentDrive.allocatedSpace -= BigInt(remainingSpace);
                    await prisma.driveKey.update({
                        where: { id: currentDrive.id },
                        data: { allocatedSpace: currentDrive.allocatedSpace },
                    })
                    await prisma.drive.update({
                        where: { serviceId: currentDrive.driveId },
                        data: {
                            alloted: false
                        }
                    })
                    remainingSpace = 0;
                    break;
                }
            }

            // Update the API key with modified drives
            // await prisma.api_key.update({
            //     where: {
            //         accessKey
            //     },
            //     data: {
            //         drives: {
            //             set: drives.map((drive) => ({
            //                 id: drive.id
            //             }))
            //         }
            //     }
            // });


            // Return the updated drives
            return drives.map((drive) => ({
                id: drive.id,
                usage: Number(drive.usage),
                accessKey: accessKey,
                userId: apiKeyData.userId,
                allocatedSpace: Number(drive.allocatedSpace),
                driveId: drive.driveId,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to remove drive storage: ${errorMessage}`);
        }
    };



    /**
     * Lists all service accounts in the specified project.
     * 
     * This function makes an API call to the Google Cloud IAM service to retrieve all service accounts
     * associated with the project. It handles pagination to ensure that all accounts are retrieved, even
     * if there are multiple pages of results.
     * 
     * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/list
     * @returns {Promise<{ accounts: any[] }>} - Returns an object containing an array of service accounts.
     * 
     * @throws {Error} - Throws an error if there is an issue retrieving the service accounts.
     * 
     * @example
     * ListServiceAccount()
     *     .then(serviceAccounts => console.log('Service Accounts:', serviceAccounts))
     *     .catch(err => console.error('Error:', err));
     */
    ListServiceAccount = async (): Promise<{ accounts: iam_v1.Schema$ServiceAccount[] }> => {
        try {
            let allServiceAccounts: iam_v1.Schema$ServiceAccount[] = [];
            let pageToken: string | undefined = undefined;
            const drives = await prisma.drive.findMany()
            // console.log(this.projectId)

            do {
                // Make an API call to list service accounts
                // console.log(this.projectId)
                const { data }: { data: iam_v1.Schema$ListServiceAccountsResponse } =
                    await this.iam.projects.serviceAccounts.list({
                        auth: await tokenManager.get_auth_token(),
                        name: `projects/${this.projectId || generateCustomId((await tokenManager.getUserInfo())?.id!, false)}`,
                        pageToken,
                    });

                // Append the retrieved accounts to the final list
                if (data?.accounts) {
                    allServiceAccounts = allServiceAccounts.concat(data.accounts);
                }

                // Update the page token for the next iteration
                pageToken = data?.nextPageToken!;
            } while (pageToken); // Continue while there is a nextPageToken

            if (drives?.length !== allServiceAccounts.length) {
                // Get service accounts that are NOT in drives
                const unassignedServiceAccounts = allServiceAccounts.filter(account =>
                    !drives.some(drive => drive.serviceId === account.email)
                );

                const accountsToCreate = [];

                for (const account of unassignedServiceAccounts) {
                    const storageDetails = await this.getDriveQuotaByServiceId(account.email!);

                    accountsToCreate.push({
                        serviceId: account.email!,
                        limit: BigInt(storageDetails?.storageQuota?.limit || 0), // Ensure a default value
                        alloted: false,
                    });
                }

                if (accountsToCreate.length > 0) {
                    await prisma.drive.createMany({
                        data: accountsToCreate
                    });
                }
            }

            return { accounts: allServiceAccounts };
        } catch (error) {
            print(`Error in listing Service Accounts: ${(error as Error).message}`, 'red');
            throw error;
        }
    };




    /**
     * Retrieves all files in the current drive based on the specified query.
     * 
     * This function makes an API call to the Google Drive API to list files in the drive. It allows for
     * filtering based on file type and name. The function also retrieves the storage quota information for
     * the drive and returns it along with the list of files.
     * 
     * @ref https://developers.google.com/drive/api/reference/rest/v3
     * @param {Object} data - An object containing parameters for the file listing.
     * @param {ListFiles} [data.query] - An optional query object to filter the files.
     * @param {string} [data.projectId] - The ID of the project (optional).
     * @param {string} [data.serviceAccount] - The service account email (optional).
     * @returns {Promise< { driveStorage: drive_v3.Schema$About; files?: drive_v3.Schema$File[]; incompleteSearch?: boolean | null; kind?: string | null; nextPageToken?: string | null; } | false>} - Returns a JSON object containing the list of files and drive storage information, or false if an error occurs.
     * 
     * @throws {Error} - Throws an error if there is an issue retrieving the files from the drive.
     * 
     * @example
     * listFiles({ query: { filter: 'example.txt', fileType: 'file' } })
     *     .then(result => console.log('Files:', result))
     *     .catch(err => console.error('Error:', err));
     */
    listFiles = async (data: {
        query?: ListFiles,
        projectId?: string;
        serviceAccount?: string
    }): Promise<{
        driveStorage: drive_v3.Schema$About;
        files?: drive_v3.Schema$File[];
        incompleteSearch?: boolean | null;
        kind?: string | null;
        nextPageToken?: string | null;
    } | false> => {
        const { query } = data as ListFiles;
        // print(query)
        try {
            const drive = google.drive({
                version: "v3",
                auth: await tokenManager.get_auth_token(),
            });
            /**
             * @ref https://developers.google.com/drive/api/guides/search-files
             */
            const { data } = await drive.files.list({
                q: query?.fileType || query?.filter ?
                    [
                        query?.filter ? `name='${query.filter}'` : '',
                        query?.fileType === 'folder' ? `mimeType='application/vnd.google-apps.folder'` : ''
                    ].filter(Boolean).join(' and ')
                    : undefined,
                fields: "files(id, name, mimeType, thumbnailLink, webViewLink,parents)",
            });
            const { data: driveStorage } = await drive.about.get({
                fields: 'storageQuota'
            })
            return {
                ...data,
                driveStorage
            };
        } catch (error) {
            print(`Error is list the post from the drive :: ${(error as Error).message}`)
            return false
        }
    }


    /**
     * Shares a file with a specified user by granting them the specified permissions.
     * 
     * This function makes an API call to the Google Drive API to create a permission for a file, allowing
     * the specified user to access the file with the given role. The function returns a boolean indicating
     * whether the permission was successfully granted.
     * 
     * @ref https://developers.google.com/drive/api/reference/rest/v3/permissions/create
     * @param {Object} data - An object containing the details for sharing the file.
     * @param {string} data.fileId - The ID of the file to be shared.
     * @param {'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader'} data.role - The role to assign to the user.
     * @param {string} data.emailAddress - The email address of the user to share the file with.
     * @param {string} [data.type] - The type of the user (default is 'user').
     * @returns {Promise<boolean>} - Returns true if the permission is granted, otherwise false.
     * 
     * @throws {Error} - Throws an error if there is an issue granting the permission.
     * 
     * @example
     * shareFile({
     *     fileId: 'your-file-id',
     *     role: 'writer',
     *     emailAddress: 'user@example.com'
     * })
     *     .then(success => console.log('Permission granted:', success))
     *     .catch(err => console.error('Error:', err));
     */
    shareFile = async (data: {
        fileId: string;
        role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
        emailAddress: string;
        credential: OAuth2Client
        type?: string
    }): Promise<boolean> => {
        const { fileId, role, emailAddress, type, credential } = data;
        try {
            const drive = google.drive({ version: 'v3', auth: credential ?? await tokenManager.get_auth_token() });
            await drive.permissions.create({
                fileId,
                requestBody: {
                    emailAddress,
                    role,
                    type: type ?? 'user'
                }
            })
            print(`File has been successfully shared with ${emailAddress}.`, 'green', undefined, 'info');
            return true;
        } catch (error) {
            print("Error in share the file :: " + (error as Error).message)
            return false
        }
    }


    /**
     * Deletes a file from Google Drive using its file ID.
     * 
     * This function makes an API call to the Google Drive API to delete the specified file. If the deletion
     * is successful, it returns the response from the API. If an error occurs, it logs the error message.
     * 
     * @param {string} fileId - The ID of the file to be deleted.
     * @returns {Promise<gaxios.GaxiosResponse<void> | undefined>} - Returns the API response if the deletion is successful; otherwise, it returns undefined.
     * 
     * @throws {Error} - Throws an error if there is an issue deleting the file.
     * 
     * @example
     * delete('your-file-id')
     *     .then(response => console.log('File deleted successfully:', response))
     *     .catch(err => console.error('Error:', err));
     */
    delete = async (fileId: string): Promise<gaxios.GaxiosResponse<void> | undefined> => {
        try {
            return await this.drive.files.delete({
                fileId,
                auth: await tokenManager.get_auth_token()
            })
        } catch (error) {
            print(`Error in deleting the file of the admin ${(error as Error).message}`)
        }
    }


    create_app_project = async (projectId?: string) => {
        try {
            // Initialize the Cloud Resource Manager API
            const cloudResourceManager = google.cloudresourcemanager('v1');

            // Obtain authentication credentials
            const auth = await tokenManager.get_auth_token();

            // Get user profile to access user ID
            const userProfile = await tokenManager.getUserProfile();
            const userId = userProfile.username;

            // Check if the project already exists
            const listRequest = {
                auth: auth,
            };

            const { data: listResponse } = await cloudResourceManager.projects.list(listRequest);

            const projectId = generateCustomId((await tokenManager.getUserInfo())?.id!, false)
            const existingProject = listResponse.projects?.find(
                (project) => project.projectId === (projectId ?? projectId)
            );

            if (existingProject) {
                if (existingProject.lifecycleState === 'DELETE_REQUESTED') {
                    throw new Error(`Project ${existingProject.projectId} is in DELETE_REQUESTED state.`);
                }
                console.log('Project already exists:', existingProject.projectId);

                // Store project ID in Redis with user ID as key
                await redisClient.set(`project:${userId}`, existingProject.projectId!);

                this.projectId = existingProject.projectId!;
                return existingProject.projectId!;
            }

            const { data } = await cloudResourceManager.projects.create({
                requestBody: {
                    projectId: projectId ?? projectId,
                    name: projectId ?? projectId,
                },
                auth: auth
            });

            const newProjectId = data.name?.split('/').pop()!;
            this.projectId = newProjectId;

            // Store new project ID in Redis with user ID as key
            await redisClient.set(`project:${userId}`, newProjectId);

            return newProjectId;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    };

}

// export const googleService = new GoogleService()