import { CryptoService } from "@/lib/encryption";
import { tokenManager } from "@/lib/token-manager";
import { prisma } from "@/prisma.config";
import { NextFunction, Request, Response } from "express";

// Middleware for validation
export const validateRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const access_token = req.headers["x-refresh-token"];
        if (!access_token) {
            res.status(401).json({ error: "Missing credentials, please add refersh_token!" });
            return;
        }
        if (access_token && access_token) {
            const tokenDetails = (access_token as string).split(':')
            const token = await CryptoService.decryptData(tokenDetails[1], tokenDetails[0], tokenDetails[2])

            const decoded_token = token

            // const decoded_token = TokenManager.decodeToken(access_token.split(' ').pop()!);
            // console.log(decoded_token);
            // const parsedToken: OAuth2Client = await JSON.parse(decoded_token?.token ?? '');
            // const parsedToken: Credentials = await JSON.parse(decoded_token ?? '');
            tokenManager.oAuth2Client.setCredentials(JSON.parse(token!));
            // tokenManager.oAuth2Client.setCredentials(await tokenManager.refreshAccessToken());
            // await tokenManager.oAuth2Client.refreshAccessToken()
        }

        const { credentials } = tokenManager.oAuth2Client;
        // console.log(credentials)
        if (Object.keys(credentials).length === 0) {
            const originalRoute = req.originalUrl;
            res.redirect(`/google-service/auth?redirect=${encodeURIComponent(originalRoute)}`);
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};