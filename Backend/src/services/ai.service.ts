import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { generateEmbedding } from './embedding.service.js';
import { searchSimilarChunks } from './vector.service.js';

let openai: OpenAI | null = null;

async function getOpenAIClient() {
  if (!openai) {
    logger.debug("getOpenAIClient", "Initializing OpenAI client");
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    logger.debug("openAiClientCreated",process.env.OPENAI_API_KEY!);
  }
  return openai;
}

export type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

export type RiskAnalysis = {
  clauses: RiskClause[];
};

export const generateContract = async (
  description: string,
): Promise<string> => {
  logger.debug("generateContract", "Calling OpenAI to generate contract", {
    descriptionLength: description.length,
  });

  const client = await getOpenAIClient();

  // RAG Step 1: Generate embedding for the user's description
  let relevantContext = "";
  try {
    logger.debug("generateContract", "Retrieving relevant template sections via RAG");
    
    const descriptionEmbedding = await generateEmbedding(description);
    
    // RAG Step 2: Search for similar template chunks
    const topK = parseInt(process.env.TOP_K_RETRIEVAL || "5", 10);
    const similarChunks = await searchSimilarChunks(descriptionEmbedding, topK);
    
    if (similarChunks.length > 0) {
      logger.info("generateContract", `Retrieved ${similarChunks.length} relevant template sections`);
      
      // RAG Step 3: Format context from retrieved chunks
      relevantContext = similarChunks
        .map((result, idx) => {
          return `--- Example ${idx + 1} (from ${result.chunk.templateName}, ${result.chunk.category}) ---\n${result.chunk.sectionTitle}\n${result.chunk.content}`;
        })
        .join("\n\n");
    } else {
      logger.warn("generateContract", "No relevant templates found, generating without RAG context");
    }
  } catch (error: any) {
    logger.warn("generateContract", "RAG retrieval failed, falling back to plain generation", error);
  }

  // Build enhanced prompt with retrieved context
  const systemPrompt = relevantContext
    ? `You are a professional legal contract drafter. You will be provided with example clauses from similar legal templates. Use these as reference for style, structure, and standard legal language, but customize the contract based on the user's specific description.

Example clauses from legal templates for reference:

${relevantContext}

Generate a clear, well-formatted legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures. Format the document with proper line breaks and spacing for readability. Use plain text with line breaks (\\n) - do NOT use HTML tags or markdown formatting. Return only the contract text.`
    : "You are a professional legal contract drafter. Generate a clear, well-formatted legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures. Format the document with proper line breaks and spacing for readability. Use plain text with line breaks (\\n) - do NOT use HTML tags or markdown formatting. Return only the contract text.";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Generate a legal contract for the following description:\n\n${description}`,
      },
    ],
    temperature: 0.3,
  });

  const contractText = response.choices[0]?.message?.content ?? "";
  logger.info("generateContract", "Contract generated successfully with RAG enhancement");
  return contractText;
};

export const analyzeRisk = async (
  contractText: string,
): Promise<RiskAnalysis> => {
  logger.debug("analyzeRisk", "Calling OpenAI to analyze contract risk");

  // Strip HTML tags to get plain text for analysis
  const plainText = contractText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const client = await getOpenAIClient();

  // RAG Step 1: Retrieve relevant template sections for comparison
  let relevantContext = "";
  try {
    logger.debug("analyzeRisk", "Retrieving standard clauses via RAG for risk comparison");
    
    // Use first 1000 characters for embedding to avoid token limits
    const sampleText = plainText.substring(0, 1000);
    const contractEmbedding = await generateEmbedding(sampleText);
    
    // RAG Step 2: Search for similar standard clauses
    const topK = parseInt(process.env.TOP_K_RETRIEVAL || "5", 10);
    const similarChunks = await searchSimilarChunks(contractEmbedding, topK);
    
    if (similarChunks.length > 0) {
      logger.info("analyzeRisk", `Retrieved ${similarChunks.length} standard clauses for comparison`);
      
      // RAG Step 3: Format context from standard templates
      relevantContext = similarChunks
        .map((result, idx) => {
          return `--- Standard Template ${idx + 1} (${result.chunk.templateName}) ---\n${result.chunk.sectionTitle}\n${result.chunk.content}`;
        })
        .join("\n\n");
    } else {
      logger.warn("analyzeRisk", "No standard templates found, analyzing without RAG context");
    }
  } catch (error: any) {
    logger.warn("analyzeRisk", "RAG retrieval failed, falling back to plain analysis", error);
  }

  // Build enhanced prompt with standard clauses for comparison
  const systemPrompt = relevantContext
    ? `You are a legal risk analyst. You will be provided with standard clauses from professional legal templates for comparison. Use these to identify deviations, missing protections, or unfavorable terms in the contract being analyzed.

Standard legal clauses for comparison:

${relevantContext}

Analyze the provided contract and identify risky clauses by comparing it to these standard templates. For each risk, extract a substantial portion of the actual text (at least 15-30 words, a complete sentence or clause) that contains the risky language - NOT just section titles or summaries. Copy the exact text from the contract verbatim. Return ONLY valid JSON in this exact format: {"clauses":[{"text":"<exact verbatim text from contract containing the risk - must be at least 15 words>","riskLevel":"high|medium|low","explanation":"<why risky compared to standard templates>","suggestion":"<safer alternative based on standard clauses>"}]}`
    : 'You are a legal risk analyst. Analyze the provided contract and identify risky clauses. For each risk, extract a substantial portion of the actual text (at least 15-30 words, a complete sentence or clause) that contains the risky language - NOT just section titles or summaries. Copy the exact text from the contract verbatim. Return ONLY valid JSON in this exact format: {"clauses":[{"text":"<exact verbatim text from contract containing the risk - must be at least 15 words>","riskLevel":"high|medium|low","explanation":"<why risky>","suggestion":"<safer alternative>"}]}';

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Analyze the following contract for risky clauses. For each risk, extract the COMPLETE clause text (not just the heading):\n\n${plainText}`,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? '{"clauses":[]}';
  logger.info("analyzeRisk", "Risk analysis completed with RAG enhancement");

  try {
    const parsed = JSON.parse(content) as RiskAnalysis;
    return parsed;
  } catch {
    logger.error("analyzeRisk", "Failed to parse risk analysis JSON", {
      content,
    });
    return { clauses: [] };
  }
};
