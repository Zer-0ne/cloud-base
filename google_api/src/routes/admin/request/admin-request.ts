import { Request, Response, Router } from 'express';
import nodemailer from 'nodemailer'
import crypto from 'crypto';
import { validateRequest } from '@/middleware/validate-request';
import { tokenManager } from '@/lib/token-manager';
import { prisma } from '@/prisma.config';
import { redisClient } from '@/redis.config';
import { actionType, ActionTypeKeys } from '@/lib/request-manager';

const admin_request_router: Router = Router()
const generateOTP = (): string => {
    // Generate cryptographically strong random bytes
    const buffer = crypto.randomBytes(4); // 4 bytes = 32 bits

    // Convert to an integer (using only 30 bits to avoid negative numbers)
    const randomValue = buffer.readUInt32BE(0) & 0x3FFFFFFF;

    // Scale to 6 digits (between 100000 and 999999)
    const sixDigitOTP = (randomValue % 900000) + 100000;

    return sixDigitOTP.toString();
};

admin_request_router.get('/request-for-secret-key', validateRequest, async (req: Request, res: Response) => {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_ACCOUNT,
            pass: process.env.GMAIL_PASS,
        },
    });
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const otp = generateOTP();
        const existing_otp = await redisClient.get(`${current_user.username}_admin_request_otp`);
        const limitKey = `${current_user.username}_request_limit`;
        const maxRequests = 3;
        const expirationTime = 86400; // 1 day in seconds
        // Step 1: Check the current request count
        // Step 1: Current request count check karo
        const existing_limit = await redisClient.get(limitKey);

        // Step 2: Request count update karo
        if (existing_limit) {
            await redisClient.set(limitKey, Number(existing_limit) + 1);
        } else {
            await redisClient.set(limitKey, 1, 'EX', expirationTime);
        }

        // Step 3: Limit exceed check karo
        if (Number(existing_limit) >= maxRequests) {
            // Step 4: Redis se TTL fetch karo
            const ttl = await redisClient.ttl(limitKey);

            console.log(ttl,)
            // Step 5: Remaining time calculate karo
            if (ttl > 0) {
                const hours = Math.floor(ttl / 3600);
                const minutes = Math.floor((ttl % 3600) / 60);
                const seconds = ttl % 60;
                const remainingTime = `${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;

                // Step 6: Client ko response bhejo
                res.status(400).json({
                    message: `You have exceeded the maximum number of requests. Try again in ${remainingTime}.`
                });
            } else {
                res.status(400).json({
                    message: "You have exceeded the maximum number of requests. Try again later."
                });
            }
            return;
        }
        if (existing_otp) {
            res.status(400).json({ message: "You have already requested for secret key" });
            return;
        }
        await redisClient.set(`${current_user.username}_admin_request_otp`, otp, 'EX', 600); // 10 minutes


        // send mail to user
        let mailOptions = {
            from: process.env.GMAIL_ACCOUNT,
            to: 'ks2445988@gmail.com', // Admin's email
            subject: '🛡️ New Admin Access Request - Approval Needed!',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
                    <div style="max-width: 500px; background: white; padding: 20px; margin: auto; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #333;">🔔 Admin Access Request</h2>
                        <p style="color: #555; font-size: 16px;">Hello <b>Owner</b>,</p>
                        <p style="color: #555; font-size: 16px;">
                            User <b>${current_user.name}</b> (<i>${current_user.email}</i>) has requested admin access.
                        </p>
                        <p style="color: #555; font-size: 16px;">
                            To approve this request, use the following OTP:
                        </p>
                        <p style="font-size: 22px; font-weight: bold; color: #007bff; background: #f8f9fa; padding: 10px; border-radius: 5px; display: inline-block;">
                            ${otp}
                        </p>
                        <p style="color: #555; font-size: 14px;">This OTP is valid for <b>10 minutes</b>. Do not share it with anyone.</p>
                        <p style="color: red; font-size: 14px;">If you did not initiate this request, please ignore this email.</p>
                        <hr style="border: 0.5px solid #ddd;">
                        <p style="color: #888; font-size: 12px;">This is an automated message, please do not reply.</p>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({
            message: `OTP sent to owner email: ks2445988@gmail.com`,
            button: {
                label: `click here to mail`,
                link: "mailto:ks2445988@gmail.com",
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


admin_request_router.post('/request-admin', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized: Please log in to request admin access." });
            return;
        }

        const { otp } = req.body;

        // Check if any admin exists
        if (otp) {
            const get_otp = await redisClient.get(`${current_user.username}_admin_request_otp`);
            if (!get_otp) {
                res.status(400).json({ message: "Invalid OTP: The OTP has either expired or has already been used. Please request a new OTP." });
                return;
            }
            if (get_otp !== otp) {
                res.status(400).json({ message: "Invalid OTP: The OTP you entered does not match. Please check and try again." });
                return;
            }

            // Update user role to admin
            await prisma.user.update({
                where: { username: current_user.username! },
                data: { role: 'admin' }
            });

            // Delete the OTP from Redis
            await redisClient.del(`${current_user.username}_admin_request_otp`);

            res.status(200).json({
                message: "Congratulations! You are now an admin user.",
            });
            return;
        } else {
            // Admins exist: create a pending request for admin approval
            const existingRequest = await prisma.request.findFirst({
                where: {
                    userId: current_user.username!,  // User's username (ensure it's non-nullable)
                    type: "admin_request",            // Request type is "admin_request"
                    status: "pending",                // Request status is "pending"
                },
            });

            if (existingRequest) {
                res.status(400).json({
                    message: `You already have a pending admin access request. Request ID: ${existingRequest.id}. Please wait for approval.`,
                });
                return
            }

            // If no existing pending request, create a new one
            const adminRequest = await prisma.request.create({
                data: {
                    userId: current_user.username!,
                    type: "admin_request",
                    status: "pending",
                },
            });

            res.status(200).json({
                message: `Your request for admin access has been submitted. Please wait for approval. Your Request ID: ${adminRequest.id}`,
                requestId: adminRequest.id,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error: Please try again later." });
    }
});


admin_request_router.get('/', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized: Please log in to request admin access." });
            return;
        }
        if (current_user.role !== 'admin') {
            res.status(403).json({ message: "Forbidden: Only admins can view admin requests." });
            return;
        }
        const requests = await prisma.request.findMany();
        res.json({ data: requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error: Please try again later." });
    }
});

admin_request_router.get('/user/:id', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized: Please log in to request admin access." });
            return;
        }
        if (current_user.role !== 'admin') {
            res.status(403).json({ message: "Forbidden: Only admins can view admin requests." });
            return;
        }
        const { id } = req.params
        const requests = await prisma.request.findMany({
            where: {
                userId: id
            }
        });
        res.json({ data: requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error: Please try again later." });
    }
});

// action on request
admin_request_router.post('/:id', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized: Please log in to request admin access." });
            return;
        }
        if (current_user.role !== 'admin') {
            res.status(403).json({ message: "Forbidden: Only admins can view admin requests." });
            return;
        }
        const { status, type } = req.body
        const { id } = req.params;
        // await prisma.request.update({
        //     where: { id },
        //     data: { status },
        // });
        await actionType[type as ActionTypeKeys](id, status)
        res.json({ message: "Admin request status updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error: Please try again later." })
    }
})


admin_request_router.post('/api-creation-request/:id', validateRequest, async (req: Request, res: Response) => {
    try {
        const current_user = await tokenManager.getUserProfile();
        if (!current_user) {
            res.status(401).json({ message: "Unauthorized: Please log in to request admin access." });
            return;
        }
        if (current_user.role !== 'admin') {
            res.status(403).json({ message: "Forbidden: Only admins can view admin requests." });
            return;
        }
        const { id } = req.params;
        // Admins exist: create a pending request for admin approval
        const existingRequest = await prisma.request.findFirst({
            where: {
                userId: current_user.username!,  // User's username (ensure it's non-nullable)
                type: "admin_request",            // Request type is "admin_request"
                status: "pending",                // Request status is "pending"
            },
        });

        if (existingRequest) {
            res.status(400).json({
                message: `You already have a pending admin access request. Request ID: ${existingRequest.id}. Please wait for approval.`,
            });
            return
        }
        const request = await prisma.request.create({
            data: {
                type: id,
                status: 'pending',
                userId: current_user.username,
            }
        })
        res.status(200).json({
            message: `Your request for admin access has been submitted. Please wait for approval. Your Request ID: ${request.id}`,
            requestId: request.id,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error: Please try again later." })

    }
})


export default admin_request_router;