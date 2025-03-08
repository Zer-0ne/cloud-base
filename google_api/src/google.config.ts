import { Request, Response } from 'express';
import { AuthClient, BaseExternalAccountClient, ExternalAccountClientOptions, GoogleAuth, JWTInput, OAuth2Client } from 'google-auth-library';
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth';
import { google } from 'googleapis';
import { prisma } from './prisma.config';
import { CryptoService } from '@/lib/encryption';

// Initialize OAuth2 client with environment variables
const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID, // Google OAuth2 client ID
    process.env.GOOGLE_CLIENT_SECRET, // Google OAuth2 client secret
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/callback' // Redirect URI
);

// Step 1: Generate the authorization URL
export const generateAuthUrl = (scopes: string[] = [], redirect?: string): string => {
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/cloud-platform',
            ...scopes, // Additional scopes if provided
        ],
        state: JSON.stringify({ redirect })
    });
};

// Step 2: Exchange the authorization code for tokens
const exchangeCodeForTokens = async (code: string): Promise<any> => {
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens); // Save tokens for future use
        if (tokens) {
            // const { encrypted, iv, authTag } = await CryptoService.encryptData(JSON.stringify(tokens));
        }
        return tokens; // Return tokens
    } catch (error) {
        throw new Error(`Failed to exchange code for tokens: ${(error as Error).message}`);
    }
};

// Step 3: Main function to handle the authentication flow
export const handleGoogleAuth = async (
    code?: string, // Authorization code (optional)
    scopes: string[] = [], // Scopes for Google API
    customCredentials?: JWTInput | ExternalAccountClientOptions | undefined
): Promise<string | any> => {
    if (customCredentials) {
        return await auth(scopes, customCredentials)
    }
    if (!code) {
        // If no code is provided, return the auth URL
        const authUrl = generateAuthUrl(scopes);
        return authUrl;
    }

    // If code is provided, exchange it for tokens
    const tokens = await exchangeCodeForTokens(code);
    return tokens;
};

export const auth = async (
    Scopes: string[] = [],
    customCredentials?: JWTInput | OAuth2Client | ExternalAccountClientOptions
): Promise<AuthClient> => {
    try {
        const credentials = customCredentials ?? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}');
        const client = customCredentials instanceof OAuth2Client
            ? customCredentials
            : await google.auth.getClient({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive',
                    ...Scopes,
                ],
            });
        return client;
    } catch (error) {
        console.error('Error creating Google Sheets API client:', error);
        throw error; // Rethrow the error after logging it
    }
};

// const refreshAccessToken = async (userId: string) => {

//     try {
//         const tokenRecord = await prisma.token.findFirst({
//             where: { userId },
//             orderBy: { createdAt: 'desc' },
//         });
//         const token = JSON.parse(await CryptoService.decryptData(tokenRecord?.encrypted!, tokenRecord?.iv!, tokenRecord?.authTag!));

//         if (!token) {
//             throw new Error('No token found for user');
//         }

//         if (new Date() > token.expiresAt) {
//             oAuth2Client.setCredentials({
//                 refresh_token: token.refreshToken,
//             });

//             const { credentials } = await oAuth2Client.refreshAccessToken();
//             const { access_token, expiry_date } = credentials;

//             if (access_token && expiry_date) {
//                 const token = {
//                     ...tokenRecord,
//                     accessToken: access_token,
//                     expiresAt: new Date(expiry_date),
//                 }
//                 const { encrypted, iv, authTag } = await CryptoService.encryptData(JSON.stringify(token));
//                 await prisma.token.update({
//                     where: { id: token.id },
//                     data: {
//                         encrypted, iv, authTag
//                     },
//                 });
//             } else {
//                 throw new Error('Failed to refresh access token');
//             }
//         }

//         return token.accessToken;
//     } catch (error) {
//         console.error('Error refreshing access token:', error);
//         throw error;
//     }
// };


export { oAuth2Client };

