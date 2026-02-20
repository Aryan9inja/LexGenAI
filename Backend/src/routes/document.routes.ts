import { Router } from "express";
import rateLimit from "express-rate-limit";
import { create, generate, analyzeRisk, getDocument } from "../controllers/document.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const documentRouter = Router();

const documentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI request limit reached, please try again later." },
});

documentRouter.post("/create", documentLimiter, requireAuth, create);
documentRouter.post("/generate", aiLimiter, requireAuth, generate);
documentRouter.post("/analyze-risk", aiLimiter, requireAuth, analyzeRisk);
documentRouter.get("/:id", documentLimiter, requireAuth, getDocument);

export default documentRouter;
