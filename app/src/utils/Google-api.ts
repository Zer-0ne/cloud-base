// import { Data, FileResource, ListFiles } from "@/utils/Interfaces";
// import { auth } from "@root/google.config"
// import { drive_v3, google } from "googleapis";
// import stream from 'stream'
// import crypto from 'crypto';
// import { DateRFC3339 } from "./Algo";
// import { ensureLocalDirectory, ensureLocalFile, localFileExists, readLocalFile, writeLocalFile } from "@/lib/file-handling";
// import { scheduleSync } from "@/lib/drive-sync-manager";
// import { createFolderAndRecord } from "@/lib/folder-management";
// import { print } from "./color-print";
// import { User } from "@/lib/Models/userSchema";

import { google } from "googleapis";
import { print } from "./color-print";
import { auth } from "@root/google.config";
import { Data } from "./Interfaces";

// const iam = google.iam('v1');

// // get any service account key
// type ServiceAccountPrivateKeyType = 'TYPE_GOOGLE_CREDENTIALS_FILE' | 'TYPE_PKCS12_FILE' | 'TYPE_UNSPECIFIED'

// /**
//  * this is the function to create the key of service account
//  * @ServiceAccountPrivateKeyType 'TYPE_GOOGLE_CREDENTIALS_FILE' | 'TYPE_PKCS12_FILE' | 'TYPE_UNSPECIFIED'
//  * @ServiceAccountKeyAlgorithm 'KEY_ALG_UNSPECIFIED' | 'KEY_ALG_RSA_1024' | 'KEY_ALG_RSA_2048'
//  * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/create
//  * @param serviceAccountId take the unique id of the service account 
//  * @returns it return error credentials like private key etc 
//  */
// export const createServiceAccountKey = async (serviceAccountId: string) => {
//     type ServiceAccountPrivateKeyType = 'TYPE_GOOGLE_CREDENTIALS_FILE' | 'TYPE_PKCS12_FILE' | 'TYPE_UNSPECIFIED'
//     type ServiceAccountKeyAlgorithm = 'KEY_ALG_UNSPECIFIED' | 'KEY_ALG_RSA_1024' | 'KEY_ALG_RSA_2048'
//     try {
//         const { data: credentials } = await iam.projects.serviceAccounts.keys.create({
//             name: `projects/copycodecommunity/serviceAccounts/${serviceAccountId}@copycodecommunity.iam.gserviceaccount.com`,
//             requestBody: {
//                 privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' as ServiceAccountPrivateKeyType, // Specify the type of key
//             },
//             auth: await auth([
//                 'https://www.googleapis.com/auth/cloud-platform',
//                 'https://www.googleapis.com/auth/iam'
//             ]),
//         })
//         return credentials
//     } catch (error) {
//         print('Error to create the key for service account' + (error as Data).message)
//     }
// }


// /**
//  * this is function toh list all the key running in the service account 
//  * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/list
//  * @param service take unique id of the service account
//  * @returns return the list of key available 
//  */
// export const getListOfKeys = async (service: string) => {
//     try {
//         const { data: list } = await iam.projects.serviceAccounts.keys.list({
//             name: `projects/copycodecommunity/serviceAccounts/${service}@copycodecommunity.iam.gserviceaccount.com`,
//             keyTypes: ['USER_MANAGED'],
//             auth: await auth([
//                 'https://www.googleapis.com/auth/cloud-platform',
//                 'https://www.googleapis.com/auth/iam'
//             ]),
//         })
//         return list.keys
//     } catch (error) {
//         print('error in listing the key ' + (error as Data).message)
//         return

//     }
// }


// /**
//  * this is the function toh get the public key of any service account
//  * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys/get
//  * @param name it take the name of the listed in the list key. it includes the [uniqueid-service]@[project-name]/keys/[keyid] 
//  * @returns it return the public key of respected service account
//  */
// export const getSpecificKey = async (name: string) => {
//     try {
//         // print(name)
//         const { data } = await iam.projects.serviceAccounts.keys.get({
//             name: name as string,
//             publicKeyType: 'TYPE_X509_PEM_FILE',
//             auth: await auth([
//                 'https://www.googleapis.com/auth/cloud-platform',
//                 'https://www.googleapis.com/auth/iam'
//             ]),
//         })
//         return data;
//     } catch (error) {
//         print('error in getting  the key ' + (error as Data).message)
//         return

//     }
// }

// /**
//  * this is the function to get the storage information of the drive of the current service account
//  * @ref https://developers.google.com/drive/api/reference/rest/v3/about/get?apix_params=%7B%22fields%22%3A%22storageQuota%22%7D
//  * @fields_of_storage storageQuota
//  * @param cred takes the object of the credentials for authentication
//  * @returns the data with contain the information of the current service account or null when any error occurs
//  */
// export const getDriveStorage = async (cred: object) => {
//     try {
//         const drive = google.drive({
//             version: "v3",
//             auth: await auth([
//                 "https://www.googleapis.com/auth/drive",
//                 "https://www.googleapis.com/auth/drive.appdata",
//                 "https://www.googleapis.com/auth/drive.file",
//                 "https://www.googleapis.com/auth/drive.meet.readonly",
//                 "https://www.googleapis.com/auth/drive.metadata",
//                 "https://www.googleapis.com/auth/drive.metadata.readonly",
//                 "https://www.googleapis.com/auth/drive.photos.readonly",
//                 "https://www.googleapis.com/auth/drive.readonly"
//             ], {
//                 type: "service_account",
//                 private_key: `aspect private key`,
//                 client_email: `${'[unique-id]'}@[project-id].iam.gserviceaccount.com`,
//                 token_url: "https://oauth2.googleapis.com/token",
//                 universe_domain: "googleapis.com",
//             }),
//         })
//         const { data } = await drive.about.get({
//             fields: 'storageQuota'
//         })
//         return data
//     } catch (error) {
//         print('error in getting  the storage info of the drive ' + (error as Data).message)
//         return

//     }
// }


// /**
//  * this function is for creating the serviceAccount
//  * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/create
//  * @returns it returns the create service account details
//  */
// // export const createServiceAccount = async () => {
// //     const iam = google.iam('v1');
// //     try {
// //         const { data } = await iam.projects.serviceAccounts.create({
// //             // The resource name of the project in which to create the service account.
// //             name: `projects/copycodecommunity`,
// //             requestBody: {
// //                 accountId: 'sahilkhan282',
// //                 serviceAccount: {
// //                     displayName: 'Sahil khan',
// //                 },
// //             },
// //             auth: await auth([
// //                 'https://www.googleapis.com/auth/cloud-platform'
// //             ]),
// //         });
// //         print(`Service account created: ${data?.email}`);
// //         return data
// //     } catch (error) {
// //         print(`Error creating service account:, ${(error as Data).message}`);
// //     }
// // }

// /**
//  * this is the function toh get the max limit of the service account will created in a project
//  * @ref https://cloud.google.com/service-usage/docs/reference/rest/v1/services
//  * @returns it return the number of the maximum limit of the service account create in a project
//  */
// const LimitOfServiceAccount = async () => {
//     const service = {
//         iam: 'iam.googleapis.com', // for service account and other qoute and limit
//         service: 'serviceusage.googleapis.com',
//         compute: 'compute.googleapis.com',
//         cloudresourcemanager: 'cloudresourcemanager.googleapis.com' // for project related limit
//     }
//     const service_usage = google.serviceusage('v1');
//     try {
//         const projectId = 'copycodecommunity'
//         const { data } = await service_usage.services.get({
//             name: `projects/${projectId}/services/${service.cloudresourcemanager}`,
//             auth: await auth([
//                 'https://www.googleapis.com/auth/cloud-platform',
//                 'https://www.googleapis.com/auth/cloud-platform.read-only'
//             ]),
//         })
//         // print((data).config?.quota?.limits?.filter(limit => limit.name==='ServiceAccountsPerProject')[0].values?.DEFAULT)
//         return data
//     } catch (error) {
//         print("Error from the Limit of the service Account :: " + (error as Data).message)
//     }
// }

// /**
//  * this is the function to list all the service Account in project
//  * @ref https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/list
//  * @returns list of the service account
//  */
// export const ListServiceAccount = async () => {
//     const iam = google.iam('v1');
//     try {
//         const { data } = await iam.projects.serviceAccounts.list({
//             auth: await auth([
//                 'https://www.googleapis.com/auth/cloud-platform'
//             ]),
//             name: 'projects/copycodecommunity'
//         });
//         return data
//     } catch (error) {
//         print(`Error in creating Service account : ${(error as Data).message}`);
//         return
//     }
// }

// /**
//  * This is the function to get all the posts in the current drive
//  * @ref https://developers.google.com/drive/api/reference/rest/v3
//  * @param data the data take an object of the some value like query of the data, projectid and service id
//  * @returns it returns the json file to the api and if there is any error the nothing is return 
//  */
// export const listFiles = async (data: {
//     query?: ListFiles,
//     projectId?: string;
//     serviceAccount?: string
// }) => {
//     const { query } = data as ListFiles;
//     // print(query)
//     try {
//         const drive = google.drive({
//             version: "v3",
//             auth: await auth([
//                 "https://www.googleapis.com/auth/drive",
//                 "https://www.googleapis.com/auth/drive.appdata",
//                 "https://www.googleapis.com/auth/drive.file",
//                 "https://www.googleapis.com/auth/drive.meet.readonly",
//                 "https://www.googleapis.com/auth/drive.metadata",
//                 "https://www.googleapis.com/auth/drive.metadata.readonly",
//                 "https://www.googleapis.com/auth/drive.photos.readonly",
//                 "https://www.googleapis.com/auth/drive.readonly"
//             ]),
//         });
//         /**
//          * @ref https://developers.google.com/drive/api/guides/search-files
//          */
//         const { data } = await drive.files.list({
//             q: query?.fileType || query?.filter ?
//                 [
//                     query?.filter ? `name='${query.filter}'` : '',
//                     query?.fileType === 'folder' ? `mimeType='application/vnd.google-apps.folder'` : ''
//                 ].filter(Boolean).join(' and ')
//                 : undefined,
//             fields: "files(id, name, mimeType, thumbnailLink, webViewLink,parents)",
//         });
//         const { data: driveStorage } = await drive.about.get({
//             fields: 'storageQuota'
//         })
//         return {
//             ...data,
//             driveStorage
//         };
//     } catch (error) {
//         print(`Error is list the post from the drive :: ${(error as Data).message}`)
//         return false
//     }
// }

// /**
//  * this is the function toh share the user
//  * @ref https://developers.google.com/drive/api/reference/rest/v3/permissions/create
//  * @param data this is the object of data that constains the fileId, role, email, and type
//  * @returns the boolean value if the permission is granted then true else false
//  */
// export const shareFile = async (data: {
//     fileId: string;
//     role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
//     emailAddress: string;
//     type?: string
// }) => {
//     const { fileId, role, emailAddress, type } = data;
//     try {
//         const drive = google.drive({ version: 'v3', auth: await auth(['https://www.googleapis.com/auth/drive.file']) });
//         await drive.permissions.create({
//             fileId,
//             requestBody: {
//                 emailAddress,
//                 role,
//                 type: type ?? 'user'
//             }
//         })
//         return true;
//     } catch (error) {
//         print("Error in share the file :: " + (error as Data).message)
//         return false
//     }
// }


const drive = google.drive({
    version: "v3",
    auth: await auth([
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.appdata"
    ]),
});
// export const deletFile = async (fileId: string) => {
//     try {
//         return await drive.files.delete({
//             fileId
//         })
//     } catch (error) {
//         print(`Error in deleting the files ${(error as Data).message}`)
//     }
// }

// /**
//  * This is the function to check file is exist or not. if not then create that file
//  * @note This is folder JSON format only
//  * @ref create https://developers.google.com/drive/api/reference/rest/v3/files/create
//  * @ref get https://developers.google.com/drive/api/reference/rest/v3/files/get
//  * @param fileName name of file
//  * @param folderId id of its parent folder
//  * @param initialContent man content to save in the file
//  * @param folderName name of its folder
//  * @returns return file detail
//  */
// export const findOrCreate = async (path: string, initialContent = []) => {
//     print(`Processing path: ${path}`, 'blue');

//     const createOrUpdateItem = async (pathSegments: string[], rootFolderId: string, currentFolder: string) => {
//         print(`File of ${currentFolder} of parent id: ${rootFolderId}`, "green")
//         if (pathSegments.length < 1) {
//             const file = await getFile(pathSegments[0] ?? currentFolder, rootFolderId);
//             if (file && file.length < 1) {
//                 const bufferStream = new stream.PassThrough();
//                 bufferStream.end(Buffer.from(JSON.stringify(initialContent, null, 2))); // Prepare JSON content
//                 const fileMetadata = {
//                     name: `${pathSegments[0] ?? currentFolder}`,
//                     mimeType: "application/json",
//                     parents: [rootFolderId], // Add to folder if folderId is specified
//                 };
//                 const { data: newFile } = await drive.files.create({
//                     requestBody: {
//                         ...fileMetadata,
//                         originalFilename: `${pathSegments[0] ?? currentFolder}`,
//                         createdTime: DateRFC3339() as string
//                     },
//                     media: {
//                         mimeType: "application/json",
//                         body: bufferStream,
//                     },
//                     fields: "id, name,parents",
//                 });
//                 // print(newFile)
//                 return { file: newFile ?? { id: '' } }
//             }
//             return { file: file?.[0] as drive_v3.Schema$File ?? { id: '' } };
//         }
//         const file = await getFile(currentFolder, undefined, 'folder')
//         // print(`file ->>>>> ${file}`)
//         let folderId = file && file[0]?.id;
//         if (file && file?.length < 1) {
//             const data = await createFolder({ folderName: currentFolder, parentFolderId: rootFolderId });
//             return await createOrUpdateItem(pathSegments, data ?? '', pathSegments.shift() as string)
//         }
//         return createOrUpdateItem(pathSegments, folderId ?? '', pathSegments?.shift() as string)
//     }

//     try {
//         const pathSegments = path.split('/').filter((segment) => segment.trim() !== "");
//         // print(pathSegments)
//         if (pathSegments.length === 0) throw new Error("Invalid path provided.");

//         // Root folder ID
//         const rootFolderId = "1mj3IEo5RzWWWuTXB-pmH8Il7TyhrNsdF";
//         return await createOrUpdateItem(pathSegments, rootFolderId, pathSegments?.shift() as string);
//     } catch (error) {
//         print(`Error in findOrCreate: ${(error as Data).message}`);
//         throw error;
//     }
// };




// /**
//  * this is the function to get the file from the google drive 
//  * @ref get https://developers.google.com/drive/api/reference/rest/v3/files/get
//  * @param fileName name of the file to be search is exist or not
//  * @param folderId its parent folder id 
//  * @returns files or false is return
//  */
// export const getFile = async (
//     fileName: string,
//     folderId?: string,
//     type: 'folder' | 'file' = 'file'
// ) => {
//     try {
//         const query = type === 'file' ? `name='${fileName}' and mimeType='application/json'` +
//             (folderId ? ` and '${folderId}' in parents` : '') : `name='${fileName}' and mimeType='application/vnd.google-apps.folder'`;

//         const { data: { files } } = await drive.files.list({
//             q: query,
//             fields: "files(id, name,parents)",
//             spaces: "drive",
//         });
//         return files
//     } catch (error) {
//         print("Error in getting the file :: " + (error as Data).message)
//         return []
//     }
// }

// /**
//  * this is the function to create the folder 
//  * @ref https://developers.google.com/drive/api/reference/rest/v3/files/create
//  * @param folderName name of the folder to be created
//  * @returns the folderId or nothing 
//  */
// export const createFolder = async (data: { folderName: string, parentFolderId?: string }) => {
//     const { folderName, parentFolderId } = data
//     try {
//         const folder = await drive.files.create({
//             requestBody: {
//                 name: folderName,
//                 mimeType: "application/vnd.google-apps.folder",
//                 parents: [parentFolderId]
//             } as FileResource,
//             fields: "id", // Only return the ID
//         });
//         const folderId = folder.data.id; // Extract the folder ID
//         if (!folderId) {
//             throw new Error("Failed to create folder");
//         }
//         return folderId;
//     } catch (error) {
//         print('Error in creating folder :: ' + (error as Data).message)
//         return ''
//     }
// }

export const getFileContent = async (fileId: string) => {
    try {
        if (!fileId) {
            return false
        }
        const { data } = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'text' } // Get the file content as text
        );
        return JSON.parse(data && data as string); // Parse the JSON content
    } catch (error) {
        print('Error reading file content:' + (error as Data).message);
        throw error;
    }
};

// export const updateFileContent = async (fileId: string, updatedData: object, mimeType: string = 'application/json') => {
//     try {
//         const bufferStream = new stream.PassThrough();
//         bufferStream.end(Buffer.from(JSON.stringify(updatedData, null, 2))); // Prepare JSON content

//         const response = await drive.files.update({
//             fileId,
//             requestBody: {
//                 modifiedTime: DateRFC3339() as string
//             },
//             media: {
//                 mimeType, // Ensure it's JSON
//                 body: bufferStream,          // Stream the new content
//             },
//         });

//         return response.data;
//     } catch (error) {
//         print('Error updating file content:' + (error as Data).message);
//         throw error;
//     }
// };


// export const addUser = async (path: string, newUser: Data) => {
//     try {
//         // print(path)
//         await ensureLocalDirectory();
//         await ensureLocalFile(path as string);

//         const pathSegments = path.split('/')

//         const data = await readLocalFile(pathSegments[pathSegments.length - 1] as string);
//         newUser.createdTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(/,/, '').replace(/\//g, '-').replace(' ', 'T') + 'Z';
//         newUser.id = crypto.randomBytes(16).toString('hex');

//         // Validate new user against the schema
//         const { isValid, errors: schemaErrors } = await User.validate(newUser, data);

//         if (!isValid) {
//             return { status: "error", message: `${schemaErrors}` };
//         }

//         (data ?? [] as object[])?.push(newUser);

//         await writeLocalFile(pathSegments[pathSegments.length - 1], data);
//         // print(path.split('/')[path.split('/').length - 2])

//         // Schedule a sync only if not already scheduled
//         scheduleSync(path);

//         return { status: "success", message: "User added successfully" };
//     } catch (error) {
//         print("Error adding user:" + (error as Data).message);
//         return error;
//     }
// };


// export const deleteUser = async (path: string, username: string) => {
//     try {

//         await ensureLocalFile(path); // Ensure local file is ready
//         print('Deleting the user...', 'blue')

//         const data = await readLocalFile(path.split('/')[path.split('/').length - 1]);
//         const updatedData = data.filter((user: any) => user.username !== username);
//         if (updatedData.length === data.length) throw new Error("User not found");

//         await writeLocalFile(path.split('/')[path.split('/').length - 1], updatedData);
//         print(`User '${username}' deleted successfully.`, 'green');

//         scheduleSync(path); // Schedule sync for 1 day

//         return { status: "success", message: "User deleted successfully" };
//     } catch (error) {
//         print("Error deleting user:" + (error as Data).message);
//         throw error;
//     }
// };

// export const editUser = async (path: string, username: string, updatedUserData: object) => {
//     try {
//         await ensureLocalDirectory();
//         await ensureLocalFile(path); // Ensure local file is ready

//         const data = await readLocalFile(path.split('/')[path.split('/').length - 1]);
//         const index = data.findIndex((user: any) => user.username === username);
//         if (index === -1) throw new Error("User not found");

//         const existingUser = data[index];
//         const updatedUser = { ...existingUser, ...updatedUserData, modifiedTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(/,/, '').replace(/\//g, '-').replace(' ', 'T') + 'Z' };

//         // Validate updated user data (excluding current user from unique checks)
//         const { isValid, errors: schemaErrors } = await User.validate(updatedUser, data.filter((_, i) => i !== index));
//         if (!isValid) {
//             throw new Error(`${schemaErrors}`);
//         }

//         data[index] = updatedUser;

//         await writeLocalFile(path.split('/')[path.split('/').length - 1], data);

//         scheduleSync(path); // Schedule sync for 1 day

//         return { status: "success", message: "User updated successfully" };
//     } catch (error) {
//         print("Error updating user:" + (error as Data).message);
//         throw error;
//     }
// };