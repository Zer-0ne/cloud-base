import { prisma } from "@/prisma.config";
import { tokenManager } from "./token-manager";

export type ActionTypeKeys = 'has_api_access' | 'can_make_multiple_apis' | 'admin_request';

export const actionType: Record<ActionTypeKeys, (reqId: string, status: string) => Promise<any>> = {
    'has_api_access': (reqId: string, status: string) => hasApiAccess(reqId, status),
    'can_make_multiple_apis': (reqId: string, status: string) => canMakeMultipleApis(reqId, status),
    'admin_request': (reqId: string, status: string) => adminAccess(reqId, status),
}

const hasApiAccess = async (requestId: string, status: string) => {
    const request = await prisma.request.findUnique({
        where: { id: requestId }
    });
    const current_user = await tokenManager.getUserProfile();
    if (status.toLocaleLowerCase() !== 'approved') {
        return await prisma.request.update({
            where: { id: requestId },
            data: { status: status, grantedBy: (current_user).username }
        });
    }
    await prisma.user.update({
        where: { username: request?.userId },
        data: { hasApiAccess: true }
    });
    return await prisma.request.update({
        where: { id: requestId },
        data: { status: status, grantedBy: (current_user).username }
    });
}

const canMakeMultipleApis = async (requestId: string, status: string) => {
    const request = await prisma.request.findUnique({
        where: { id: requestId }
    });
    const current_user = await tokenManager.getUserProfile();
    if (status.toLocaleLowerCase() !== 'approved') {
        return await prisma.request.update({
            where: { id: requestId },
            data: { status: status, grantedBy: (current_user).username }
        });
    }
    await prisma.user.update({
        where: { username: request?.userId },
        data: { canMakeMultipleApis: true }
    });
    return await prisma.request.update({
        where: { id: requestId },
        data: { status: status, grantedBy: (current_user).username }
    });
}

const adminAccess = async (requestId: string, status: string) => {
    const request = await prisma.request.findUnique({
        where: { id: requestId }
    });
    const current_user = await tokenManager.getUserProfile();
    if (status.toLocaleLowerCase() !== 'approved') {
        return await prisma.request.update({
            where: { id: requestId },
            data: { status: status, grantedBy: (current_user).username }
        });
    }
    await prisma.user.update({
        where: { username: request?.userId },
        data: { role: 'admin' }
    });
    return await prisma.request.update({
        where: { id: requestId },
        data: { status: status, grantedBy: (current_user).username }
    });
}
