import { Schema, model, type HydratedDocument } from "mongoose";

type RiskLevel = "high" | "medium" | "low";
type DocStatus = "processing" | "awaiting_info" | "generated" | "analyzed";

interface IRiskClause {
  text: string;
  riskLevel: RiskLevel;
  explanation: string;
  suggestion: string;
}

interface IQuestionAnswer {
  question: string;
  answer?: string;
  timestamp: Date;
}

export interface IDocument {
  userId: string;
  title: string;
  description: string;
  contractText?: string;
  riskFlags: string[];
  status: DocStatus;
  riskAnalysis: IRiskClause[];
  conversationHistory: IQuestionAnswer[];
  pendingQuestions: string[];
}

export type DocumentDoc = HydratedDocument<IDocument>;

const riskClauseSchema = new Schema<IRiskClause>(
  {
    text: { type: String, required: true },
    riskLevel: { type: String, enum: ["high", "medium", "low"], required: true },
    explanation: { type: String, required: true },
    suggestion: { type: String, required: true },
  },
  { _id: false }
);

const questionAnswerSchema = new Schema<IQuestionAnswer>(
  {
    question: { type: String, required: true },
    answer: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    contractText: { type: String },
    riskFlags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["processing", "awaiting_info", "generated", "analyzed"],
      default: "processing",
    },
    riskAnalysis: { type: [riskClauseSchema], default: [] },
    conversationHistory: { type: [questionAnswerSchema], default: [] },
    pendingQuestions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default model<IDocument>("Document", documentSchema);
