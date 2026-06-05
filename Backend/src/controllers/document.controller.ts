import { Request, Response } from "express";
import {
  createDocument,
  generateDocumentContract,
  analyzeDocumentRisk,
  getDocumentById,
  getUserDocuments,
  updateDocumentText,
  submitAnswers,
  getPendingQuestions,
  applySuggestionToDocument,
  applyAllSuggestionsToDocument,
  getSuggestionQuestion,
} from "../services/document.service";
import { logger } from "../utils/logger";

export const create = async (req: Request, res: Response) => {
  try {
    const { title, plainTextDescription } = req.body as {
      title?: string;
      plainTextDescription?: string;
    };

    if (!plainTextDescription) {
      return res.status(400).json({ message: "plainTextDescription is required" });
    }

    const userId = req.user!._id.toString();
    const doc = await createDocument(userId, title ?? "Untitled Contract", plainTextDescription);
    return res.status(201).json({ message: "Document created", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.create", error.message);
    if (error.message.startsWith("INVALID_DESCRIPTION:")) {
      const reason = error.message.replace("INVALID_DESCRIPTION: ", "");
      return res.status(400).json({ message: reason });
    }
    return res.status(500).json({ message: "Failed to create document" });
  }
};

export const generate = async (req: Request, res: Response) => {
  try {
    const { documentId, forceGenerate } = req.body as { 
      documentId?: string;
      forceGenerate?: boolean;
    };
    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const doc = await generateDocumentContract(documentId, forceGenerate || false);
    return res.status(200).json({ message: "Contract generated", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.generate", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Open AI API credits vanished" });
  }
};

export const analyzeRisk = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body as { documentId?: string };
    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const doc = await analyzeDocumentRisk(documentId);
    return res.status(200).json({ message: "Risk analysis complete", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.analyzeRisk", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Contract text not generated yet") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to analyze risk" });
  }
};

export const getDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const doc = await getDocumentById(id);
    return res.status(200).json({ document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.getDocument", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to fetch document" });
  }
};
export const answerQuestions = async (req: Request, res: Response) => {
  try {
    const { documentId, answers } = req.body as {
      documentId?: string;
      answers?: Array<{ question: string; answer: string }>;
    };

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "answers array is required and must not be empty" });
    }

    const doc = await submitAnswers(documentId, answers);
    return res.status(200).json({ message: "Answers submitted successfully", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.answerQuestions", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to submit answers" });
  }
};

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params as { documentId?: string };

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const result = await getPendingQuestions(documentId);
    return res.status(200).json(result);
  } catch (err) {
    const error = err as Error;
    logger.error("document.getQuestions", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to retrieve questions" });
  }
};
export const getAllUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const docs = await getUserDocuments(userId);
    return res.status(200).json({ documents: docs });
  } catch (err) {
    const error = err as Error;
    logger.error("document.getAllUserDocuments", error.message);
    return res.status(500).json({ message: "Failed to fetch documents" });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const { contractText } = req.body as { contractText?: string };

    if (!contractText) {
      return res.status(400).json({ message: "contractText is required" });
    }

    const doc = await updateDocumentText(id, contractText);
    return res.status(200).json({ message: "Document updated", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.updateDocument", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update document" });
  }
};

export const getSuggestionQuestionController = async (req: Request, res: Response) => {
  try {
    const { documentId, riskIndex } = req.body as {
      documentId?: string;
      riskIndex?: number;
    };

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }
    if (riskIndex === undefined || riskIndex === null) {
      return res.status(400).json({ message: "riskIndex is required" });
    }

    const result = await getSuggestionQuestion(documentId, riskIndex);
    return res.status(200).json(result);
  } catch (err) {
    const error = err as Error;
    logger.error("document.getSuggestionQuestion", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "No risk analysis found" ||
        error.message === "Invalid risk index") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to generate question" });
  }
};

export const applySuggestion = async (req: Request, res: Response) => {
  try {
    const { documentId, riskIndex, additionalContext } = req.body as {
      documentId?: string;
      riskIndex?: number;
      additionalContext?: string;
    };

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }
    if (riskIndex === undefined || riskIndex === null) {
      return res.status(400).json({ message: "riskIndex is required" });
    }

    const doc = await applySuggestionToDocument(documentId, riskIndex, additionalContext);
    return res.status(200).json({ message: "Suggestion applied", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.applySuggestion", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Contract text not found" || 
        error.message === "No risk analysis found" ||
        error.message === "Invalid risk index") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to apply suggestion" });
  }
};

export const applyAllSuggestions = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body as { documentId?: string };

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const doc = await applyAllSuggestionsToDocument(documentId);
    return res.status(200).json({ message: "All suggestions applied", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.applyAllSuggestions", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Contract text not found" || 
        error.message === "No risk analysis found") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to apply suggestions" });
  }
};
