import Document from "../Models/document.model";
import { generateContract, analyzeRisk } from "./ai.service";
import { logger } from "../utils/logger";

export const createDocument = async (userId: string, title: string, plainTextDescription: string) => {
  logger.debug("createDocument", "Creating document", { userId });
  const doc = new Document({
    userId,
    title,
    description: plainTextDescription,
    status: "processing",
  });
  await doc.save();
  logger.info("createDocument", "Document created", { docId: doc._id });
  return doc;
};

export const generateDocumentContract = async (documentId: string) => {
  logger.debug("generateDocumentContract", "Generating contract", { documentId });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");

  const contractText = await generateContract(doc.description);

  doc.contractText = contractText;
  doc.status = "generated";
  await doc.save();

  logger.info("generateDocumentContract", "Contract generated and saved", { documentId });
  return doc;
};

export const analyzeDocumentRisk = async (documentId: string) => {
  logger.debug("analyzeDocumentRisk", "Analyzing document risk", { documentId });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  if (!doc.contractText) throw new Error("Contract text not generated yet");

  const analysis = await analyzeRisk(doc.contractText);

  doc.riskAnalysis = analysis.clauses as typeof doc.riskAnalysis;
  doc.riskFlags = analysis.clauses.map((c) => c.riskLevel);
  doc.status = "analyzed";
  await doc.save();

  logger.info("analyzeDocumentRisk", "Risk analysis saved", { documentId });
  return doc;
};

export const getDocumentById = async (documentId: string) => {
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  return doc;
};

export const getUserDocuments = async (userId: string) => {
  logger.debug("getUserDocuments", "Fetching all documents for user", { userId });
  const docs = await Document.find({ userId }).sort({ createdAt: -1 });
  logger.info("getUserDocuments", "Documents fetched", { userId, count: docs.length });
  return docs;
};

export const updateDocumentText = async (documentId: string, contractText: string) => {
  logger.debug("updateDocumentText", "Updating document text", { documentId });
  
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  
  doc.contractText = contractText;
  // Reset risk analysis when text is manually edited
  doc.riskAnalysis = [];
  doc.riskFlags = [];
  doc.status = "generated"; // Reset to generated status
  await doc.save();
  
  logger.info("updateDocumentText", "Document text updated", { documentId });
  return doc;
};