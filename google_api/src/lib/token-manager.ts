import { prisma } from "@/prisma.config";
import { AuthClient, BaseExternalAccountClient, Credentials, ExternalAccountClientOptions, Impersonated, JWTInput, OAuth2Client } from "google-auth-library";
import { CryptoService } from "@/lib/encryption";
import { google } from "googleapis";
import { GoogleAuth, JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { GoogleService } from "./google-service";
import { redisClient } from "@/redis.config";
interface GoogleApiError {
    response?: {
        status?: number;
    };
    message: string;
}
class TokenManager {
    private FULL_CLOUD_MANAGEMENT_SCOPES = [
        'https://www.googleapis.com/auth/cloud-platform',  // Full cloud management
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/cloud-platform.read-only', // Read-only access
        'https://www.googleapis.com/auth/cloudplatformprojects', // Project management
        'https://www.googleapis.com/auth/cloudplatformprojects.readonly', // Project read access
        'https://www.googleapis.com/auth/service.management', // Service management
        'https://www.googleapis.com/auth/service.management.readonly', // Service management read access
        'https://www.googleapis.com/auth/servicecontrol', // Service control API
        'https://www.googleapis.com/auth/userinfo.email' // User email access
    ];
    private ADMIN_FULL_ACCESS_SCOPES = [
        // Full Google Cloud Platform Access
        'https://www.googleapis.com/auth/cloud-platform',

        // Admin SDK Full Access
        'https://www.googleapis.com/auth/admin.directory.user', // Read/Write User Management
        'https://www.googleapis.com/auth/admin.directory.group', // Group Management
        'https://www.googleapis.com/auth/admin.directory.orgunit', // Organization Unit Management
        'https://www.googleapis.com/auth/admin.directory.domain', // Domain Management

        // Complete Service Management
        'https://www.googleapis.com/auth/service.management',
        'https://www.googleapis.com/auth/servicecontrol',

        // Comprehensive Project Management
        'https://www.googleapis.com/auth/cloudplatformprojects',

        // User Profile and Email
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',

        // Complete Resource Management
        // 'https://www.googleapis.com/auth/cloud-platform.read-only',

        // Google Drive Access
        'https://www.googleapis.com/auth/drive', // Full access to all files in Google Drive
        'https://www.googleapis.com/auth/drive.readonly', // Read-only access to all files in Google Drive
        'https://www.googleapis.com/auth/drive.file', // Access to files created or opened by the app
        'https://www.googleapis.com/auth/drive.metadata', // View and manage metadata of files in Google Drive
        'https://www.googleapis.com/auth/drive.metadata.readonly', // View metadata for files in Google Drive

        'https://www.googleapis.com/auth/iam',
    ];
    public oAuth2Client: OAuth2Client;
    constructor() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured');
        }

        this.oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/callback'
        );
    }

    generateAuthUrl(scopes: string[] = [], redirect?: string, isConsent = false): string {
        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: isConsent ? 'consent' : '', // Force consent to always get refresh token
            scope: [
                ...this.ADMIN_FULL_ACCESS_SCOPES,
                ...scopes,
            ],
            state: JSON.stringify({ redirect })
        });
    }

    async exchangeCodeForTokens(code: string): Promise<Credentials> {
        try {
            const { tokens } = await this.oAuth2Client.getToken(code);

            if (!tokens) {
                throw new Error('No tokens received from Google');
            }
            this.oAuth2Client.setCredentials(tokens);
            const { encrypted, iv, authTag } = await CryptoService.encryptData(
                JSON.stringify(tokens)
            );

            const userInfo = await this.getUserInfo();

            await this.saveUserAndTokens(userInfo, {
                encrypted,
                iv,
                authTag,
                id_token: tokens.id_token!
            });
            return tokens;
        } catch (error) {
            console.error('Token exchange error:', error);
            throw new Error(`Failed to exchange code for tokens: ${(error as Error).message}`);
        }
    }

    private async saveUserAndTokens(userInfo: any, tokenData: any) {
        await prisma.user.upsert({
            where: { username: userInfo.id },
            update: {
                email: userInfo.email,
                image: userInfo.picture,
                name: userInfo.given_name
            },
            create: {
                username: userInfo.id,
                email: userInfo.email,
                // Conditionally include max_allocated_space if the Redis value exists.
                ...(await redisClient.get("storage_limit") !== undefined && await redisClient.get("storage_limit") !== null
                    ? { max_allocated_space: `${(await redisClient.get("storage_limit"))!} GB` }
                    : {}),
                image: userInfo.picture,
                name: userInfo.given_name
            }
        });
    }

    async verifyToken(): Promise<boolean> {
        try {
            if (!this.oAuth2Client.credentials.access_token) {
                return false;
            }
            const oauth2 = google.oauth2('v2');
            await oauth2.userinfo.get({ auth: this.oAuth2Client });
            return true;
        } catch (error) {
            const apiError = error as GoogleApiError;
            if (apiError.response?.status === 401) {
                try {
                    await this.refreshAccessToken();
                    return this.verifyToken();
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    return false;
                }
            }
            return false;
        }
    }

    async refreshAccessToken(): Promise<Credentials> {
        try {
            if (this.isTokenExpired(this.oAuth2Client.credentials)) {
                const { credentials } = await this.oAuth2Client.refreshAccessToken();

                // Preserve the refresh token
                const updatedCredentials = {
                    ...credentials,
                    refresh_token: this.oAuth2Client.credentials.refresh_token
                };

                this.oAuth2Client.setCredentials(updatedCredentials);
                return updatedCredentials;
            }

            return this.oAuth2Client.credentials;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    private isTokenExpired(token: Credentials): boolean {
        return token.expiry_date ? new Date() > new Date(token.expiry_date) : true;
    }

    async getUserInfo() {
        const oauth2 = google.oauth2('v2');
        const { data } = await oauth2.userinfo.get({ auth: this.oAuth2Client });
        return data;
    }

    async handleGoogleAuth(code?: string, scopes: string[] = []): Promise<string | Credentials> {
        if (!code) {
            return this.generateAuthUrl(scopes);
        }
        return this.exchangeCodeForTokens(code);
    }

    async getUserProfile() {
        const oauth2 = google.oauth2('v2');
        const { data } = await oauth2.userinfo.get({ auth: this.oAuth2Client });

        return await prisma.user.upsert({
            where: { email: data.email! },
            update: {
                image: data.picture,
                name: data.given_name,
            },
            create: {
                username: data.id!,
                email: data.email!,
                image: data.picture!,
                name: data.given_name!,
                // Conditionally include max_allocated_space if the Redis value exists.
                ...(await redisClient.get("storage_limit") !== undefined && await redisClient.get("storage_limit") !== null
                    ? { max_allocated_space: `${(await redisClient.get("storage_limit"))!} GB` }
                    : {}),
            },
            include: {
                posts: true,
                apiKeys: true,
                drives: true,
                userAnalytics: true,
                Requests: true,
                grantedRequests: true,
            }
        });
    }
    async get_auth_token(serviceAccountEmail?: string) {
        if (serviceAccountEmail) {
            return await this.getServiceAccountToken(serviceAccountEmail);
        }

        if (Object.keys(this.oAuth2Client.credentials).length === 0) {
            await this.refreshAccessToken();
        }

        return this.oAuth2Client;
    }

    private async getServiceAccountToken(serviceAccountEmail: string) {
        // Ensure the source client has valid credentials
        if (Object.keys(this.oAuth2Client.credentials).length === 0) {
            await this.refreshAccessToken();
        }

        // Use the MAIN client, not a temporary one
        const impersonatedClient = new Impersonated({
            sourceClient: this.oAuth2Client, // <-- Use existing OAuth2Client
            targetPrincipal: serviceAccountEmail,
            lifetime: 3600,
            delegates: [], // Populate if using delegation
            targetScopes: this.ADMIN_FULL_ACCESS_SCOPES
        });
        // Get the access token from impersonated credentials
        const headers = await impersonatedClient.getRequestHeaders();
        // Extract token from the "Authorization" header
        const token = headers['Authorization'].replace('Bearer ', '');
        const impersonatedOAuth2Client = new OAuth2Client();
        impersonatedOAuth2Client.setCredentials({ access_token: token });
        return impersonatedOAuth2Client
    }


}

export const tokenManager = new TokenManager() 
