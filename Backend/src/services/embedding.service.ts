import OpenAI from "openai";
import {logger} from "../utils/logger.js";

// Initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Configuration
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-small supports 1536 dimensions
const MAX_BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs, but we'll be conservative

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns Embedding vector (array of numbers)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient();

    logger.debug("EmbeddingService", `Generating embedding for text (${text.length} chars)`);

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding returned from OpenAI");
    }

    const embedding = response.data[0].embedding;

    logger.debug("EmbeddingService", `Generated embedding with ${embedding.length} dimensions`);

    return embedding;
  } catch (error: any) {
    logger.error("EmbeddingService", "Failed to generate embedding", error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batches
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function batchGenerateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const client = getOpenAIClient();
    const embeddings: number[][] = [];

    logger.info(
      "EmbeddingService",
      `Starting batch embedding for ${texts.length} texts`
    );

    // Process in batches to respect API limits
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(texts.length / MAX_BATCH_SIZE);

      logger.info(
        "EmbeddingService",
        `Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`
      );

      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: "float",
      });

      if (!response.data || response.data.length !== batch.length) {
        throw new Error(
          `Expected ${batch.length} embeddings, got ${response.data?.length || 0}`
        );
      }

      // Extract embeddings in order
      const batchEmbeddings = response.data.map((item) => item.embedding);
      embeddings.push(...batchEmbeddings);

      // Add small delay between batches to avoid rate limits
      if (i + MAX_BATCH_SIZE < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info(
      "EmbeddingService",
      `Successfully generated ${embeddings.length} embeddings`
    );

    return embeddings;
  } catch (error: any) {
    logger.error("EmbeddingService", "Failed to generate batch embeddings", error);
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param vecA - First embedding vector
 * @param vecB - Second embedding vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Get embedding model configuration
 * @returns Model name and dimensions
 */
export function getEmbeddingConfig(): {
  model: string;
  dimensions: number;
} {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}
