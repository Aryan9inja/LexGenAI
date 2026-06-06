import dotenv from "dotenv";
import path from "path";
import app from "./app";
import { connectDB } from "./db";
import { initializeVectorStore, needsReindexing } from "./initialize";
import {logger} from "./utils/logger";

// Load .env from Backend directory (parent of src)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || ["http://localhost:3000"];
logger.info("Server", `CORS allowed origins: [${allowedOrigins.join(", ")}]`);

async function main() {
  try {
    console.log("Starting server...");
    
    // Connect to database
    await connectDB();
    
    // Start server immediately
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      logger.info("Server", "Server ready and accepting requests");

      // Initialize vector store in the background
      (async () => {
        try {
          const reindexingNeeded = await needsReindexing();
          if (reindexingNeeded) {
            logger.info("Server", "Initializing RAG vector store in background...");
            await initializeVectorStore();
            logger.info("Server", "RAG vector store initialization completed");
          } else {
            logger.info("Server", "RAG vector store already initialized, skipping background indexing");
          }
        } catch (error) {
          logger.error("Server", "Background RAG initialization failed", error);
        }
      })();
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
