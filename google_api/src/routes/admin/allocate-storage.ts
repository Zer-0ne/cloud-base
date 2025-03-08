import { tokenManager } from "@/lib/token-manager";
import { validateRequest } from "@/middleware/validate-request";
import { prisma } from "@/prisma.config";
import { convertToBytes } from "@/utils/algo";
import { Request, Response, Router } from "express";

export const allocate_router = Router();

allocate_router.post('/allocate-storage', validateRequest, async (req: Request, res: Response) => {
    try {
        // Check session validity
        const current_user = await tokenManager.getUserProfile()
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }


        // Parse and validate request body
        const { key, space: NoiseSpace }: { key: string; space: string } = req.body;
        const space = Number(convertToBytes(NoiseSpace));
        // console.log(space)
        if (!key || typeof space !== 'number') {
            res.status(400).json({ message: "Invalid request" });
            return
        }

        // Decode token
        const { TokenManager } = await import('@/lib/jwt-token-manager');
        const accessToken = TokenManager.decodeToken(key);
        if (!accessToken?.accessKey) {
            res.status(401).json({ message: "Invalid token" });
            return
        }

        // Fetch API key details
        const api_key = await prisma.api_key.findUnique({
            where: {
                accessKey: accessToken?.accessKey
            }
        })
        if (!api_key) {
            res.status(404).json({ message: "API key not found" });
            return
        }
        if (space < 0) {
            res.status(400).json({ message: "Invalid space value" });
        }
        if (space === Number(api_key.limit)) {
            res.status(400).json({ message: "No changes to update" });
        }

        // Manage drive storage
        const { ApiManager } = await import('@/lib/api-key-manager');
        const apiManager = new ApiManager(api_key.userId!);
        if (space > Number(api_key.limit)) {
            await apiManager.increaseDriveStorage(accessToken.accessKey, space);
        } else if (space < Number(api_key.limit)) {
            // console.log(space)
            await apiManager.decreaseDriveStorage(accessToken.accessKey, space);
        }

        res.json({ message: 'Success' })
    } catch (error) {
        // console.log(error)
        res.status(500).json({ message: (error as Error).message ?? (error as Error) ?? "Internal Server Error", error: (error as Error).message ?? (error as Error) });
    }
})