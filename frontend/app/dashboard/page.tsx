"use client";

/**
 * Dashboard Page - Centralized Document State Management
 * 
 * STATE ARCHITECTURE:
 * - Single Source of Truth: `currentDocument` holds ALL document data
 * - Derived State: `currentText` and `currentRisks` are computed from `currentDocument`
 * - No duplicate state for text or risks
 * 
 * EDITING FLOW:
 * 1. User clicks Edit -> `isEditing` = true, original text backed up
 * 2. User types -> `handleTextChange` updates `currentDocument.contractText` directly
 * 3. User saves -> API call updates backend, refreshes `currentDocument`, clears backup
 * 4. User cancels -> Restores original text from backup, exits edit mode
 * 
 * PDF GENERATION (Future):
 * - Use `getDocumentData()` for clean structured data
 * - Use `getCleanDocumentText()` for plain text without HTML
 * - Use `getDocumentWithRisks()` for highlighted version with risk markup
 * 
 * This ensures consistency across editor, display, and export functions.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  AlertTriangle, 
  Loader2,
  LogOut,
  Sparkles,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadContractPDF } from "@/lib/pdf-utils";

type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

type DocumentData = {
  _id: string;
  title: string;
  description?: string;
  contractText?: string;
  riskAnalysis?: RiskClause[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiDocument = {
  _id: string;
  title: string;
  contractText?: string;
  riskAnalysis?: RiskClause[];
  status: string;
};

const riskColors: Record<string, string> = {
  high: "border-red-500 bg-red-100 hover:bg-red-200",
  medium: "border-cyan-400 bg-cyan-50 hover:bg-cyan-100",
  low: "border-yellow-400 bg-yellow-50 hover:bg-yellow-100",
};

const riskTextColors: Record<string, string> = {
  high: "text-red-900",
  medium: "text-cyan-900",
  low: "text-yellow-900",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Form state
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  
  // Document state - SINGLE SOURCE OF TRUTH
  const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentData[]>([]);
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [originalTextBeforeEdit, setOriginalTextBeforeEdit] = useState<string>("");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Error state
  const [error, setError] = useState("");

  // Derived state - computed from currentDocument (ALWAYS IN SYNC)
  // These are the ONLY places where document text and risks should be accessed
  const currentText = currentDocument?.contractText || "";
  const currentRisks = currentDocument?.riskAnalysis || [];

  // Fetch document history on mount
  useEffect(() => {
    if (user) {
      fetchDocumentHistory();
    }
  }, [user]);

  // Add tooltip handlers for risk highlights
  useEffect(() => {
    let tooltipTimeout: NodeJS.Timeout | null = null;
    
    const removeTooltip = () => {
      const existingTooltip = document.getElementById('risk-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
    };
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'MARK' && target.hasAttribute('data-risk-index')) {
        // Remove any existing tooltip first
        removeTooltip();
        
        const riskIndex = parseInt(target.getAttribute('data-risk-index') || '0', 10);
        const risk = currentRisks[riskIndex];
        
        if (!risk) return;
        
        const level = risk.riskLevel;
        const explanation = risk.explanation;
        const suggestion = risk.suggestion;
        
        // Small delay before showing tooltip
        tooltipTimeout = setTimeout(() => {
          // Create tooltip
          const tooltip = document.createElement('div');
          tooltip.id = 'risk-tooltip';
          tooltip.style.cssText = `
            position: fixed;
            background: #1f2937;
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.6;
            max-width: 350px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
          `;
          
          tooltip.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; text-transform: uppercase; color: ${
              level === 'high' ? '#fca5a5' : level === 'medium' ? '#67e8f9' : '#fde68a'
            }">
              ${level} Risk
            </div>
            <div style="margin-bottom: 12px;">
              <div style="font-weight: 500; margin-bottom: 4px;">Why risky:</div>
              <div>${explanation}</div>
            </div>
            <div>
              <div style="font-weight: 500; margin-bottom: 4px;">Suggestion:</div>
              <div>${suggestion}</div>
            </div>
          `;
          
          document.body.appendChild(tooltip);
          
          // Position tooltip
          const rect = target.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          
          let top = rect.top - tooltipRect.height - 10;
          let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          
          // Adjust if tooltip goes off screen
          if (top < 10) top = rect.bottom + 10;
          if (left < 10) left = 10;
          if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
          }
          
          tooltip.style.top = `${top}px`;
          tooltip.style.left = `${left}px`;
          
          // Fade in
          requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
          });
        }, 150);
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'MARK' && target.hasAttribute('data-risk-index')) {
        removeTooltip();
      }
    };
    
    const handleScroll = () => {
      removeTooltip();
    };
    
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('scroll', handleScroll, true);
    
    return () => {
      removeTooltip();
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [currentRisks]);

  const fetchDocumentHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.documents.getAll();
      setDocumentHistory(data.documents);
    } catch (err) {
      console.error("Failed to fetch document history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const highlightRiskyText = (text: string, risks: RiskClause[]): string => {
    if (!risks || risks.length === 0) return text;
    
    // Define inline styles for each risk level
    const riskStyles: Record<string, string> = {
      high: 'background-color: #fecaca; border-bottom: 2px solid #ef4444; padding: 2px 4px; border-radius: 3px; font-weight: 500;',
      medium: 'background-color: #cffafe; border-bottom: 2px solid #22d3ee; padding: 2px 4px; border-radius: 3px; font-weight: 500;',
      low: 'background-color: #fef3c7; border-bottom: 2px solid #facc15; padding: 2px 4px; border-radius: 3px; font-weight: 500;',
    };
    
    // Helper to normalize text for comparison (removes HTML and normalizes whitespace)
    const normalizeForComparison = (str: string): string => {
      return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };
    
    // Get normalized text for comparison
    const normalizedText = normalizeForComparison(text);
    
    console.log('Contract text preview:', normalizedText.substring(0, 500));
    console.log('Risks to highlight:', risks.map(r => ({ text: r.text.substring(0, 100), level: r.riskLevel })));
    
    let result = text;
    let highlightCount = 0;
    
    // Sort risks by text length (longer first) to avoid nested highlights
    const sortedRisks = risks.map((risk, originalIndex) => ({ risk, originalIndex }))
      .sort((a, b) => b.risk.text.length - a.risk.text.length);
    
    sortedRisks.forEach(({ risk, originalIndex }) => {
      const style = riskStyles[risk.riskLevel];
      const riskText = risk.text.trim();
      
      // Normalize risk text for comparison
      const normalizedRiskText = normalizeForComparison(riskText).toLowerCase();
      if (!normalizedText.toLowerCase().includes(normalizedRiskText)) {
        console.warn(`Risk #${originalIndex} text not found in contract:`, normalizedRiskText.substring(0, 100));
        
        // Try fuzzy matching with significant words
        const words = normalizedRiskText.split(/\s+/).filter(w => w.length > 3);
        if (words.length >= 3) {
          // Pattern that matches words with any whitespace/HTML between them
          const partialPattern = words.slice(0, 5).map(w => 
            w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          ).join('(?:[\\s\\n]+(?:<[^>]*>)?[\\s\\n]*)+');
          
          const partialRegex = new RegExp(partialPattern, 'gi');
          const beforeLength = result.length;
          
          result = result.replace(partialRegex, (match) => {
            if (match.includes('<mark')) return match;
            highlightCount++;
            console.log(`Partial match for risk #${originalIndex}:`, match.substring(0, 100));
            return `<mark style="${style}" data-risk-index="${originalIndex}">${match}</mark>`;
          });
          
          if (result.length > beforeLength) return;
        }
        return;
      }
      
      // Build pattern that preserves line breaks and whitespace
      const words = riskText.split(/\s+/).map(w => normalizeForComparison(w)).filter(w => w.length > 0);
      const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      
      // Pattern allows whitespace, line breaks, and HTML tags between words
      const pattern = escapedWords.join('(?:[\\s\\n]+(?:<[^>]*>)?[\\s\\n]*)+');
      const regex = new RegExp(pattern, 'gi');
      
      const beforeLength = result.length;
      result = result.replace(regex, (match) => {
        if (match.includes('<mark')) return match; // Skip already highlighted text
        highlightCount++;
        return `<mark style="${style}" data-risk-index="${originalIndex}">${match}</mark>`;
      });
      
      if (result.length === beforeLength) {
        console.warn(`Could not highlight risk #${originalIndex}:`, riskText.substring(0, 100));
      }
    });
    
    console.log(`Highlighted ${highlightCount} out of ${risks.length} risks`);
    
    return result;
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setError("");
    setLoading(true);
    setCurrentDocument(null);
    setIsEditing(false);

    try {
      const createData = await api.documents.create(
        title.trim() || "Untitled Contract",
        description
      );
      const genData = await api.documents.generate(createData.document._id);
      setCurrentDocument(genData.document as DocumentData);
      // Refresh document history
      fetchDocumentHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate contract");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDocument = async (docId: string) => {
    setError("");
    setIsEditing(false);
    try {
      const data = await api.documents.getById(docId);
      setCurrentDocument(data.document);
      // Scroll to the document view
      setTimeout(() => {
        window.document.getElementById("current-document")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  };

  const handleAnalyzeRisk = async () => {
    if (!currentDocument) return;
    setError("");
    setAnalyzing(true);
    setIsEditing(false);

    try {
      const data = await api.documents.analyzeRisk(currentDocument._id);
      setCurrentDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze risk");
    } finally {
      setAnalyzing(false);
    }
  };

  const stripHtmlTags = (html: string): string => {
    // Create a temporary div to parse HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Get text content without HTML tags
    return tmp.textContent || tmp.innerText || '';
  };

  const handleEditToggle = () => {
    if (!currentDocument?.contractText) return;
    
    if (isEditing) {
      // Cancel editing - restore original text
      if (originalTextBeforeEdit) {
        setCurrentDocument({
          ...currentDocument,
          contractText: originalTextBeforeEdit
        });
      }
      setIsEditing(false);
      setOriginalTextBeforeEdit("");
    } else {
      // Start editing - save original text for rollback
      setOriginalTextBeforeEdit(currentDocument.contractText);
      setIsEditing(true);
    }
  };

  const handleTextChange = (newText: string) => {
    if (!currentDocument) return;
    // Update document text in state immediately for responsive UI
    setCurrentDocument({
      ...currentDocument,
      contractText: newText
    });
  };

  const handleSaveEdit = async () => {
    if (!currentDocument || !currentText.trim()) return;
    setError("");
    setSaving(true);

    try {
      const data = await api.documents.update(currentDocument._id, currentText);
      setCurrentDocument(data.document);
      setIsEditing(false);
      setOriginalTextBeforeEdit(""); // Clear the backup
      // Refresh document history
      fetchDocumentHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Utility functions for centralized data access (useful for PDF generation)
  const getDocumentData = () => {
    if (!currentDocument) return null;
    return {
      id: currentDocument._id,
      title: currentDocument.title,
      description: currentDocument.description || "",
      text: stripHtmlTags(currentText), // Clean text without HTML
      rawText: currentText, // Original text (may contain HTML)
      risks: currentRisks,
      status: currentDocument.status,
      createdAt: currentDocument.createdAt,
      updatedAt: currentDocument.updatedAt,
    };
  };

  const getCleanDocumentText = () => {
    return stripHtmlTags(currentText);
  };

  const getDocumentWithRisks = () => {
    if (!currentDocument) return null;
    return {
      ...getDocumentData(),
      highlightedHTML: currentRisks.length > 0 
        ? highlightRiskyText(currentText, currentRisks) 
        : currentText,
    };
  };

  const handleDownloadPDF = () => {
    const docData = getDocumentData();
    if (!docData) {
      setError("No document to download");
      return;
    }
    
    try {
      downloadContractPDF(docData, currentRisks.length > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
      console.error("PDF generation error:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-2">
            <FileText className="size-6" />
            <h1 className="text-xl font-semibold">LexGen AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-sm md:block">
              <span className="text-muted-foreground">Welcome,</span>{" "}
              <span className="font-medium">{user?.name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* Welcome Section */}
        <div className="mb-8 space-y-3">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3.5" />
            AI-Powered Contract Intelligence
          </Badge>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Generate & Analyze Legal Contracts
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Describe your contract needs in plain language, and LexGen AI will draft a structured
                agreement and identify potential risks.
              </p>
            </div>
            
            {/* Document History Dropdown */}
            {documentHistory.length > 0 && (
              <div className="relative shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  className="gap-2"
                >
                  <Clock className="size-4" />
                  History ({documentHistory.length})
                  {historyExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
                
                {historyExpanded && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-96 max-h-96 overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {documentHistory.slice(0, 10).map((doc) => (
                          <button
                            key={doc._id}
                            onClick={() => {
                              handleLoadDocument(doc._id);
                              setHistoryExpanded(false);
                            }}
                            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <h4 className="font-medium truncate">{doc.title || "Untitled Contract"}</h4>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                  {new Date(doc.createdAt || "").toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <Badge
                                  variant={
                                    doc.status === "analyzed"
                                      ? "default"
                                      : doc.status === "generated"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {doc.status}
                                </Badge>
                                {doc.riskAnalysis && doc.riskAnalysis.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="size-3.5" />
                                    {doc.riskAnalysis.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Eye className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                        {documentHistory.length > 10 && (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            Showing 10 most recent
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6" id="current-document">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create a New Contract</CardTitle>
              <CardDescription>
                Tell us what kind of contract you need, and we'll generate it for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Contract Title
                </label>
                <input
                  id="title"
                  type="text"
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  placeholder="e.g., Freelance Service Agreement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Contract Description
                </label>
                <textarea
                  id="description"
                  className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  placeholder="Describe your contract in plain language... For example: A service agreement between a freelance developer and a startup for 3 months of work, $5000/month, with IP rights assigned to the client after full payment."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <Button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                size="lg"
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {loading ? "Generating Contract..." : "Generate Contract"}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Contract */}
          {currentDocument?.contractText && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle>Generated Contract</CardTitle>
                    <CardDescription>
                      {isEditing 
                        ? "Edit the contract text and save your changes. You can re-analyze after saving."
                        : currentDocument.status === "analyzed" && currentRisks.length > 0
                        ? `${currentRisks.length} risk${currentRisks.length !== 1 ? 's' : ''} identified - hover over highlighted text for details`
                        : "Review the generated contract and analyze it for potential risks"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={handleSaveEdit}
                          disabled={saving || !currentText.trim()}
                          variant="default"
                          size="sm"
                        >
                          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                          <Save className="mr-2 size-4" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={handleEditToggle}
                          disabled={saving}
                          variant="outline"
                          size="sm"
                        >
                          <X className="mr-2 size-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="mr-2 size-4" />
                          Download PDF
                        </Button>
                        <Button
                          onClick={handleEditToggle}
                          variant="outline"
                          size="sm"
                        >
                          <Edit3 className="mr-2 size-4" />
                          Edit
                        </Button>
                        {currentDocument.status !== "analyzed" && (
                          <Button
                            onClick={handleAnalyzeRisk}
                            disabled={analyzing}
                            variant="default"
                            size="sm"
                          >
                            {analyzing && <Loader2 className="mr-2 size-4 animate-spin" />}
                            <AlertTriangle className="mr-2 size-4" />
                            {analyzing ? "Analyzing..." : "Analyze Risks"}
                          </Button>
                        )}
                        {currentDocument.status === "analyzed" && (
                          <Button
                            onClick={handleAnalyzeRisk}
                            disabled={analyzing}
                            variant="secondary"
                            size="sm"
                          >
                            {analyzing && <Loader2 className="mr-2 size-4 animate-spin" />}
                            <AlertTriangle className="mr-2 size-4" />
                            {analyzing ? "Re-analyzing..." : "Re-analyze"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Tip:</strong> Edit the contract to fill in specific details like names, dates, amounts, or any other information. 
                        After saving, you can re-analyze the document for risks.
                      </p>
                    </div>
                    <textarea
                      className="min-h-96 w-full rounded-lg border-2 border-border bg-background text-foreground p-6 text-sm leading-relaxed outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
                      value={stripHtmlTags(currentText)}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder="Enter your contract text here..."
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{currentText.trim().split(/\s+/).filter(w => w).length} words</span>
                      <span>{currentText.length} characters</span>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-muted p-6 text-sm leading-relaxed">
                    {currentRisks.length > 0 ? (
                      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                        __html: highlightRiskyText(currentText, currentRisks)
                      }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{stripHtmlTags(currentText)}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
