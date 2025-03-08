import { google } from "googleapis";
import { tokenManager } from "./token-manager";
import { GoogleService } from "./google-service";

// create projects in our google cloud
export class ProjectManager extends GoogleService {
    initialize = async () => {
        await this.create_app_project()
        await this.enable_required_api()
        // console.log(this.projectId)
    }
    undelete_project = async (projectId: string) => {
        try {
            // Initialize the Cloud Resource Manager API
            const cloudResourceManager = google.cloudresourcemanager('v1');

            // Obtain authentication credentials
            const auth = await tokenManager.get_auth_token();

            // Construct the request
            const undeleteRequest = {
                projectId: projectId,
                auth: auth,
            };

            // Execute the request to undelete the project
            await cloudResourceManager.projects.undelete(undeleteRequest);

            console.log(`Project ${projectId} has been successfully restored.`);
        } catch (error) {
            console.error('Error restoring project:', error);
            throw error; // Rethrow the error for better error handling upstream
        }
    };


}

// const express = require('express');
// const { google } = require('googleapis');
// const app = express();
// const port = 3000;

// // Replace with your OAuth 2.0 credentials
// const CLIENT_ID = 'YOUR_CLIENT_ID';
// const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
// const REDIRECT_URI = 'YOUR_REDIRECT_URI';

// // Replace with your Google Cloud project ID
// const PROJECT_ID = 'YOUR_PROJECT_ID';

// // The API you want to enable, e.g., 'compute.googleapis.com'
// const API_NAME = 'API_TO_ENABLE';

// const oauth2Client = new google.auth.OAuth2(
//     CLIENT_ID,
//     CLIENT_SECRET,
//     REDIRECT_URI
// );

// // Generate the authorization URL
// const authUrl = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: ['https://www.googleapis.com/auth/cloud-platform'],
// });

// app.get('/auth', (req, res) => {
//     res.redirect(authUrl);
// });

// app.get('/oauth2callback', async (req, res) => {
//     const code = req.query.code;
//     const { tokens } = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(tokens);

//     // Enable the specified API
//     const serviceUsage = google.serviceusage({
//         version: 'v1',
//         auth: oauth2Client,
//     });

//     try {
//         await serviceUsage.services.enable({
//             name: `projects/${PROJECT_ID}/services/${API_NAME}`,
//         });
//         res.send(`API ${API_NAME} has been enabled successfully.`);
//     } catch (error) {
//         res.status(500).send(`Error enabling API: ${error.message}`);
//     }
// });

// app.listen(port, () => {
//     console.log(`App listening at http://localhost:${port}`);
//     console.log(`Authorize this app by visiting: http://localhost:${port}/auth`);
// });
