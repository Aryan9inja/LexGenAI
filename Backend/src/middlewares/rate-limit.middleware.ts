import { Request } from "express";
import rateLimit from "express-rate-limit";

const toPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const apiRequestsPerMinute = toPositiveNumber(process.env.RATE_LIMIT_PER_MINUTE, 5);
const aiRequestsPerDay = toPositiveNumber(process.env.AI_RATE_LIMIT_PER_DAY, 10);

const getRequestIdentity = (req: Request): string => {
  const userId = req.user?._id?.toString();
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${req.ip || "unknown"}`;
};

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: apiRequestsPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a minute." },
});

export const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: aiRequestsPerDay,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRequestIdentity,
  message: { message: "Daily AI request limit reached. Please try again tomorrow." },
});
