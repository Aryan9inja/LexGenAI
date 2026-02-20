import { Request, Response } from "express";
import {
  createDocument,
  generateDocumentContract,
  analyzeDocumentRisk,
  getDocumentById,
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
    return res.status(500).json({ message: "Failed to create document" });
  }
};

export const generate = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body as { documentId?: string };
    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const doc = await generateDocumentContract(documentId);
    return res.status(200).json({ message: "Contract generated", document: doc });
  } catch (err) {
    const error = err as Error;
    logger.error("document.generate", error.message);
    if (error.message === "Document not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to generate contract" });
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
