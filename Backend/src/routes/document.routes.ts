import { Router } from "express";
import rateLimit from "express-rate-limit";
import { 
  create, 
  generate, 
  analyzeRisk, 
  getDocument, 
  getAllUserDocuments, 
  updateDocument,
  answerQuestions,
  getQuestions,
  applySuggestion,
  applyAllSuggestions,
  getSuggestionQuestionController
} from "../controllers/document.controller";
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
documentRouter.post("/answer-questions", documentLimiter, requireAuth, answerQuestions);
documentRouter.post("/suggestion-question", aiLimiter, requireAuth, getSuggestionQuestionController);
documentRouter.post("/apply-suggestion", aiLimiter, requireAuth, applySuggestion);
documentRouter.post("/apply-all-suggestions", aiLimiter, requireAuth, applyAllSuggestions);
documentRouter.get("/", documentLimiter, requireAuth, getAllUserDocuments);
documentRouter.get("/:documentId/questions", documentLimiter, requireAuth, getQuestions);
documentRouter.get("/:id", documentLimiter, requireAuth, getDocument);
documentRouter.put("/:id", documentLimiter, requireAuth, updateDocument);

export default documentRouter;