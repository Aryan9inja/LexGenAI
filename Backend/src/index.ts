import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./db";

dotenv.config();

async function main() {
  try {
    console.log("Starting server...");
    await connectDB();
    app.listen(process.env.PORT || 5000, () => {
      console.log("Server is running on port 5000");
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
