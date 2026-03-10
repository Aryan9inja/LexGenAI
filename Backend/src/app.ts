import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import documentRouter from "./routes/document.routes";

const app = express();

// Trust the first proxy (Railway, Render, Heroku, etc.) so that
// secure cookies and req.ip work correctly behind a reverse proxy
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Read lazily so dotenv has already been loaded by index.ts
      const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || ["http://localhost:3000"];
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin} not in [${allowedOrigins.join(", ")}]`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/api/auth", authRouter);
app.use("/api/documents", documentRouter);

export default app;
