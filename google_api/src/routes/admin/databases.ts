import express, { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { tokenManager } from '@/lib/token-manager';
import { validateRequest } from "@/middleware/validate-request";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the router
const databaseRouter: Router = express.Router();

// Interface for the API response
interface TableResponse {
    data: { serializedData: any[], totalPages: number };
}

// Configuration for each table: Prisma model, searchable fields, and fields to select
interface TableConfig {
    model: any;
    searchFields: string[];
    select: Record<string, boolean>;
}

const tableConfigs: Record<string, TableConfig> = {
    users: {
        model: prisma.user,
        searchFields: ['username', 'email'],
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            max_allocated_space: true,
            hasApiAccess: true,
            canMakeMultipleApis:true
        },
    },
    posts: {
        model: prisma.post,
        searchFields: ['name'],
        select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            userId: true,
        },
    },
    drives: {
        model: prisma.drive,
        searchFields: ['serviceId'],
        select: {
            id: true,
            serviceId: true,
            limit: true,
            usage: true,
            alloted: true,
        },
    },
    apiKeys: {
        model: prisma.api_key,
        searchFields: ['accessKey'],
        select: {
            id: true,
            accessKey: true,
            userId: true,
            limit: true,
            totalUsage: true,
        },
    },
    userAnalytics: {
        model: prisma.userAnalytics,
        searchFields: ['userId'],
        select: {
            userId: true,
            totalStorageUsed: true,
            totalApiUsage: true,
            totalFilesUploaded: true,
            userType: true,
        },
    },
};

// Function to serialize BigInt fields to strings
function serializeData(data: any[]): any[] {
    return data.map((item) => {
        const serializedItem: Record<string, any> = {};
        for (const [key, value] of Object.entries(item)) {
            serializedItem[key] = typeof value === 'bigint' ? value.toString() : value;
        }
        return serializedItem;
    });
}

// API endpoint: GET /api/table/:tableName?page=1&search=
databaseRouter.get('/:tableName', validateRequest, async (req: Request, res: Response) => {

    // Check session validity
    const current_user = await tokenManager.getUserProfile()
    if (!current_user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const { tableName } = req.params;
    const config = tableConfigs[tableName];

    // Check if table exists
    if (!config) {
        res.status(404).json({ error: 'Table not found' });
        return
    }

    // Extract pagination and search parameters
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    // Build search filter
    const where: any = search
        ? {
            OR: config.searchFields.map((field) => ({
                [field]: { contains: search, mode: 'insensitive' },
            })),
        }
        : {};

    try {
        // Fetch data with pagination and specific fields
        const data = await config.model.findMany({
            where,
            select: config.select,
            skip,
            take: pageSize,
        });

        // Get total count for pagination
        const total = await config.model.count({ where });
        const totalPages = Math.ceil(total / pageSize);

        // Serialize data to handle BigInt
        const serializedData = serializeData(data);

        // Send response
        res.json({ data: { serializedData, totalPages } } as TableResponse);
    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

export default databaseRouter;