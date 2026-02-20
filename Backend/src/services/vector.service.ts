import TemplateChunk, { ITemplateChunk } from "../Models/template-chunk.model.js";
import { TemplateChunk as ParsedChunk } from "./template.service.js";
import {logger} from "../utils/logger.js";
import mongoose from "mongoose";

// Configuration
const VECTOR_INDEX_NAME =
  process.env.VECTOR_INDEX_NAME || "template_vector_index";

/**
 * Interface for search results
 */
export interface SearchResult {
  chunk: ITemplateChunk;
  score: number;
}

/**
 * Save template chunks with embeddings to the database
 * @param chunks - Array of chunks with content
 * @param embeddings - Corresponding embedding vectors
 */
export async function indexTemplateChunks(
  chunks: ParsedChunk[],
  embeddings: number[][]
): Promise<void> {
  try {
    if (chunks.length !== embeddings.length) {
      throw new Error(
        `Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`
      );
    }

    logger.info("VectorStore", `Indexing ${chunks.length} template chunks`);

    // Clear existing chunks before re-indexing
    const deleteResult = await TemplateChunk.deleteMany({});
    logger.info(
      "VectorStore",
      `Cleared ${deleteResult.deletedCount} existing chunks`
    );

    // Prepare documents for bulk insert
    const documents = chunks.map((chunk, index) => ({
      chunkId: generateChunkId(chunk),
      templateName: chunk.templateName,
      category: chunk.category,
      sectionTitle: chunk.sectionTitle,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
      },
    }));

    // Insert in batches to avoid overwhelming MongoDB
    const BATCH_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(documents.length / BATCH_SIZE);

      logger.info(
        "VectorStore",
        `Inserting batch ${batchNum}/${totalBatches} (${batch.length} chunks)`
      );

      const result = await TemplateChunk.insertMany(batch, {
        ordered: false, // Continue even if some inserts fail
      });

      totalInserted += result.length;
    }

    logger.info(
      "VectorStore",
      `Successfully indexed ${totalInserted} template chunks`
    );
  } catch (error: any) {
    logger.error("VectorStore", "Failed to index template chunks", error);
    throw new Error(`Indexing failed: ${error.message}`);
  }
}

/**
 * Generate a unique chunk ID from chunk metadata
 * @param chunk - Template chunk
 * @returns Unique identifier
 */
function generateChunkId(chunk: ParsedChunk): string {
  return `${chunk.category}:${chunk.templateName}:${chunk.chunkIndex}`;
}

/**
 * Search for similar chunks using vector similarity
 * @param queryEmbedding - Query embedding vector
 * @param topK - Number of results to return
 * @param filter - Optional filter by category or template name
 * @returns Array of search results with chunks and scores
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  filter?: { category?: string; templateName?: string }
): Promise<SearchResult[]> {
  try {
    logger.info(
      "VectorStore",
      `Searching for top ${topK} similar chunks${filter ? " with filters" : ""}`
    );

    // Build aggregation pipeline for vector search
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(topK * 10, 100), // Search more candidates for better accuracy
          limit: topK,
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    // Add filters if provided
    if (filter && (filter.category || filter.templateName)) {
      const matchStage: any = {};
      if (filter.category) {
        matchStage.category = filter.category;
      }
      if (filter.templateName) {
        matchStage.templateName = filter.templateName;
      }
      pipeline.push({ $match: matchStage });
    }

    // Sort by score descending
    pipeline.push({ $sort: { score: -1 } });

    logger.info("VectorStore", `Executing vector search with index: ${VECTOR_INDEX_NAME}`);

    // Execute search
    const results = await TemplateChunk.aggregate(pipeline);

    logger.info("VectorStore", `Vector search returned ${results.length} results`);

    if (results.length === 0) {
      logger.warn(
        "VectorStore",
        "⚠️  Vector search returned 0 results. This usually means:"
      );
      logger.warn("VectorStore", "  1. You're using local MongoDB (not Atlas) - vector search ONLY works on Atlas");
      logger.warn("VectorStore", "  2. The vector index doesn't exist or isn't ready");
      logger.warn("VectorStore", "  3. Your MONGO_URI should be: mongodb+srv://...");
      
      // Check if using local MongoDB
      const mongoUri = process.env.MONGO_URI || "";
      if (mongoUri.includes("localhost") || mongoUri.includes("127.0.0.1")) {
        logger.error(
          "VectorStore",
          "❌ DETECTED LOCAL MONGODB - Vector search will NOT work! Please migrate to MongoDB Atlas."
        );
      }
    } else {
      // Log top result details for debugging
      logger.info("VectorStore", `Top result: ${results[0].templateName} - ${results[0].sectionTitle} (score: ${results[0].score?.toFixed(3) || 'N/A'})`);
    }

    return results.map((result) => ({
      chunk: result as ITemplateChunk,
      score: result.score,
    }));
  } catch (error: any) {
    logger.error("VectorStore", "Vector search failed with error", error);
    logger.error("VectorStore", `Error message: ${error.message}`);
    logger.error("VectorStore", `Error stack: ${error.stack}`);

    // If vector search fails, fall back to returning random chunks with warning
    logger.warn(
      "VectorStore",
      "Vector search unavailable, this may indicate the vector index is not ready"
    );

    // Return empty array instead of throwing - allows system to continue running
    return [];
  }
}

/**
 * Check if the vector search index is ready
 * @returns true if index exists and is ready, false otherwise
 */
export async function isIndexReady(): Promise<boolean> {
  try {
    // First check if we have any chunks
    const chunkCount = await TemplateChunk.countDocuments();
    if (chunkCount === 0) {
      logger.warn("VectorStore", "No chunks indexed yet");
      return false;
    }

    // Try a test vector search with a dummy embedding
    const testEmbedding = new Array(1536).fill(0);
    testEmbedding[0] = 1; // Make it non-zero

    const results = await TemplateChunk.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: testEmbedding,
          numCandidates: 10,
          limit: 1,
        },
      },
    ]);

    // MongoDB Atlas returns empty array if index doesn't exist (no error thrown)
    if (results.length === 0) {
      logger.warn(
        "VectorStore",
        `❌ Vector search index '${VECTOR_INDEX_NAME}' does NOT exist or is not ready`
      );
      logger.warn("VectorStore", "You have chunks but no search results - INDEX IS MISSING");
      logger.warn("VectorStore", `Create the index in MongoDB Atlas: Database='Enigma2026', Collection='templatechunks'`);
      return false;
    }

    logger.info("VectorStore", "✓ Vector search index is ready and returning results");
    return true;
  } catch (error: any) {
    logger.warn(
      "VectorStore",
      `Vector search index not ready: ${error.message}`
    );
    return false;
  }
}

/**
 * Get count of indexed chunks
 * @returns Number of chunks in the database
 */
export async function getChunkCount(): Promise<number> {
  try {
    const count = await TemplateChunk.countDocuments();
    return count;
  } catch (error: any) {
    logger.error("VectorStore", "Failed to get chunk count", error);
    return 0;
  }
}

/**
 * Get statistics about indexed chunks
 * @returns Statistics by category
 */
export async function getIndexStats(): Promise<{
  totalChunks: number;
  byCategory: Record<string, number>;
  uniqueTemplates: number;
}> {
  try {
    const stats = await TemplateChunk.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          templates: { $addToSet: "$templateName" },
        },
      },
    ]);

    const byCategory: Record<string, number> = {};
    let uniqueTemplates = new Set<string>();

    stats.forEach((stat) => {
      byCategory[stat._id] = stat.count;
      stat.templates.forEach((t: string) => uniqueTemplates.add(t));
    });

    const totalChunks = await TemplateChunk.countDocuments();

    return {
      totalChunks,
      byCategory,
      uniqueTemplates: uniqueTemplates.size,
    };
  } catch (error: any) {
    logger.error("VectorStore", "Failed to get index stats", error);
    return {
      totalChunks: 0,
      byCategory: {},
      uniqueTemplates: 0,
    };
  }
}

/**
 * Clear all indexed chunks (useful for re-indexing)
 * @returns Number of chunks deleted
 */
export async function clearIndex(): Promise<number> {
  try {
    const result = await TemplateChunk.deleteMany({});
    logger.info("VectorStore", `Cleared ${result.deletedCount} chunks from index`);
    return result.deletedCount;
  } catch (error: any) {
    logger.error("VectorStore", "Failed to clear index", error);
    throw new Error(`Clear index failed: ${error.message}`);
  }
}
