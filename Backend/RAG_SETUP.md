# RAG Vector Store Setup Guide

This guide will help you set up the MongoDB Atlas Vector Search index required for the RAG (Retrieval-Augmented Generation) functionality.

## Prerequisites

1. **MongoDB Atlas Account**: You need a MongoDB Atlas account (free tier M0 is sufficient for development)
   - Sign up at: https://www.mongodb.com/cloud/atlas/register
   
2. **MongoDB Atlas Cluster**: Create a cluster (M0 free tier or higher)
   - **Important**: Local MongoDB does NOT support vector search. You must use MongoDB Atlas.
   - For production, use M10+ tier (M0 has limited vector search dimensions)

3. **Network Access**: Ensure your IP address is whitelisted in Atlas Network Access settings

## Step 1: Update MongoDB Connection String

Update your `.env` file with your MongoDB Atlas connection string:

```env
# Replace with your MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Format breakdown:**
- `<username>`: Your Atlas database username
- `<password>`: Your Atlas database password (URL-encoded)
- `<cluster>`: Your cluster name (e.g., cluster0.abc123.mongodb.net)
- `<database>`: Database name (e.g., `lexgen`)

## Step 2: Start the Server (First Time)

When you start the server for the first time, it will:
1. Load all 28 templates from the `templates/` directory
2. Split them into sections (chunks)
3. Generate embeddings using OpenAI
4. Store chunks with embeddings in MongoDB

```bash
cd Backend
npm run dev
```

You should see logs like:
```
[Initialization] Loading templates from: /path/to/templates
[Initialization] Loaded 28 templates with 150 chunks
[Initialization] Generating embeddings for 150 chunks...
[Initialization] Indexing chunks in vector store...
[Initialization] Vector store ready: 150 chunks from 28 templates
[Initialization] ⚠ Vector search index not ready. Please create the index...
```

## Step 3: Create the Vector Search Index

### Option A: Using MongoDB Atlas UI (Recommended)

1. **Go to your Atlas cluster**
   - Navigate to: https://cloud.mongodb.com
   - Select your cluster

2. **Open Search Indexes**
   - Click on the "Search" tab (or "Atlas Search")
   - Click "Create Search Index"

3. **Select JSON Editor**
   - Choose "JSON Editor" (not Visual Editor)
   - Click "Next"

4. **Configure the Index**
   
   **Index Name**: `template_vector_index`
   
   **Database**: Your database name (e.g., `lexgen`)
   
   **Collection**: `templatechunks`
   
   **Index Definition**: Paste this JSON:

   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       }
     ]
   }
   ```

5. **Create the Index**
   - Click "Next" then "Create Search Index"
   - Wait 1-2 minutes for index to build (status will change from "Building" to "Active")

### Option B: Using MongoDB Shell (mongosh)

1. **Connect to your Atlas cluster**:
   ```bash
   mongosh "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"
   ```

2. **Create the vector search index**:
   ```javascript
   use lexgen  // or your database name
   
   db.templatechunks.createSearchIndex(
     "template_vector_index",
     "vectorSearch",
     {
       fields: [
         {
           type: "vector",
           path: "embedding",
           numDimensions: 1536,
           similarity: "cosine"
         }
       ]
     }
   )
   ```

3. **Verify index creation**:
   ```javascript
   db.templatechunks.getSearchIndexes()
   ```

   You should see your index with status "READY" or "BUILDING"

## Step 4: Verify Vector Search is Working

Restart your server and look for this log message:

```
[Initialization] ✓ Vector search index is active and ready
```

If you still see a warning, wait a few minutes for the index to finish building, then restart again.

## Step 5: Test RAG Functionality

### Test 1: Generate a Contract

Make a POST request to create and generate a document:

```bash
curl -X POST http://localhost:5000/api/documents/create \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "title": "Vendor NDA",
    "plainTextDescription": "Create a non-disclosure agreement for a software vendor who will access our proprietary code"
  }'
```

Then generate:
```bash
curl -X POST http://localhost:5000/api/documents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"documentId": "YOUR_DOCUMENT_ID"}'
```

**Expected behavior**: 
- Logs should show "Retrieved X relevant template sections"
- Generated contract should include clauses similar to your NDA templates

### Test 2: Analyze Risk

```bash
curl -X POST http://localhost:5000/api/documents/analyze-risk \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"documentId": "YOUR_DOCUMENT_ID"}'
```

**Expected behavior**:
- Logs should show "Retrieved X standard clauses for comparison"
- Risk analysis should reference standard template clauses

## Troubleshooting

### "Vector search index not ready"

**Cause**: The Atlas Search index hasn't been created or is still building.

**Solutions**:
1. Check if you created the index in Atlas (see Step 3)
2. Wait 1-2 minutes for index to finish building
3. Verify index name matches `template_vector_index` exactly
4. Ensure collection name is `templatechunks` (lowercase, plural)

### "No relevant templates found"

**Cause**: Templates weren't indexed or embeddings weren't generated.

**Solutions**:
1. Check server logs on startup - should show "Indexed X chunks"
2. Verify templates exist in the `templates/` directory
3. Check MongoDB collection `templatechunks` has documents with `embedding` arrays
4. Ensure `OPENAI_API_KEY` is valid in your `.env` file

### "Embedding generation failed"

**Cause**: OpenAI API issues or invalid API key.

**Solutions**:
1. Verify `OPENAI_API_KEY` in `.env` is correct and has credits
2. Check OpenAI API status: https://status.openai.com/
3. Review rate limits on your OpenAI account

### "Vector search fails silently"

**Cause**: Index configuration mismatch.

**Solutions**:
1. Delete the index and recreate it with exact settings above
2. Ensure `numDimensions` is `1536` (matches text-embedding-3-small)
3. Ensure `similarity` is `cosine`
4. Verify `path` is `embedding` (not `embeddings`)

## Index Configuration Details

### Why these settings?

- **numDimensions: 1536**: This matches OpenAI's `text-embedding-3-small` model output
  - If you change `EMBEDDING_MODEL` to a different model, update this accordingly
  - `text-embedding-ada-002`: 1536 dimensions
  - `text-embedding-3-small`: 1536 dimensions (default, 512 or 1536)
  - `text-embedding-3-large`: 3072 dimensions (1024 or 3072)

- **similarity: cosine**: Best for normalized embeddings (OpenAI embeddings are normalized)
  - Alternatives: `euclidean`, `dotProduct`
  - Cosine is recommended for most use cases

- **path: embedding**: Field name in your documents containing the vector
  - Must match the field in `TemplateChunk` model

### Advanced: Multiple Indexes

You can create additional indexes for filtering:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "templateName"
    }
  ]
}
```

This allows filtering by category during vector search.

## Cost Considerations

### MongoDB Atlas
- **M0 (Free tier)**: Limited to 512 dimensions (may not work with 1536-dim embeddings)
- **M10+**: Full vector search support, ~$0.08/hour (~$57/month)
- **Shared clusters (M2/M5)**: May have limitations

### OpenAI Embeddings
- **text-embedding-3-small**: $0.00002 per 1K tokens (~$0.02 per 1M tokens)
- **One-time indexing cost**: ~150 chunks × 200 tokens avg = 30K tokens = $0.0006 (negligible)
- **Per-request cost**: 1 embedding per generation/analysis = ~$0.000004 each

**Total estimated cost**: ~$60/month for M10 Atlas cluster + negligible OpenAI embeddings

## Environment Variables Reference

```env
# Required for RAG
MONGO_URI=mongodb+srv://...              # MongoDB Atlas connection string
OPENAI_API_KEY=sk-...                    # OpenAI API key

# Optional (defaults shown)
VECTOR_INDEX_NAME=template_vector_index  # Name of the vector search index
EMBEDDING_MODEL=text-embedding-3-small   # OpenAI embedding model
TOP_K_RETRIEVAL=5                        # Number of similar chunks to retrieve
DEBUG=false                              # Enable debug logging
```

## Next Steps

Once vector search is working:
1. ✅ Experiment with `TOP_K_RETRIEVAL` values (3-10)
2. ✅ Add more templates to improve RAG quality
3. ✅ Monitor OpenAI usage and costs
4. ✅ Consider caching embeddings for frequently used queries
5. ✅ Implement template versioning and re-indexing workflows

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all prerequisites are met
3. Review MongoDB Atlas Search index status
4. Test OpenAI API connectivity separately
5. Ensure firewall/network settings allow Atlas connections

For MongoDB Atlas support: https://www.mongodb.com/docs/atlas/
For OpenAI API support: https://platform.openai.com/docs
