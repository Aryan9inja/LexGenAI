import mongoose, { Schema, Document } from "mongoose";

// Interface for template chunk document
export interface ITemplateChunk extends Document {
  chunkId: string;
  templateName: string;
  category: string; // nda, offer-letters, service-provider-agreements, consultancy-agreements
  sectionTitle: string;
  content: string;
  embedding: number[]; // OpenAI embedding vector (1536 dimensions for text-embedding-3-small)
  metadata: {
    filePath: string;
    chunkIndex: number;
    totalChunks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const templateChunkSchema = new Schema<ITemplateChunk>(
  {
    chunkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "nda",
        "offer-letters",
        "service-provider-agreements",
        "consultancy-agreements",
      ],
      index: true,
    },
    sectionTitle: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      filePath: {
        type: String,
        required: true,
      },
      chunkIndex: {
        type: Number,
        required: true,
      },
      totalChunks: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries by category and template
templateChunkSchema.index({ category: 1, templateName: 1 });

// Export model
const TemplateChunk = mongoose.model<ITemplateChunk>(
  "TemplateChunk",
  templateChunkSchema
);

export default TemplateChunk;
