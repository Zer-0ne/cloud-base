import { ApiManager } from "@/lib/api-key-manager";
import { CryptoService } from "@/lib/encryption";
import { TokenManager } from "@/lib/jwt-token-manager";
import { ProjectManager } from "@/lib/project-manager";
import { tokenManager } from "@/lib/token-manager";
import { validateRequest } from "@/middleware/validate-request";
import { Request, Response, Router } from "express";
import { Credentials } from "google-auth-library";
import { URL } from 'url';

const googleServiceRoutes = Router();
// Helper function to get client origin
const getClientOrigin = (req: Request): string => {
    // Option 1: Use the Origin header (set in CORS requests)
    const origin = req.headers.origin;
    if (origin) return origin;

    // Option 2: Use Referer header as fallback
    const referer = req.headers.referer;
    if (referer) {
        try {
            const url = new URL(referer);
            return `${url.protocol}//${url.host}`;
        } catch (e) {
            // Invalid URL
        }
    }

    // Option 3: Use configured default
    return process.env.CLIENT_URL || 'http://localhost:3000';
};

// Step 1: Google Auth Route
googleServiceRoutes.get("/google-service/auth", async (req: Request, res: Response) => {
    try {
        const { redirect } = req.query;

        // Generate Google Auth URL
        const url = await tokenManager.generateAuthUrl(undefined, redirect as string, true);

        // Redirect to Google Auth
        res.redirect(url as string);
    } catch (error) {
        console.error("Error generating Google Auth URL:", error);
        res.status(500).json({ success: false, message: "Failed to generate Google Auth URL" });
    }
});

// Step 2: Google Auth Callback
googleServiceRoutes.get("/auth/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const { redirect } = state ? JSON.parse(state as string) : {};

    if (!code) {
        res.status(400).json({ type: 'AUTH_ERROR', error: 'Authorization code missing' });
        return
    }

    try {
        const tokens = await tokenManager.handleGoogleAuth(code as string);
        if (!tokens) {
            res.status(401).json({ type: 'AUTH_ERROR', error: 'Authentication failed' });
            return
        }

        const { encrypted, iv, authTag } = await CryptoService.encryptData(JSON.stringify(tokens));
        const token = `${iv}:${encrypted}:${authTag}`;
        const google = new ProjectManager();
        await google.initialize();
        await tokenManager.verifyToken()
        const redirectUrl = redirect ? decodeURIComponent(redirect as string) : getClientOrigin(req);
        console.log(redirectUrl)
        // res.json({
        //     success: true,
        //     token: token,
        // })

        // Redirect to frontend with token in URL
        res.redirect(`${redirectUrl}?token=${encodeURIComponent(token)}`);
    } catch (error) {
        res.redirect(`${getClientOrigin(req)}/auth-error?error=${encodeURIComponent((error as Error).message)}`);
    }
});

googleServiceRoutes.get(
    '/initialize',
    validateRequest,
    async (req: Request, res: Response) => {
        try {
            const google = new ProjectManager();
            await google.initialize();
            await tokenManager.verifyToken()
            res.json({ success: true, message: "Google Service initialized" });
        } catch (error) {
            console.error("Error initializing Google Service:", error);
            res.status(500).json({
                success: false,
                message: "Failed to initialize Google Service",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);



// Example protected route
googleServiceRoutes.get("/protected-route", validateRequest, async (req: Request, res: Response) => {
    res.json({
        message: "You have accessed a protected route!",
    });

});

googleServiceRoutes.post("/keys", async (req: any, res: any) => {
    try {
        // const sessionUser = await currentSession();

        // // Check if the user is logged in
        // if (!sessionUser?.user) {
        //     return res.status(401).json({ error: "Please login" });
        // }

        const currentUser = await tokenManager.getUserProfile();
        console.log(currentUser)
        await tokenManager.verifyToken()
        // console.log(currentUser)
        // if (!currentUser?.hasApiAccess) {
        //     return res.status(403).json({
        //         error: "You do not have access to create API",
        //         button: {
        //             label: "API Creation Request for Admin",
        //             link: "/api/admin/api-creation-request",
        //             method: "POST",
        //             body: {
        //                 type: "has_api_access",
        //                 user_id: currentUser.username,
        //             },
        //         },
        //     });
        // }

        // if (currentUser.keys.length > 1 && !currentUser?.canMakeMultipleApis) {
        //     return res.status(403).json({
        //         error: "You do not have permission to create multiple APIs",
        //         button: {
        //             label: "Request Permission to Create API",
        //             link: "/api/user/api-key/api-creation-request",
        //             method: "POST",
        //             body: {
        //                 type: "can_make_multiple_apis",
        //                 user_id: currentUser.username,
        //             },
        //         },
        //     });
        // }

        // Parse the request body
        const { name } = req.body;

        // Create an instance of ApiManager and generate the token
        const apiManager = new ApiManager(currentUser.username, name);
        const token = await apiManager.generateKey();

        res.status(201).json({
            data: { token },
            message: "Token Created Successfully",
        });
    } catch (error) {
        console.error("Error in POST handler:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

export { googleServiceRoutes };
