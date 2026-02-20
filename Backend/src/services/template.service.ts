import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { glob } from "fast-glob";
import {logger} from "../utils/logger.js";

// Type definitions
export interface TemplateChunk {
  templateName: string;
  category: string;
  sectionTitle: string;
  content: string;
  filePath: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface ParsedTemplate {
  templateName: string;
  category: string;
  filePath: string;
  chunks: TemplateChunk[];
}

/**
 * Parse a single markdown template file and split it into sections
 * @param filePath - Absolute path to the markdown file
 * @returns ParsedTemplate with chunks split by ## headers
 */
export async function parseMarkdownTemplate(
  filePath: string
): Promise<ParsedTemplate> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data: frontmatter, content } = matter(fileContent);

    // Extract metadata from file path
    const pathParts = filePath.split(path.sep);
    const fileName = path.basename(filePath, ".md");
    const categoryFolder = pathParts[pathParts.length - 2]; // Parent folder name

    // Map folder names to category enum values
    const category = normalizeCategoryName(categoryFolder);
    const templateName = fileName;

    // Split content by markdown headers (## or ###)
    const sections = splitIntoSections(content);

    // Create chunks from sections
    const chunks: TemplateChunk[] = sections.map((section, index) => ({
      templateName,
      category,
      sectionTitle: section.title || `Section ${index + 1}`,
      content: section.content.trim(),
      filePath,
      chunkIndex: index,
      totalChunks: sections.length,
    }));

    logger.info(
      "TemplateService",
      `Parsed template: ${templateName} (${chunks.length} chunks)`
    );

    return {
      templateName,
      category,
      filePath,
      chunks,
    };
  } catch (error: any) {
    logger.error("TemplateService", `Failed to parse ${filePath}`, error);
    throw error;
  }
}

/**
 * Split markdown content into sections based on ## headers
 * @param content - Raw markdown content
 * @returns Array of sections with title and content
 */
function splitIntoSections(content: string): Array<{ title: string; content: string }> {
  const lines = content.split("\n");
  const sections: Array<{ title: string; content: string }> = [];
  let currentSection: { title: string; content: string } | null = null;

  for (const line of lines) {
    // Check for ## or ### headers (but not #)
    const headerMatch = line.match(/^(#{2,3})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if exists
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        title: headerMatch[2].trim(),
        content: "",
      };
    } else if (currentSection) {
      // Add line to current section
      currentSection.content += line + "\n";
    } else {
      // Content before first header - create intro section
      if (line.trim()) {
        if (!currentSection) {
          currentSection = {
            title: "Introduction",
            content: "",
          };
        }
        currentSection.content += line + "\n";
      }
    }
  }

  // Add last section
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }

  // If no sections found, treat entire content as one chunk
  if (sections.length === 0 && content.trim()) {
    sections.push({
      title: "Full Document",
      content: content.trim(),
    });
  }

  return sections;
}

/**
 * Normalize folder names to match category enum
 * @param folderName - Folder name from file path
 * @returns Normalized category name
 */
function normalizeCategoryName(folderName: string): string {
  const categoryMap: Record<string, string> = {
    nda: "nda",
    "offer-letters": "offer-letters",
    "service-provider-agreements": "service-provider-agreements",
    "consultancy-agreements": "consultancy-agreements",
  };

  return categoryMap[folderName.toLowerCase()] || folderName;
}

/**
 * Load and parse all templates from the templates directory
 * @param templatesDir - Path to templates root directory
 * @returns Array of all parsed templates with chunks
 */
export async function loadAllTemplates(
  templatesDir: string = path.join(process.cwd(), "..", "templates")
): Promise<ParsedTemplate[]> {
  try {
    logger.info("TemplateService", `Loading templates from: ${templatesDir}`);

    // Find all .md files recursively
    const templateFiles = await glob("**/*.md", {
      cwd: templatesDir,
      absolute: true,
    });

    logger.info(
      "TemplateService",
      `Found ${templateFiles.length} template files`
    );

    // Parse all templates
    const parsedTemplates: ParsedTemplate[] = [];

    for (const filePath of templateFiles) {
      try {
        const parsed = await parseMarkdownTemplate(filePath);
        parsedTemplates.push(parsed);
      } catch (error: any) {
        logger.warn(
          "TemplateService",
          `Skipping file ${filePath}: ${error.message}`
        );
      }
    }

    const totalChunks = parsedTemplates.reduce(
      (sum, t) => sum + t.chunks.length,
      0
    );
    logger.info(
      "TemplateService",
      `Loaded ${parsedTemplates.length} templates with ${totalChunks} total chunks`
    );

    return parsedTemplates;
  } catch (error: any) {
    logger.error("TemplateService", "Failed to load templates", error);
    throw error;
  }
}

/**
 * Get statistics about loaded templates
 * @param templates - Array of parsed templates
 * @returns Statistics object
 */
export function getTemplateStats(templates: ParsedTemplate[]): {
  totalTemplates: number;
  totalChunks: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};

  templates.forEach((template) => {
    byCategory[template.category] = (byCategory[template.category] || 0) + 1;
  });

  const totalChunks = templates.reduce((sum, t) => sum + t.chunks.length, 0);

  return {
    totalTemplates: templates.length,
    totalChunks,
    byCategory,
  };
}
