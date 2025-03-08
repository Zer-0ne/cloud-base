import { tokenManager } from "@/lib/token-manager";
import { validateRequest } from "@/middleware/validate-request";
import { prisma } from "@/prisma.config";
import { Request, Response, Router } from "express";

const api_route = Router();
const actions = {
    can_make_multiple_apis: (user: any) => {
        user.canMakeMultipleApis = true;
    },
    has_api_access: (user: any) => {
        user.hasApiAccess = true;
    },
};

const grantAccess = async (type: keyof typeof actions, current_user_id: string) => {
    const current_user = await tokenManager.getUserProfile();
    actions[type](current_user);
    return await prisma.user.update({
        where: {
            id: current_user_id,
        },
        data: {
            hasApiAccess: current_user.hasApiAccess,
            canMakeMultipleApis: current_user.canMakeMultipleApis
        }
    })
};

api_route.post('/api-creation-request', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }
        const { type, user_id, approved } = req.body
        if (approved && current_user.role === 'admin') {
            await grantAccess(type, user_id);
            res.json({ message: "Access granted" });
            return
        }
        if (current_user.role === 'admin') {
            await grantAccess(type, user_id)
            res.json({ message: 'As an admin, you do not need to request approval; your access is automatically granted.' })
            return
        }
        res.json({
            message: "Access request sent for approval",
        })
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
    }
})

api_route.get('/api-creation-request', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }
        if (!(current_user.role === 'admin')) {
            res.status(401).json({ message: "You do not have permission to view this page" })
            return
        }
        const all_requests = await prisma.request.findMany()
        res.json({ data: all_requests })
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: (error as Error).message })
        return
    }
})