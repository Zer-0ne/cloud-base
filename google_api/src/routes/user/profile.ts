import { tokenManager } from "@/lib/token-manager";
import { validateRequest } from "@/middleware/validate-request";
import { convertBigIntToString } from "@/utils/constant";
import { Request, Response, Router } from "express";

export const userProfileRouter = Router();

userProfileRouter.get('/', validateRequest, async (req: Request, res: Response) => {
    try {
        const user_porfile = await tokenManager.getUserProfile();
        res.json({ data: { ...convertBigIntToString(user_porfile) } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to get user profile' });
    }
})