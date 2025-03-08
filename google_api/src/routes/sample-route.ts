import { UserAnalytics } from "@/lib/models/schema-model";
import { Router, Request, Response } from "express";
import crypto from 'crypto'
import { prisma } from "@/prisma.config";

const router = Router();

router.get("/hello", async (req: Request, res: Response) => {
  // const data = await prisma.user.create({
  //   data: {
  //     username: "john_doe",
  //     email: "john@example.com",
  //     role: "user",
  //     image: "https://example.com/profile.jpg",
  //     keys: ["key1", "key2"],
  //     hasApiAccess: true,
  //     canMakeMultipleApis: false,
  //     createdTime: new Date().toISOString(),
  //     name: "John Doe",

  //     // Create related posts
  //     posts: {
  //       create: [
  //         {
  //           name: "My Document",
  //           size: 1024,
  //           parents: ["root"],
  //           webViewLink: "https://drive.google.com/view",
  //           modifiedTime: new Date().toISOString()
  //         }
  //       ]
  //     },

  //     // Create API keys
  //     apiKeys: {
  //       create: [
  //         {
  //           key: "api_key_123",
  //           name: "My API Key",
  //           totalUsage: 0
  //         }
  //       ]
  //     },

  //     // Create requests
  //     requests: {
  //       create: [
  //         {
  //           type: "DRIVE_ACCESS",
  //           status: "pending",
  //           details: { reason: "Need additional storage" }
  //         }
  //       ]
  //     },

  //     // Create user analytics
  //     userAnalytics: {
  //       create: {
  //         totalStorageUsed: 1024,
  //         totalApiUsage: 50,
  //         totalFilesUploaded: 5,
  //         lastLoginTime: new Date().toISOString(),
  //         userType: "regular",
  //         userPlanType: "basic",

  //         contentInteractions: {
  //           create: [{
  //             contentId: "file_123",
  //             interactionType: "VIEW",
  //             id: 'sjs',
  //             interactionTime: new Date().toISOString()
  //           }]
  //         } as any,

  //         // recentActivities: {
  //         //   create: {
  //         //     activityType: "FILE_UPLOAD",
  //         //     activityTime: new Date().toISOString()
  //         //   }
  //         // } as any,

  //         // requestStatuses: {
  //         //   create: {
  //         //     status: "APPROVED",
  //         //     id: 'sdshdsdh',
  //         //     userAnalyticsId: 'sjkdjs',
  //         //     requestId: "req_123"
  //         //   } as any
  //         // } as any,

  //         // userDeviceInfo: {
  //         //   create: {
  //         //     deviceType: "Desktop",
  //         //     deviceOS: "Windows 11",
  //         //     id: 'jsksjs',
  //         //     userAnalyticsId: 'sjkddssdkh'
  //         //   } as any
  //         // } as any,

  //         // userFeedback: {
  //         //   create: {
  //         //     feedbackText: "Great service!",
  //         //     id: 'skdjksk',
  //         //     userAnalyticsId: 'jdskjs',
  //         //     feedbackTime: new Date().toISOString()
  //         //   }
  //         // } as any
  //       }
  //     }
  //   },
  //   include: {
  //     posts: true,
  //     apiKeys: true,
  //     requests: true,
  //     userAnalytics: {
  //       // include: {
  //       //   contentInteractions: true,
  //       //   RecentActivity: true,
  //       //   RequestStatus: true,
  //       //   UserDeviceInfo: true,
  //       //   UserFeedback: true
  //       // } as any
  //     }
  //   }
  // });



  // const newUser = await prisma.user.create({
  //   data: {
  //     username: 'john_doe',
  //     email: 'john.doe@example.com',
  //     // other user fields
  //   },
  // });
  // const newPost = await prisma.post.create({
  //   data: {
  //     title: 'My First Post',
  //     content: 'This is the content of my first post.',
  //     user: {
  //       connect: { id: newUser.id }, // Connects the post to the existing user
  //     },
  //   },
  // });

  // const data = await prisma.user.findUnique({
  //   where: {
  //     username: 'john_doe',
  //   },
  //   include: {
  //     posts: true, // Includes all related posts
  //     apiKeys: true, // Includes all related API keys
  //     requests: true, // Includes all related requests
  //     drives: true, // Includes all related drives
  //     userAnalytics: true, // Includes related user analytics
  //   },
  // });


  res.json({ message: "Hello from the routes file sahil khan!", });
});

// Export the router
export default router;
