import path from "path";
import {
  loadAllTemplates,
  getTemplateStats,
  ParsedTemplate,
} from "./services/template.service.js";
import { batchGenerateEmbeddings } from "./services/embedding.service.js";
import {
  indexTemplateChunks,
  isIndexReady,
  getIndexStats,
} from "./services/vector.service.js";
import {logger} from "./utils/logger.js";

/**
 * Initialize the vector store with templates
 * This should be called on server startup after DB connection
 */
export async function initializeVectorStore(): Promise<void> {
  try {
    logger.info("Initialization", "Starting vector store initialization...");

    // Step 1: Load all templates from markdown files
    const templatesDir = path.join(process.cwd(), "..", "templates");
    logger.info("Initialization", `Loading templates from: ${templatesDir}`);

    const templates: ParsedTemplate[] = await loadAllTemplates(templatesDir);

    if (templates.length === 0) {
      logger.warn("Initialization", "No templates found! Vector store will be empty.");
      return;
    }

    // Get and log statistics
    const stats = getTemplateStats(templates);
    logger.info(
      "Initialization",
      `Loaded ${stats.totalTemplates} templates with ${stats.totalChunks} chunks`
    );
    logger.info("Initialization", `By category:`, stats.byCategory);

    // Step 2: Flatten all chunks from all templates
    const allChunks = templates.flatMap((template) => template.chunks);

    // Step 3: Generate embeddings for all chunks
    logger.info(
      "Initialization",
      `Generating embeddings for ${allChunks.length} chunks...`
    );

    const texts = allChunks.map(
      (chunk) => `${chunk.sectionTitle}\n\n${chunk.content}`
    );
    const embeddings = await batchGenerateEmbeddings(texts);

    logger.info("Initialization", `Generated ${embeddings.length} embeddings`);

    // Step 4: Index chunks with embeddings in MongoDB
    logger.info("Initialization", "Indexing chunks in vector store...");
    await indexTemplateChunks(allChunks, embeddings);

    // Step 5: Verify indexing
    const indexStats = await getIndexStats();
    logger.info(
      "Initialization",
      `Vector store ready: ${indexStats.totalChunks} chunks from ${indexStats.uniqueTemplates} templates`
    );

    // Step 6: Check if vector search index is ready
    logger.info("Initialization", "Checking vector search index status...");
    const indexReady = await isIndexReady();

    if (indexReady) {
      logger.info("Initialization", "✓ Vector search index is active and ready");
      logger.info("Initialization", "🚀 RAG features are fully operational!");
    } else {
      logger.error("Initialization", "❌ CRITICAL: Vector search index NOT FOUND");
      logger.error("Initialization", "");
      logger.error("Initialization", "📋 TO CREATE THE INDEX IN MONGODB ATLAS:");
      logger.error("Initialization", "  1. Go to: https://cloud.mongodb.com/");
      logger.error("Initialization", "  2. Navigate to: Your Cluster → Atlas Search tab");
      logger.error("Initialization", "  3. Click: 'Create Search Index'");
      logger.error("Initialization", "  4. Select: JSON Editor");
      logger.error("Initialization", "  5. Database: 'Enigma2026', Collection: 'templatechunks'");
      logger.error("Initialization", "  6. Index Name: 'template_vector_index'");
      logger.error("Initialization", "  7. JSON Definition:");
      logger.error("Initialization", '     {');
      logger.error("Initialization", '       "fields": [{');
      logger.error("Initialization", '         "type": "vector",');
      logger.error("Initialization", '         "path": "embedding",');
      logger.error("Initialization", '         "numDimensions": 1536,');
      logger.error("Initialization", '         "similarity": "cosine"');
      logger.error("Initialization", '       }]');
      logger.error("Initialization", '     }');
      logger.error("Initialization", "  8. Wait for index status to become 'Active' (1-2 min)");
      logger.error("Initialization", "  9. Restart this server");
      logger.error("Initialization", "");
      logger.error("Initialization", "⚠️  RAG features will NOT work until the index is created!");
    }

    logger.info("Initialization", "Vector store initialization complete!");
  } catch (error: any) {
    logger.error("Initialization", "Vector store initialization failed", error);
    logger.warn(
      "Initialization",
      "Server will continue but RAG features may not work properly"
    );
    // Don't throw - allow server to start even if vector store init fails
  }
}

/**
 * Check if vector store needs re-indexing
 * @returns true if re-indexing is needed
 */
export async function needsReindexing(): Promise<boolean> {
  try {
    const stats = await getIndexStats();
    // If no chunks exist, needs indexing
    if (stats.totalChunks === 0) {
      return true;
    }

    // Could add more sophisticated checks here:
    // - Check file modification times
    // - Compare template count with indexed count
    // - Version hash comparison

    return false;
  } catch (error) {
    logger.error("Initialization", "Failed to check reindexing status", error);
    return true; // If check fails, assume reindexing needed
  }
}
