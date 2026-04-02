import { Router } from "express";
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
import { aiDailyLimiter } from "../middlewares/rate-limit.middleware";

const documentRouter = Router();

documentRouter.post("/create", requireAuth, create);
documentRouter.post("/generate", requireAuth, aiDailyLimiter, generate);
documentRouter.post("/analyze-risk", requireAuth, aiDailyLimiter, analyzeRisk);
documentRouter.post("/answer-questions", requireAuth, answerQuestions);
documentRouter.post("/suggestion-question", requireAuth, aiDailyLimiter, getSuggestionQuestionController);
documentRouter.post("/apply-suggestion", requireAuth, aiDailyLimiter, applySuggestion);
documentRouter.post("/apply-all-suggestions", requireAuth, aiDailyLimiter, applyAllSuggestions);
documentRouter.get("/", requireAuth, getAllUserDocuments);
documentRouter.get("/:documentId/questions", requireAuth, getQuestions);
documentRouter.get("/:id", requireAuth, getDocument);
documentRouter.put("/:id", requireAuth, updateDocument);

export default documentRouter;