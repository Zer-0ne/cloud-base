import Redis from "ioredis";

export const redisClient = new Redis({
    port: 6379,
    host: 'redis',
    password: process.env.REDIS_PASSWORD || "yourStrongPassword",
});
