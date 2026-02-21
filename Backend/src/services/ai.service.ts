import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { generateEmbedding } from './embedding.service.js';
import { searchSimilarChunks } from './vector.service.js';

let openai: OpenAI | null = null;

// Helper function to strip markdown formatting from text
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
    .replace(/__([^_]+)__/g, '$1')       // Remove __bold__
    .replace(/_([^_]+)_/g, '$1')         // Remove _italic_
    .replace(/^#{1,6}\s*/gm, '')         // Remove # headers
    .replace(/^[-*]\s+/gm, '• ')         // Convert markdown lists to bullets
    .replace(/```[^`]*```/g, '')         // Remove code blocks
    .replace(/`([^`]+)`/g, '$1');        // Remove inline code
}

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

Generate a clear, well-formatted legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures.

CRITICAL FORMATTING RULES:
- Use ONLY plain text with line breaks
- NO markdown (no **, no ##, no *, no _, no headers)
- NO HTML tags
- Use CAPS or spacing for emphasis instead of formatting
- Section headers should be plain text like "1. POSITION AND START DATE" not "**1. Position**"

Return only the contract text.`
    : `You are a professional legal contract drafter. Generate a clear, well-formatted legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures.

CRITICAL FORMATTING RULES:
- Use ONLY plain text with line breaks
- NO markdown (no **, no ##, no *, no _, no headers)
- NO HTML tags
- Use CAPS or spacing for emphasis instead of formatting
- Section headers should be plain text like "1. POSITION AND START DATE" not "**1. Position**"

Return only the contract text.`;

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

  let contractText = response.choices[0]?.message?.content ?? "";
  contractText = stripMarkdown(contractText);
    
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
    ? `You are a friendly legal advisor protecting the USER (the person who created this contract - typically the service provider, consultant, or business offering services).

Standard legal clauses for comparison:

${relevantContext}

CRITICAL: The USER is the SERVICE PROVIDER. The "Client" mentioned in the contract is the OTHER PARTY (the one paying for services).

Only flag risks that hurt the USER (service provider). NEVER flag clauses that:
- Penalize the Client for late payment (this PROTECTS the user!)
- Require the Client to pay fees, penalties, or interest
- Limit the Client's rights or add obligations to the Client
- Give the user termination rights or protections

DO flag things that:
- Make the USER liable for unlimited damages
- Let the Client terminate without notice or payment
- Require the USER to give warranties or guarantees
- Are vague in ways that could be used AGAINST the user

For each risk:
1. Extract 15-30 words of the EXACT text (copy verbatim, not just headings)
2. Write the explanation in SIMPLE, EVERYDAY ENGLISH - no legal jargon
3. Explain how this specifically hurts the USER (service provider)

Return ONLY valid JSON: {"clauses":[{"text":"<exact verbatim text>","riskLevel":"high|medium|low","explanation":"<how this hurts you>","suggestion":"<what you should change>"}]}`
    : 'You are a friendly legal advisor protecting the USER (the person who created this contract - typically the service provider).\n\nCRITICAL: The USER is the SERVICE PROVIDER. "Client" in the contract is the OTHER PARTY paying for services.\n\nNEVER flag clauses that penalize the Client (late fees, penalties) - these PROTECT the user!\n\nOnly flag things that hurt the USER: unlimited liability, Client can terminate without payment, user must give warranties, vague terms against the user.\n\nFor each risk:\n1. Extract 15-30 words EXACT text (verbatim)\n2. Simple explanation - no legal jargon\n3. How this hurts the USER\n\nReturn ONLY valid JSON: {"clauses":[{"text":"<exact text>","riskLevel":"high|medium|low","explanation":"<how this hurts you>","suggestion":"<what to change>"}]}';

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `I am the SERVICE PROVIDER who created this contract. The "Client" is the other party paying me. Find clauses that could hurt ME. Late payment penalties on the Client are GOOD for me - don't flag those!\n\n${plainText}`,
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

export type CompletenessAnalysis = {
  isComplete: boolean;
  questions: string[];
  reasoning: string;
};

export const analyzeInformationCompleteness = async (
  description: string,
  conversationHistory: Array<{ question: string; answer?: string }> = []
): Promise<CompletenessAnalysis> => {
  logger.debug("analyzeInformationCompleteness", "Analyzing if information is sufficient for contract generation");

  const client = await getOpenAIClient();

  // Build context from conversation history
  let conversationContext = "";
  if (conversationHistory.length > 0) {
    conversationContext = "\n\nPrevious conversation:\n" + 
      conversationHistory
        .map((qa, idx) => `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer || 'Not answered yet'}`)
        .join("\n");
  }

  const systemPrompt = `You are a helpful assistant creating contracts for everyday people. Your job is to check if you have enough information to create their contract.

Look at what the user told you and figure out what's missing. Ask about:
- Who is involved? (names of people or companies)
- What exactly needs to be done? (the work, service, or agreement)
- When does it start and end?
- How much money is involved and when does it get paid?
- Any other important details for this type of agreement

If you need more information, ask 2-5 simple questions. Make your questions:
- Short and easy to understand (like you're asking a friend)
- One thing at a time
- Use everyday words, not legal terms

Good question examples:
- "What's the name of the company you're working with?"
- "How much will you be paid, and when?" 
- "When does this agreement start?"

Bad question examples (too complicated):
- "Please specify the remuneration terms and payment schedule..."
- "What are the deliverables and their respective deadlines?"

Return ONLY valid JSON:
{
  "isComplete": true/false,
  "questions": ["simple question 1", "simple question 2", ...],
  "reasoning": "What info is missing (keep it brief)"
}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Analyze the following contract description and determine if it contains sufficient information:

Description: ${description}${conversationContext}

Return the completeness analysis as JSON.`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? '{"isComplete":true,"questions":[],"reasoning":"Unable to analyze"}';
  logger.info("analyzeInformationCompleteness", "Completeness analysis completed");

  try {
    const parsed = JSON.parse(content) as CompletenessAnalysis;
    return parsed;
  } catch {
    logger.error("analyzeInformationCompleteness", "Failed to parse completeness analysis JSON", {
      content,
    });
    return { isComplete: true, questions: [], reasoning: "Failed to parse analysis" };
  }
};

export const generateContractWithContext = async (
  description: string,
  conversationHistory: Array<{ question: string; answer: string }>
): Promise<string> => {
  logger.debug("generateContractWithContext", "Generating contract with conversation context");

  const client = await getOpenAIClient();

  // RAG Step 1: Generate embedding for the user's description
  let relevantContext = "";
  try {
    logger.debug("generateContractWithContext", "Retrieving relevant template sections via RAG");
    
    const descriptionEmbedding = await generateEmbedding(description);
    
    // RAG Step 2: Search for similar template chunks
    const topK = parseInt(process.env.TOP_K_RETRIEVAL || "5", 10);
    const similarChunks = await searchSimilarChunks(descriptionEmbedding, topK);
    
    if (similarChunks.length > 0) {
      logger.info("generateContractWithContext", `Retrieved ${similarChunks.length} relevant template sections`);
      
      // RAG Step 3: Format context from retrieved chunks
      relevantContext = similarChunks
        .map((result, idx) => {
          return `--- Example ${idx + 1} (from ${result.chunk.templateName}, ${result.chunk.category}) ---\n${result.chunk.sectionTitle}\n${result.chunk.content}`;
        })
        .join("\n\n");
    }
  } catch (error: any) {
    logger.warn("generateContractWithContext", "RAG retrieval failed, falling back to plain generation", error);
  }

  // Build conversation context
  const conversationText = conversationHistory
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join("\n\n");

  // Build enhanced prompt with retrieved context
  const systemPrompt = relevantContext
    ? `You are a professional legal contract drafter. You will be provided with example clauses from similar legal templates. Use these as reference for style, structure, and standard legal language, but customize the contract based on the user's specific description and the clarifying information they provided.

Example clauses from legal templates for reference:

${relevantContext}

Generate a clear, well-formatted legal contract based on the description and the Q&A conversation provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures.

CRITICAL FORMATTING RULES:
- Use ONLY plain text with line breaks
- NO markdown (no **, no ##, no *, no _, no headers)
- NO HTML tags
- Use CAPS or spacing for emphasis instead of formatting
- Section headers should be plain text like "1. POSITION AND START DATE" not "**1. Position**"

Return only the contract text.`
    : `You are a professional legal contract drafter. Generate a clear, well-formatted legal contract based on the description and clarifying information provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures.

CRITICAL FORMATTING RULES:
- Use ONLY plain text with line breaks
- NO markdown (no **, no ##, no *, no _, no headers)
- NO HTML tags
- Use CAPS or spacing for emphasis instead of formatting
- Section headers should be plain text like "1. POSITION AND START DATE" not "**1. Position**"

Return only the contract text.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Generate a legal contract for the following:

Initial Description: ${description}

Clarifying Information:
${conversationText}

Create a complete contract incorporating all the provided information.`,
      },
    ],
    temperature: 0.3,
  });

  let contractText = response.choices[0]?.message?.content ?? "";
  contractText = stripMarkdown(contractText);
    
  logger.info("generateContractWithContext", "Contract generated successfully with conversation context");
  return contractText;
};

export const generateSuggestionQuestion = async (
  riskyClause: string,
  suggestion: string,
  explanation: string,
): Promise<string> => {
  logger.debug("generateSuggestionQuestion", "Generating follow-up question for suggestion");

  const client = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are helping someone fix a problem in their contract. Ask them ONE simple question to get the information needed.

Your question should be:
- Written in plain, everyday English (no legal jargon)
- Short and easy to answer
- Specific about what information you need (a number, a name, a date, etc.)

Good examples:
- "How many days notice would you want before they can cancel?"
- "What's the maximum amount you're willing to pay if something goes wrong?"
- "Who should receive complaints or legal notices?"

Bad examples (too complicated):
- "What provisions would you like to include regarding termination clauses?"
- "Please specify the indemnification cap."

Return ONLY the question, nothing else.`,
      },
      {
        role: "user",
        content: `The problem: "${riskyClause}"

Why it matters: ${explanation}

How to fix it: ${suggestion}

Ask a simple question to get the info needed to fix this.`,
      },
    ],
    temperature: 0.4,
  });

  const question = response.choices[0]?.message?.content ?? "";
  logger.info("generateSuggestionQuestion", "Follow-up question generated");
  return question.trim();
};

export const applySuggestion = async (
  contractText: string,
  riskyClause: string,
  suggestion: string,
  additionalContext?: string,
): Promise<string> => {
  logger.debug("applySuggestion", "Calling OpenAI to apply risk suggestion", {
    hasContext: !!additionalContext,
  });

  const client = await getOpenAIClient();

  const contextPrompt = additionalContext
    ? `\n\nAdditional Context/Details:\n${additionalContext}`
    : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a legal contract editor. You will be given:
1. A complete contract text
2. A risky clause that needs improvement
3. A suggestion on how to improve it
4. Optional: Additional context or specific details to incorporate

Your task is to find the risky clause in the contract and replace it with improved text that follows the suggestion. The improved clause should:
- Maintain the same legal intent and context
- Be professionally written in legal language
- Follow the suggestion to reduce risk
- Incorporate any additional context/details provided
- Fit naturally into the contract's structure and style

Return ONLY the complete updated contract text with the improved clause. Do NOT add explanations, comments, or any other text. The output should be the full contract with just that one clause improved.`,
      },
      {
        role: "user",
        content: `Contract:
${contractText}

Risky Clause to Replace:
"${riskyClause}"

Suggestion for Improvement:
${suggestion}${contextPrompt}

Please provide the full updated contract with the risky clause replaced by an improved version following the suggestion.`,
      },
    ],
    temperature: 0.2,
  });

  let updatedContract = response.choices[0]?.message?.content ?? "";
  updatedContract = stripMarkdown(updatedContract);
  logger.info("applySuggestion", "Suggestion applied successfully");
  return updatedContract;
};

export const applyAllSuggestions = async (
  contractText: string,
  risks: RiskClause[],
): Promise<string> => {
  logger.debug("applyAllSuggestions", `Calling OpenAI to apply ${risks.length} risk suggestions`);

  const client = await getOpenAIClient();

  const risksText = risks.map((risk, idx) => 
    `${idx + 1}. Risky Clause: "${risk.text}"\n   Suggestion: ${risk.suggestion}\n   Risk Level: ${risk.riskLevel}`
  ).join("\n\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a legal contract editor. You will be given:
1. A complete contract text
2. A list of risky clauses with suggestions for improvement

Your task is to find each risky clause in the contract and replace it with improved text that follows the suggestions. Each improved clause should:
- Maintain the same legal intent and context
- Be professionally written in legal language
- Follow the suggestion to reduce risk
- Fit naturally into the contract's structure and style

Return ONLY the complete updated contract text with ALL risky clauses improved. Do NOT add explanations, comments, or any other text. The output should be the full contract with all the risky clauses improved.`,
      },
      {
        role: "user",
        content: `Contract:
${contractText}

Risky Clauses to Improve:
${risksText}

Please provide the full updated contract with all risky clauses replaced by improved versions following the suggestions.`,
      },
    ],
    temperature: 0.2,
  });

  let updatedContract = response.choices[0]?.message?.content ?? "";
  updatedContract = stripMarkdown(updatedContract);
  logger.info("applyAllSuggestions", `All ${risks.length} suggestions applied successfully`);
  return updatedContract;
};
