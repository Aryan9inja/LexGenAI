import mongoose from "mongoose";

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
    contractText:{
        type: String,
    },
    riskFlags:{
        type: [String],
    },
    contractType:{
        type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Document=mongoose.model("Document", documentSchema);
export default Document;