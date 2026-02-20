import dotenv from "dotenv";
import path from "path";
import app from "./app";
import { connectDB } from "./db";
import { initializeVectorStore } from "./initialize";
import {logger} from "./utils/logger";

// Load .env from Backend directory (parent of src)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    console.log("Starting server...");
    
    // Connect to database
    await connectDB();
    
    // Initialize vector store with templates
    logger.info("Server", "Initializing RAG vector store...");
    await initializeVectorStore();
    
    // Start server
    app.listen(process.env.PORT || 5000, () => {
      console.log("Server is running on port 5000");
      logger.info("Server", "Server ready and accepting requests");
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
