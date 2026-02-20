import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

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
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a professional legal contract drafter. Generate a clear, well-formatted legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures. Format the document with proper line breaks and spacing for readability. Use plain text with line breaks (\\n) - do NOT use HTML tags or markdown formatting. Return only the contract text.",
      },
      {
        role: "user",
        content: `Generate a legal contract for the following description:\n\n${description}`,
      },
    ],
    temperature: 0.3,
  });

  const contractText = response.choices[0]?.message?.content ?? "";
  logger.info("generateContract", "Contract generated successfully");
  return contractText;
};

export const analyzeRisk = async (
  contractText: string,
): Promise<RiskAnalysis> => {
  logger.debug("analyzeRisk", "Calling OpenAI to analyze contract risk");

  // Strip HTML tags to get plain text for analysis
  const plainText = contractText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const client = await getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'You are a legal risk analyst. Analyze the provided contract and identify risky clauses. For each risk, extract a substantial portion of the actual text (at least 15-30 words, a complete sentence or clause) that contains the risky language - NOT just section titles or summaries. Copy the exact text from the contract verbatim. Return ONLY valid JSON in this exact format: {"clauses":[{"text":"<exact verbatim text from contract containing the risk - must be at least 15 words>","riskLevel":"high|medium|low","explanation":"<why risky>","suggestion":"<safer alternative>"}]}',
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
  logger.info("analyzeRisk", "Risk analysis completed");

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
