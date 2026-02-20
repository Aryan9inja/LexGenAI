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
