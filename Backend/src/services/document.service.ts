import Document from "../Models/document.model";
import * as aiService from "./ai.service";
import { logger } from "../utils/logger";

export const createDocument = async (userId: string, title: string, plainTextDescription: string) => {
  logger.debug("createDocument", "Creating document", { userId });

  // Validate that the description is related to legal/contract domain
  const validation = await aiService.validateDescriptionRelevance(plainTextDescription);
  if (!validation.isRelevant) {
    throw new Error(`INVALID_DESCRIPTION: ${validation.reason}`);
  }

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

export const generateDocumentContract = async (documentId: string, forceGenerate: boolean = false) => {
  logger.debug("generateDocumentContract", "Generating contract", { documentId, forceGenerate });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");

  // Check if information is complete (skip if forceGenerate is true)
  if (!forceGenerate) {
    const completenessAnalysis = await aiService.analyzeInformationCompleteness(
      doc.description,
      doc.conversationHistory
    );

    if (!completenessAnalysis.isComplete) {
      // Information is incomplete - save questions and update status
      doc.pendingQuestions = completenessAnalysis.questions;
      doc.status = "awaiting_info";
      await doc.save();

      logger.info("generateDocumentContract", "Information incomplete, awaiting user responses", { 
        documentId,
        questionCount: completenessAnalysis.questions.length 
      });
      
      return doc;
    }
  }

  // Information is complete (or forced) - generate contract
  let contractText: string;
  
  // Check if we have conversation history
  const answeredQuestions = doc.conversationHistory.filter(qa => qa.answer);
  
  if (answeredQuestions.length > 0) {
    // Generate with conversation context
    contractText = await aiService.generateContractWithContext(
      doc.description,
      answeredQuestions.map(qa => ({ question: qa.question, answer: qa.answer! }))
    );
  } else {
    // Generate without conversation context
    contractText = await aiService.generateContract(doc.description);
  }

  doc.contractText = contractText;
  doc.status = "generated";
  doc.pendingQuestions = []; // Clear pending questions
  await doc.save();

  logger.info("generateDocumentContract", "Contract generated and saved", { documentId, forced: forceGenerate });
  return doc;
};

export const analyzeDocumentRisk = async (documentId: string) => {
  logger.debug("analyzeDocumentRisk", "Analyzing document risk", { documentId });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  if (!doc.contractText) throw new Error("Contract text not generated yet");

  const analysis = await aiService.analyzeRisk(doc.contractText);

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

export const submitAnswers = async (
  documentId: string,
  answers: Array<{ question: string; answer: string }>
) => {
  logger.debug("submitAnswers", "Submitting answers to questions", { documentId, answerCount: answers.length });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");

  // Add answers to conversation history
  const now = new Date();
  answers.forEach(({ question, answer }) => {
    doc.conversationHistory.push({
      question,
      answer,
      timestamp: now,
    });
  });

  // Clear pending questions that were answered
  const answeredQuestions = new Set(answers.map(a => a.question));
  doc.pendingQuestions = doc.pendingQuestions.filter(q => !answeredQuestions.has(q));

  await doc.save();

  logger.info("submitAnswers", "Answers submitted and saved", { documentId });
  return doc;
};

export const getPendingQuestions = async (documentId: string) => {
  logger.debug("getPendingQuestions", "Retrieving pending questions", { documentId });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");

  return {
    pendingQuestions: doc.pendingQuestions,
    conversationHistory: doc.conversationHistory,
    status: doc.status,
  };
};

export const getSuggestionQuestion = async (
  documentId: string,
  riskIndex: number,
) => {
  logger.debug("getSuggestionQuestion", "Getting follow-up question for suggestion", {
    documentId,
    riskIndex,
  });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  if (!doc.riskAnalysis || doc.riskAnalysis.length === 0) {
    throw new Error("No risk analysis found");
  }
  if (riskIndex < 0 || riskIndex >= doc.riskAnalysis.length) {
    throw new Error("Invalid risk index");
  }

  const risk = doc.riskAnalysis[riskIndex];
  const question = await aiService.generateSuggestionQuestion(
    risk.text,
    risk.suggestion,
    risk.explanation,
  );

  logger.info("getSuggestionQuestion", "Follow-up question generated", { documentId });
  return { question };
};

export const applySuggestionToDocument = async (
  documentId: string,
  riskIndex: number,
  additionalContext?: string,
) => {
  logger.debug("applySuggestionToDocument", "Applying suggestion", {
    documentId,
    riskIndex,
    hasContext: !!additionalContext,
  });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  if (!doc.contractText) throw new Error("Contract text not found");
  if (!doc.riskAnalysis || doc.riskAnalysis.length === 0) {
    throw new Error("No risk analysis found");
  }
  if (riskIndex < 0 || riskIndex >= doc.riskAnalysis.length) {
    throw new Error("Invalid risk index");
  }

  const risk = doc.riskAnalysis[riskIndex];
  const updatedContract = await aiService.applySuggestion(
    doc.contractText,
    risk.text,
    risk.suggestion,
    additionalContext,
  );

  doc.contractText = updatedContract;
  doc.status = "generated"; // Reset status since we modified the contract
  doc.riskAnalysis = []; // Clear old risk analysis since contract changed
  await doc.save();

  logger.info("applySuggestionToDocument", "Suggestion applied successfully", { documentId });
  return doc;
};

export const applyAllSuggestionsToDocument = async (documentId: string) => {
  logger.debug("applyAllSuggestionsToDocument", "Applying all suggestions", { documentId });

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error("Document not found");
  if (!doc.contractText) throw new Error("Contract text not found");
  if (!doc.riskAnalysis || doc.riskAnalysis.length === 0) {
    throw new Error("No risk analysis found");
  }

  const risks = doc.riskAnalysis.map((r) => ({
    text: r.text,
    riskLevel: r.riskLevel,
    explanation: r.explanation,
    suggestion: r.suggestion,
  }));

  const updatedContract = await aiService.applyAllSuggestions(doc.contractText, risks);

  doc.contractText = updatedContract;
  doc.status = "generated"; // Reset status since we modified the contract
  doc.riskAnalysis = []; // Clear old risk analysis since contract changed
  await doc.save();

  logger.info("applyAllSuggestionsToDocument", "All suggestions applied successfully", {
    documentId,
    riskCount: risks.length,
  });
  return doc;
};
