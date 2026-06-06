import OpenAI from "openai";
import {logger} from "../utils/logger.js";

// Initialize Gemini through the OpenAI-compatible API.
let geminiClient: OpenAI | null = null;

function getGeminiClient(): OpenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    // Old OpenAI setup:
    // geminiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    geminiClient = new OpenAI({
      apiKey,
      baseURL:
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return geminiClient;
}

// Configuration
const EMBEDDING_DIMENSIONS = 1536; // Keep Atlas vector index compatible.

function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL || "gemini-embedding-001";
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEmbeddingBatchSize(): number {
  return toPositiveInt(process.env.EMBEDDING_BATCH_SIZE, 10);
}

function getEmbeddingBatchDelayMs(): number {
  return toPositiveInt(process.env.EMBEDDING_BATCH_DELAY_MS, 30000);
}

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns Embedding vector (array of numbers)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getGeminiClient();

    logger.debug("EmbeddingService", `Generating embedding for text (${text.length} chars)`);

    const response = await client.embeddings.create({
      model: getEmbeddingModel(),
      input: text,
      encoding_format: "float",
      dimensions: EMBEDDING_DIMENSIONS,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding returned from Gemini");
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
    const client = getGeminiClient();
    const embeddings: number[][] = [];
    const maxBatchSize = getEmbeddingBatchSize();
    const batchDelayMs = getEmbeddingBatchDelayMs();

    logger.info(
      "EmbeddingService",
      `Starting batch embedding for ${texts.length} texts`
    );

    // Process in batches to respect API limits
    for (let i = 0; i < texts.length; i += maxBatchSize) {
      const batch = texts.slice(i, i + maxBatchSize);
      const batchNum = Math.floor(i / maxBatchSize) + 1;
      const totalBatches = Math.ceil(texts.length / maxBatchSize);

      logger.info(
        "EmbeddingService",
        `Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`
      );

      const response = await client.embeddings.create({
        model: getEmbeddingModel(),
        input: batch,
        encoding_format: "float",
        dimensions: EMBEDDING_DIMENSIONS,
      });

      if (!response.data || response.data.length !== batch.length) {
        throw new Error(
          `Expected ${batch.length} embeddings, got ${response.data?.length || 0}`
        );
      }

      // Extract embeddings in order
      const batchEmbeddings = response.data.map((item) => item.embedding);
      embeddings.push(...batchEmbeddings);

      // Add delay between batches to stay friendly to Gemini free-tier limits.
      if (i + maxBatchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
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
    model: getEmbeddingModel(),
    dimensions: EMBEDDING_DIMENSIONS,
  };
}
