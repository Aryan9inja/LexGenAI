import mongoose from "mongoose";

const riskClauseSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    riskLevel: { type: String, enum: ["high", "medium", "low"], required: true },
    explanation: { type: String, required: true },
    suggestion: { type: String, required: true },
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    contractText: {
      type: String,
    },
    riskFlags: {
      type: [String],
    },
    contractType: {
      type: String,
    },
    status: {
      type: String,
      enum: ["processing", "generated", "analyzed"],
      default: "processing",
    },
    riskAnalysis: {
      type: [riskClauseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Document = mongoose.model("Document", documentSchema);
export default Document;