import User from "../Models/user.model";
import { logger } from "../utils/logger";

export type AuthBody = {
  name?: string;
  email?: string;
  password?: string;
};

export const toSafeUser = (user: Awaited<ReturnType<typeof User.findOne>> extends infer T
  ? T extends null
    ? never
    : T
  : never) => {
  const userObject = user.toObject();
  const { password: _password, ...safeUser } = userObject;
  return safeUser;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  logger.debug("registerUser", "Starting registration", { email });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("registerUser", "Registration failed: user already exists", { email });
      throw new Error("User already exists");
    }

    const user = new User({ name, email, password });
    await user.save();

    logger.info("registerUser", `User registered successfully`, { userId: user._id, email });
    return user;
  } catch (err) {
    const error = err as Error;
    logger.error("registerUser", `Registration error: ${error.message}`, { email });
    throw err;
  }
};

export const loginUser = async (email: string, password: string) => {
  logger.debug("loginUser", "Starting login attempt", { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("loginUser", "Login failed: user not found", { email });
      throw new Error("Invalid credentials");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn("loginUser", "Login failed: invalid password", { email });
      throw new Error("Invalid credentials");
    }

    const token = user.generateJWT();
    logger.info("loginUser", "User logged in successfully", { userId: user._id, email });

    return { user, token };
  } catch (err) {
    const error = err as Error;
    logger.error("loginUser", `Login error: ${error.message}`, { email });
    throw err;
  }
};

export const getUserById = async (userId: string) => {
  logger.debug("getUserById", "Fetching user", { userId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn("getUserById", "User not found", { userId });
      throw new Error("User not found");
    }

    logger.debug("getUserById", "User fetched successfully", { userId });
    return user;
  } catch (err) {
    const error = err as Error;
    logger.error("getUserById", `Error fetching user: ${error.message}`, { userId });
    throw err;
  }
};
