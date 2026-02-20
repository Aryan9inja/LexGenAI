import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../Models/user.model";
import { logger } from "../utils/logger";

type TokenPayload = JwtPayload & {
  id?: string;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.debug("requireAuth", "Auth middleware triggered", { path: req.path });

  try {
    const token = req.cookies.authToken;

    if (!token) {
      logger.warn("requireAuth", "Missing authentication cookie", { path: req.path });
      return res.status(401).json({ message: "Unauthorized" });
    }

    const secret = process.env.JWT_SECRET || "secret";

    logger.debug("requireAuth", "Verifying JWT token from cookie");

    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (!decoded.id) {
      logger.warn("requireAuth", "Token missing user ID");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      logger.warn("requireAuth", "User not found in database", { userId: decoded.id });
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    logger.debug("requireAuth", "User authenticated successfully", { userId: user._id, path: req.path });
    return next();
  } catch (err) {
    const error = err as Error;
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn("requireAuth", `JWT verification failed: ${error.message}`);
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn("requireAuth", "JWT token expired");
    } else {
      logger.error("requireAuth", `Authentication error: ${error.message}`);
    }
    
    return res.status(401).json({ message: "Unauthorized" });
  }
};