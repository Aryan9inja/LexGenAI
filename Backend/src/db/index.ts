import mongoose from "mongoose";
import { logger } from "../utils/logger";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.debug("MongoDB connection","Mongo DB connected");
  } catch (err:unknown) {
    logger.error("MongoDB connection error:", (err as Error).message);
    process.exit(1);
  }
}