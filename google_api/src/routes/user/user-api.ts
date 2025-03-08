import { ApiManager } from "@/lib/api-key-manager";
import { DriveManager } from "@/lib/drive-manager";
import { TokenManager } from "@/lib/jwt-token-manager";
import { tokenManager } from "@/lib/token-manager";
import { validateRequest } from "@/middleware/validate-request";
import { convertBigIntToString } from "@/utils/constant";
import { Request, Response, Router } from "express";

export const userApiRoute = Router();

userApiRoute.post('/api-creation', async (req: Request, res: Response): Promise<void> => {
    try {
        // tokenManager.oAuth2Client.setCredentials(await tokenManager.refreshAccessToken())
        const current_user = await tokenManager.getUserProfile();
        // await tokenManager.verifyToken()
        if (!current_user) {
            res.status(401).json({ message: 'Please login' });
            return
        }

        if (!current_user?.hasApiAccess) {
            res.status(403).json({
                error: "You do not have access to create API",
                button: {
                    label: "API Creation Request for Admin",
                    link: "/api/admin/request/api-creation-request/has_api_access",
                    method: "POST",
                    body: {
                        type: "has_api_access",
                        user_id: current_user.username,
                    },
                },
            });
            return
        }

        if (current_user.apiKeys.length > 1 && !current_user?.canMakeMultipleApis) {
            res.status(403).json({
                error: "You do not have permission to create multiple APIs",
                button: {
                    label: "Request Permission to Create API",
                    link: "/api/admin/request/api-creation-request/can_make_multiple_apis",
                    method: "POST",
                    body: {
                        type: "can_make_multiple_apis",
                        user_id: current_user.username,
                    },
                },
            });
            return
        }

        // Parse the request body
        const { name } = req.body;

        // Create an instance of ApiManager and generate the token
        const apiManager = new ApiManager(current_user.username, name);
        const token = await apiManager.generateKey();

        res.status(201).json({
            data: { token },
            message: "Token Created Successfully",
        });
    } catch (error) {
        console.error("Error in API Creation:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

userApiRoute.get('/api-keys', validateRequest, async (req: Request, res: Response): Promise<void> => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: 'Please login' });
            return;
        }

        // Agar user ke paas koi API key na ho, to API creation page par redirect kar do.
        if (!current_user.apiKeys || current_user.apiKeys.length === 0) {
            return res.status(302).redirect("/api/user/api-creation");
        }

        const tokensWithStorage = [];
        const driveManager = new DriveManager();

        // Har API key ke liye token generate karo aur us token se storage details fetch karo.
        for (const key of current_user.apiKeys) {
            const token = await TokenManager.createToken({
                accessKey: key.accessKey,
                name: key.name!,
                userId: current_user.username,
            });

            // Token ke through storage details obtain karo
            const storageData = await driveManager.getAllocatedStorageForApi(token!);
            const processedStorage = convertBigIntToString(storageData);

            tokensWithStorage.push({
                name: key.name,
                token,
                storage: processedStorage
            });
        }

        res.json({ data: tokensWithStorage });
    } catch (error) {
        console.error("Error fetching API keys with storage:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

userApiRoute.delete('/api-key', validateRequest, async (req: Request, res: Response) => {
    const current_user = await tokenManager.getUserProfile();
    if (!current_user) {
        res.status(401).json({ message: 'Please login' });
        return
    }

    // Parse the request body
    const { token } = req.body;
    if (!token) {
        res.status(400).json({ message: 'Token is required!' })
        return
    }

    // Verify the token
    const { accessKey } = await TokenManager.verifyToken(token);
    if (!accessKey) {
        res.status(400).json({ message: 'Invalid token' })
        return
    }

    // Create an instance of ApiManager and delete the access key
    const apiManager = new ApiManager(current_user.username);
    await apiManager.delete(accessKey);
    res.json({ message: 'Access key deleted successfully' })
})

