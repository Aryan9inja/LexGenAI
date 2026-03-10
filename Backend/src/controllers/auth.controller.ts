import { Request, Response } from "express";
import {
  loginUser,
  registerUser,
  toSafeUser,
  type AuthBody,
} from "../services/auth.service";
import { logger } from "../utils/logger";

const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const register = async (req: Request, res: Response) => {
  logger.debug("register", "Register endpoint called", { ip: req.ip });

  try {
    const { name, email, password } = req.body as AuthBody;

    if (!name || !email || !password) {
      logger.warn("register", "Missing required fields", { email, hasName: !!name, hasPassword: !!password });
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    if (!isEmail(email)) {
      logger.warn("register", "Invalid email format", { email });
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      logger.warn("register", "Password too short", { email });
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await registerUser(name.trim(), email.toLowerCase().trim(), password);
    const token = user.generateJWT();

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 3600000, // 1 hour
    });

    logger.info("register", "User registration successful", { userId: user._id, email });

    return res.status(201).json({
      message: "User registered successfully",
      user: toSafeUser(user),
    });
  } catch (err) {
    const error = err as Error;
    if (error.message === "User already exists") {
      logger.warn("register", "Registration failed: user already exists");
      return res.status(409).json({ message: error.message });
    }

    logger.error("register", `Registration error: ${error.message}`);
    return res.status(500).json({ message: "Failed to register user" });
  }
};

export const login = async (req: Request, res: Response) => {
  logger.debug("login", "Login endpoint called", { ip: req.ip });

  try {
    const { email, password } = req.body as AuthBody;

    if (!email || !password) {
      logger.warn("login", "Missing email or password", { email });
      return res.status(400).json({ message: "email and password are required" });
    }

    logger.debug("login", "Attempting to authenticate user", { email });
    const { user, token } = await loginUser(email.toLowerCase().trim(), password);

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 3600000, // 1 hour
    });

    logger.info("login", "User login successful", { userId: user._id, email });

    return res.status(200).json({
      message: "Login successful",
      user: toSafeUser(user),
    });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Invalid credentials") {
      logger.warn("login", "Login failed: invalid credentials", { body: { email: req.body.email } });
      return res.status(401).json({ message: error.message });
    }

    logger.error("login", `Login error: ${error.message}`);
    return res.status(500).json({ message: "Failed to login" });
  }
};

export const me = async (req: Request, res: Response) => {
  logger.debug("me", "Me endpoint called", { userId: req.user?._id });

  if (!req.user) {
    logger.warn("me", "Me endpoint: user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  logger.info("me", "Me endpoint: fetched user info", { userId: req.user._id });

  return res.status(200).json({
    user: toSafeUser(req.user),
  });
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  logger.info("logout", "User logged out", { userId: req.user?._id });

  return res.status(200).json({ message: "Logout successful" });
};