import { DriveManager } from "@/lib/drive-manager";
import { validateRequest } from "@/middleware/validate-request";
import { convertBigIntToString } from "@/utils/constant";
import { Request, Response, Router } from "express";

export const storageApi = Router();

storageApi.get('/', validateRequest, async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader) {
            throw new Error('Authorization header is missing!');
        }
        const tokens = authHeader?.split(' ').slice(1)
        if (!tokens) {
            throw new Error('Invalid token!');
        }
        const driveManager = new DriveManager();
        // Initialize aggregated data
        let totalUsage = 0;
        let totalLimit = 0;
        let allDrives: any[] = [];

        // Fetch and aggregate data from all tokens
        await Promise.all(tokens?.map(async (token) => {
            const data = await driveManager.getAllocatedStorageForApi(token);
            const { usage, limit, drives } = data!;

            totalUsage += Number(usage!);
            totalLimit += Number(limit!);

            const processedDrives = drives.map(drive => convertBigIntToString(drive));
            allDrives = allDrives.concat(processedDrives);
        }));

        const combinedData = convertBigIntToString({
            usage: totalUsage.toFixed(2),
            limit: totalLimit.toFixed(2),
            drives: allDrives,
        });

        res.json({ data: combinedData });
    } catch (error) {
        res.status(500).json({
            error: (error as Error).message,
            message: (error as Error).message
        });

    }
})