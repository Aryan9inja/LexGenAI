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
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  X,
  Download,
  SkipForward,
  Plus,
  Check,
  CheckCheck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuggestionModal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { SkeletonDocument, SkeletonForm } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadContractPDF } from "@/lib/pdf-utils";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

type QuestionAnswer = {
  question: string;
  answer?: string;
  timestamp: string;
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
  pendingQuestions?: string[];
  conversationHistory?: QuestionAnswer[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const toast = useToast();
  
  // Form state
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  
  // Document state - SINGLE SOURCE OF TRUTH
  const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentData[]>([]);
  
  // Q&A state
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [conversationExpanded, setConversationExpanded] = useState(false);
  const [originalTextBeforeEdit, setOriginalTextBeforeEdit] = useState<string>("");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Error state
  const [error, setError] = useState("");
  
  // Suggestion modal state
  const [suggestionModal, setSuggestionModal] = useState<{
    isOpen: boolean;
    riskIndex: number;
    question: string;
    riskLevel: "high" | "medium" | "low";
    isLoadingQuestion: boolean;
  }>({
    isOpen: false,
    riskIndex: -1,
    question: "",
    riskLevel: "medium",
    isLoadingQuestion: false,
  });

  // Derived state - computed from currentDocument (ALWAYS IN SYNC)
  // These are the ONLY places where document text and risks should be accessed
  const currentText = currentDocument?.contractText || "";
  const currentRisks = currentDocument?.riskAnalysis || [];

  // Fetch document history helper
  const fetchDocumentHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await api.documents.getAll();
      setDocumentHistory(data.documents);
    } catch (err) {
      console.error("Failed to fetch document history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Apply suggestion handlers
  const openSuggestionModal = useCallback(async (riskIndex: number) => {
    if (!currentDocument || !currentRisks[riskIndex]) return;
    
    // Open modal immediately with loading state for instant feedback
    setSuggestionModal({
      isOpen: true,
      riskIndex,
      question: "",
      riskLevel: currentRisks[riskIndex].riskLevel,
      isLoadingQuestion: true,
    });
    
    try {
      setError("");
      
      // Fetch the follow-up question in the background
      const questionData = await api.documents.getSuggestionQuestion(
        currentDocument._id,
        riskIndex
      );
      
      // Update modal with the question
      setSuggestionModal(prev => ({
        ...prev,
        question: questionData.question,
        isLoadingQuestion: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get suggestion question";
      setError(message);
      toast.error(message);
      // Close modal on error
      setSuggestionModal(prev => ({ ...prev, isOpen: false, isLoadingQuestion: false }));
    }
  }, [currentDocument, currentRisks, toast]);

  const handleSuggestionSubmit = useCallback(async (answer: string) => {
    if (!currentDocument || suggestionModal.riskIndex < 0) return;
    
    try {
      setError("");
      setSaving(true);
      
      // Apply the suggestion with the additional context
      const data = await api.documents.applySuggestion(
        currentDocument._id,
        suggestionModal.riskIndex,
        answer || undefined
      );
      
      setCurrentDocument(data.document as DocumentData);
      fetchDocumentHistory();
      toast.success("Suggestion applied successfully!");
      
      // Close the modal
      setSuggestionModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply suggestion";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [currentDocument, suggestionModal.riskIndex, fetchDocumentHistory, toast]);

  const closeSuggestionModal = useCallback(() => {
    setSuggestionModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const applyAllSuggestions = useCallback(() => {
    if (!currentDocument || currentRisks.length === 0) return;
    
    const confirmed = confirm(
      `Apply all ${currentRisks.length} suggestion${currentRisks.length > 1 ? 's' : ''}?\n\n` +
      `This will use AI to rewrite all risky clauses in the contract following the suggestions. ` +
      `The changes will be automatically saved.\n\n` +
      `Do you want to proceed?`
    );
    
    if (!confirmed) return;
    
    setError("");
    setSaving(true);
    
    api.documents.applyAllSuggestions(currentDocument._id)
      .then((data) => {
        setCurrentDocument(data.document as DocumentData);
        fetchDocumentHistory();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to apply suggestions");
      })
      .finally(() => {
        setSaving(false);
      });
  }, [currentDocument, currentRisks, fetchDocumentHistory]);

  // Fetch document history on mount
  useEffect(() => {
    if (user) {
      fetchDocumentHistory();
    }
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both dropdowns
      if (!target.closest('[data-dropdown]')) {
        setHistoryExpanded(false);
        setConversationExpanded(false);
      }
    };

    if (historyExpanded || conversationExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [historyExpanded, conversationExpanded]);

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
          // Create tooltip with improved structure
          const tooltip = document.createElement('div');
          tooltip.id = 'risk-tooltip';
          tooltip.className = 'risk-tooltip-container';
          tooltip.style.cssText = `
            position: fixed;
            background: #1f2937;
            color: white;
            padding: 12px;
            border-radius: 10px;
            font-size: 13px;
            line-height: 1.5;
            max-width: 320px;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            z-index: 9999;
            pointer-events: auto;
            opacity: 0;
            transition: opacity 0.15s ease;
          `;
          
          tooltip.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
              <span style="font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; color: ${
                level === 'high' ? '#fca5a5' : level === 'medium' ? '#fb923c' : '#fde68a'
              }; background: ${
                level === 'high' ? 'rgba(239, 68, 68, 0.15)' : level === 'medium' ? 'rgba(251, 146, 60, 0.15)' : 'rgba(250, 204, 21, 0.15)'
              }; padding: 4px 8px; border-radius: 4px;">
                ${level} Risk
              </span>
              <button
                id="apply-suggestion-btn-${riskIndex}"
                style="
                  padding: 6px 12px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.15s;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  white-space: nowrap;
                "
                onmouseover="this.style.background='#2563eb'; this.style.transform='scale(1.02)'"
                onmouseout="this.style.background='#3b82f6'; this.style.transform='scale(1)'"
              >
                ✓ Fix This
              </button>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="font-weight: 500; margin-bottom: 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #9ca3af;">Why risky</div>
              <div style="font-size: 12px; color: #e5e7eb;">${explanation}</div>
            </div>
            <div>
              <div style="font-weight: 500; margin-bottom: 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #9ca3af;">Suggestion</div>
              <div style="font-size: 12px; color: #e5e7eb;">${suggestion}</div>
            </div>
          `;
          
          document.body.appendChild(tooltip);
          
          // Add click handler for the apply button
          const applyBtn = document.getElementById(`apply-suggestion-btn-${riskIndex}`);
          if (applyBtn) {
            applyBtn.addEventListener('click', () => {
              openSuggestionModal(riskIndex);
              removeTooltip();
            });
          }
          
          // Position tooltip with better overflow handling
          const rect = target.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const margin = 12;
          
          // Calculate optimal position
          let top: number;
          let left: number;
          
          // Try to position above the target first
          const spaceAbove = rect.top;
          const spaceBelow = viewportHeight - rect.bottom;
          
          if (spaceAbove >= tooltipRect.height + margin) {
            // Position above
            top = rect.top - tooltipRect.height - margin;
          } else if (spaceBelow >= tooltipRect.height + margin) {
            // Position below
            top = rect.bottom + margin;
          } else {
            // Position in the middle of the viewport, centered vertically
            top = Math.max(margin, (viewportHeight - tooltipRect.height) / 2);
          }
          
          // Horizontal positioning - center on target, but keep within viewport
          left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          
          // Clamp to viewport bounds
          if (left < margin) left = margin;
          if (left + tooltipRect.width > viewportWidth - margin) {
            left = viewportWidth - tooltipRect.width - margin;
          }
          
          // Ensure top is within bounds
          if (top < margin) top = margin;
          if (top + tooltipRect.height > viewportHeight - margin) {
            top = viewportHeight - tooltipRect.height - margin;
          }
          
          tooltip.style.top = `${top}px`;
          tooltip.style.left = `${left}px`;
          
          // Fade in
          requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
          });
        }, 100);
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Don't remove tooltip if moving to the tooltip itself
      if (target.tagName === 'MARK' && target.hasAttribute('data-risk-index')) {
        if (!relatedTarget || !relatedTarget.closest('#risk-tooltip')) {
          // Delay removal to allow moving mouse to tooltip
          setTimeout(() => {
            const tooltip = document.getElementById('risk-tooltip');
            if (tooltip && !tooltip.matches(':hover')) {
              removeTooltip();
            }
          }, 150);
        }
      }
    };
    
    const handleTooltipMouseLeave = () => {
      const tooltip = document.getElementById('risk-tooltip');
      if (tooltip) {
        tooltip.addEventListener('mouseleave', () => {
          removeTooltip();
        });
      }
    };
    
    const handleScroll = () => {
      removeTooltip();
    };
    
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('scroll', handleScroll, true);
    
    // Check for tooltip mouse leave periodically
    const tooltipCheckInterval = setInterval(() => {
      const tooltip = document.getElementById('risk-tooltip');
      if (tooltip) {
        handleTooltipMouseLeave();
      }
    }, 200);
    
    return () => {
      removeTooltip();
      clearInterval(tooltipCheckInterval);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [currentRisks, openSuggestionModal]);

  const highlightRiskyText = (text: string, risks: RiskClause[]): string => {
    if (!risks || risks.length === 0) return text;
    
    // Define inline styles for each risk level
    const riskStyles: Record<string, string> = {
      high: 'background-color: #fecaca; border-bottom: 2px solid #ef4444; padding: 2px 4px; border-radius: 3px; font-weight: 500;',
      medium: 'background-color: #fed7aa; border-bottom: 2px solid #fb923c; padding: 2px 4px; border-radius: 3px; font-weight: 500;',
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
    setQuestionAnswers({});

    try {
      const createData = await api.documents.create(
        title.trim() || "Untitled Contract",
        description
      );
      const genData = await api.documents.generate(createData.document._id);
      setCurrentDocument(genData.document as DocumentData);
      
      // Check if there are pending questions
      if (genData.document.status === "awaiting_info" && (genData.document as any).pendingQuestions?.length > 0) {
        // Initialize empty answers for each question
        const initialAnswers: Record<string, string> = {};
        ((genData.document as any).pendingQuestions as string[]).forEach((q: string) => {
          initialAnswers[q] = "";
        });
        setQuestionAnswers(initialAnswers);
        setCurrentQuestionIndex(0);
        toast.info("Additional information needed to complete your contract");
      } else {
        toast.success("Contract generated successfully!");
      }
      
      // Refresh document history
      fetchDocumentHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate contract";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!currentDocument) return;
    
    // Validate that all questions have been answered
    const pendingQuestions = currentDocument.pendingQuestions || [];
    const unansweredQuestions = pendingQuestions.filter(q => !questionAnswers[q]?.trim());
    
    if (unansweredQuestions.length > 0) {
      setError("Please answer all questions before continuing");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Submit the answers
      const answers = pendingQuestions.map(question => ({
        question,
        answer: questionAnswers[question],
      }));
      
      await api.documents.answerQuestions(currentDocument._id, answers);
      
      // Regenerate the contract with the new information
      const genData = await api.documents.generate(currentDocument._id);
      setCurrentDocument(genData.document as DocumentData);
      
      // Check if there are still more pending questions
      if (genData.document.status === "awaiting_info" && (genData.document as any).pendingQuestions?.length > 0) {
        // Initialize empty answers for new questions
        const initialAnswers: Record<string, string> = {};
        ((genData.document as any).pendingQuestions as string[]).forEach((q: string) => {
          initialAnswers[q] = "";
        });
        setQuestionAnswers(initialAnswers);
        setCurrentQuestionIndex(0);
      } else {
        // Clear the Q&A state
        setQuestionAnswers({});
        setCurrentQuestionIndex(0);
      }
      
      // Refresh document history
      fetchDocumentHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answers");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestions = async () => {
    if (!currentDocument) return;

    setError("");
    setLoading(true);

    try {
      // Force generate the contract even with incomplete information
      const genData = await api.documents.generate(currentDocument._id, true);
      setCurrentDocument(genData.document as DocumentData);
      
      // Clear the Q&A state
      setQuestionAnswers({});
      setCurrentQuestionIndex(0);
      
      // Refresh document history
      fetchDocumentHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate contract");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    // Reset all state to start fresh
    setCurrentDocument(null);
    setDescription("");
    setTitle("");
    setQuestionAnswers({});
    setCurrentQuestionIndex(0);
    setError("");
    setIsEditing(false);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      const risksFound = data.document.riskAnalysis?.length || 0;
      if (risksFound > 0) {
        toast.warning(`Analysis complete: ${risksFound} risk${risksFound > 1 ? 's' : ''} identified`);
      } else {
        toast.success("Analysis complete: No significant risks found!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze risk";
      setError(message);
      toast.error(message);
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
      toast.success("Changes saved successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Failed to logout");
    }
  };

  // Utility function for centralized data access (used for PDF generation)
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Spinner size="xl" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.header
        className="border-b border-border"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <FileText className="size-6" />
            <h1 className="text-xl font-semibold">LexGen AI</h1>
          </motion.div>
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
      </motion.header>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* Welcome Section */}
        <motion.div
          className="mb-8 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
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
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Create New Button - Show when there's a current document */}
              <AnimatePresence>
                {currentDocument && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button
                      onClick={handleCreateNew}
                      variant="default"
                      className="gap-2"
                    >
                      <Plus className="size-4" />
                      Create New
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conversation History Dropdown - Show during Q&A if there are answered questions */}
              {currentDocument?.conversationHistory && 
               currentDocument.conversationHistory.filter(qa => qa.answer).length > 0 && (
                <div className="relative" data-dropdown>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConversationExpanded(!conversationExpanded);
                      setHistoryExpanded(false);
                    }}
                    className="gap-2"
                  >
                    <Sparkles className="size-4" />
                    Questions ({currentDocument.conversationHistory.filter(qa => qa.answer).length})
                    {conversationExpanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                  
                  {conversationExpanded && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-96 max-h-96 overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
                      <div className="divide-y divide-border">
                        {currentDocument.conversationHistory
                          .filter(qa => qa.answer)
                          .map((qa, idx) => (
                            <div key={idx} className="p-4 space-y-2">
                              <p className="text-sm font-medium">Q: {qa.question}</p>
                              <p className="text-sm text-muted-foreground">A: {qa.answer}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document History Dropdown */}
              {documentHistory.length > 0 && (
                <div className="relative" data-dropdown>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setHistoryExpanded(!historyExpanded);
                      setConversationExpanded(false);
                    }}
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
                              setConversationExpanded(false);
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
        </motion.div>

        <motion.div
          className="grid gap-6"
          id="current-document"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Loading skeleton while generating */}
          {loading && !currentDocument?.contractText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Spinner size="md" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-foreground/70" />
                        Generating Your Contract
                      </CardTitle>
                      <CardDescription className="mt-1">
                        LexGen AI is analyzing your requirements and drafting a structured contract...
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Progress indeterminate className="mb-4" />
                  <SkeletonDocument />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Generated Contract - Shows first when available */}
          <AnimatePresence mode="wait">
            {currentDocument?.contractText && (
              <motion.div
                key="contract"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle>Generated Contract</CardTitle>
                    <CardDescription>
                      {isEditing 
                        ? "Edit the contract text and save your changes. You can re-analyze after saving."
                        : currentDocument.status === "analyzed" && currentRisks.length > 0
                        ? "Some risks identified - hover over highlighted text for details"
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
                          <>
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
                            {currentRisks.length > 0 && (
                              <Button
                                onClick={applyAllSuggestions}
                                disabled={saving}
                                variant="default"
                                size="sm"
                              >
                                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                                <CheckCheck className="mr-2 size-4" />
                                {saving ? "Applying..." : "Apply All Suggestions"}
                              </Button>
                            )}
                          </>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Form - Hidden when questions are pending or contract is generated */}
          {!loading && !currentDocument?.contractText && 
           !(currentDocument?.status === "awaiting_info" && currentDocument?.pendingQuestions && currentDocument.pendingQuestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
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
                  loading={loading}
                >
                  {loading ? "Generating Contract..." : "Generate Contract"}
                </Button>
              </CardContent>
            </Card>
            </motion.div>
          )}

          {/* Pending Questions - Show when awaiting info */}
          {currentDocument?.status === "awaiting_info" && currentDocument?.pendingQuestions && currentDocument.pendingQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-blue-500">
                <CardHeader>
                  {/* Context: What contract they're creating */}
                  <div className="mb-3 rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                    <p className="text-xs font-medium text-blue-900">
                    Creating: {currentDocument.title || "Untitled Contract"}
                  </p>
                  {currentDocument.description && (
                    <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                      {currentDocument.description}
                    </p>
                  )}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-5 text-blue-500" />
                      Additional Information Needed
                    </CardTitle>
                    <CardDescription>
                      Question {currentQuestionIndex + 1} of {currentDocument.pendingQuestions.length}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="flex gap-1">
                      {currentDocument.pendingQuestions.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            idx === currentQuestionIndex
                              ? "bg-blue-500"
                              : questionAnswers[currentDocument.pendingQuestions![idx]]?.trim()
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Question */}
                  <div className="space-y-3">
                    <label 
                      htmlFor="current-question"
                      className="block text-base font-medium"
                    >
                      {currentDocument.pendingQuestions[currentQuestionIndex]}
                    </label>
                    <textarea
                      id="current-question"
                      className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      placeholder="Enter your answer..."
                      value={questionAnswers[currentDocument.pendingQuestions[currentQuestionIndex]] || ""}
                      onChange={(e) => setQuestionAnswers(prev => ({
                        ...prev,
                        [currentDocument.pendingQuestions![currentQuestionIndex]]: e.target.value
                      }))}
                      onKeyDown={(e) => {
                        // Ctrl/Cmd + Enter to go to next question or submit
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          if (currentQuestionIndex < currentDocument.pendingQuestions!.length - 1) {
                            setCurrentQuestionIndex(prev => prev + 1);
                            setError("");
                          } else {
                            handleSubmitAnswers();
                          }
                        }
                      }}
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to proceed
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    {/* Left Side - Back Button */}
                    <Button
                      onClick={() => {
                        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                        setError("");
                      }}
                      disabled={loading || currentQuestionIndex === 0}
                      variant="outline"
                      size="lg"
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Back
                    </Button>

                    {/* Center - Skip All Button */}
                    <Button
                      onClick={handleSkipQuestions}
                      disabled={loading}
                      size="lg"
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      <SkipForward className="mr-2 size-4" />
                      Skip All
                    </Button>

                    {/* Right Side - Next/Submit Button */}
                    {currentQuestionIndex < currentDocument.pendingQuestions.length - 1 ? (
                      <Button
                        onClick={() => {
                          setCurrentQuestionIndex(prev => Math.min(currentDocument.pendingQuestions!.length - 1, prev + 1));
                          setError("");
                        }}
                        disabled={loading}
                        size="lg"
                      >
                        Next
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitAnswers}
                        disabled={loading}
                        size="lg"
                      >
                        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {loading ? "Generating..." : "Submit & Generate"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Suggestion Modal */}
      <SuggestionModal
        isOpen={suggestionModal.isOpen}
        onClose={closeSuggestionModal}
        onSubmit={handleSuggestionSubmit}
        question={suggestionModal.question}
        riskLevel={suggestionModal.riskLevel}
        isLoading={saving}
        isLoadingQuestion={suggestionModal.isLoadingQuestion}
      />
    </main>
  );
}
