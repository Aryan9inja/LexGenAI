import OpenAI from "openai";
import { logger } from "../utils/logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

export type RiskAnalysis = {
  clauses: RiskClause[];
};

export const generateContract = async (description: string): Promise<string> => {
  logger.debug("generateContract", "Calling OpenAI to generate contract", { descriptionLength: description.length });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a professional legal contract drafter. Generate a clear, structured legal contract based on the description provided. Include standard sections such as parties, recitals, terms, obligations, termination, and signatures. Return only the contract text.",
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

export const analyzeRisk = async (contractText: string): Promise<RiskAnalysis> => {
  logger.debug("analyzeRisk", "Calling OpenAI to analyze contract risk");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'You are a legal risk analyst. Analyze the provided contract and identify risky clauses. Return ONLY valid JSON in this exact format: {"clauses":[{"text":"<clause text>","riskLevel":"high|medium|low","explanation":"<why risky>","suggestion":"<safer alternative>"}]}',
      },
      {
        role: "user",
        content: `Analyze the following contract for risky clauses:\n\n${contractText}`,
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
    logger.error("analyzeRisk", "Failed to parse risk analysis JSON", { content });
    return { clauses: [] };
  }
};
