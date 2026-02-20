import { Schema, model, type HydratedDocument } from "mongoose";

type RiskLevel = "high" | "medium" | "low";
type DocStatus = "processing" | "generated" | "analyzed";

interface IRiskClause {
  text: string;
  riskLevel: RiskLevel;
  explanation: string;
  suggestion: string;
}

export interface IDocument {
  userId: string;
  title: string;
  description: string; // <-- add this
  contractText?: string;
  riskFlags: string[];
  status: DocStatus;
  riskAnalysis: IRiskClause[];
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

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true }, // <-- add this
    contractText: { type: String },
    riskFlags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["processing", "generated", "analyzed"],
      default: "processing",
    },
    riskAnalysis: { type: [riskClauseSchema], default: [] },
  },
  { timestamps: true }
);

export default model<IDocument>("Document", documentSchema);
