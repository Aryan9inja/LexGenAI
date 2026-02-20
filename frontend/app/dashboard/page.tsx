"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

type DocumentData = {
  _id: string;
  contractText?: string;
  riskAnalysis?: RiskClause[];
  status: string;
};

const riskColors: Record<string, string> = {
  high: "bg-red-100 border-red-400 text-red-800",
  medium: "bg-yellow-100 border-yellow-400 text-yellow-800",
  low: "bg-green-100 border-green-400 text-green-800",
};

const riskBadge: Record<string, string> = {
  high: "bg-red-500 text-white",
  medium: "bg-yellow-400 text-black",
  low: "bg-green-500 text-white",
};

export default function DashboardPage() {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [selectedClause, setSelectedClause] = useState<RiskClause | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setError("");
    setLoading(true);
    setDocument(null);
    setSelectedClause(null);

    try {
      // Step 1: Create document
      const createRes = await fetch(`${API_BASE}/documents/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim() || "Untitled Contract",
          plainTextDescription: description,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create document");
      const createData = (await createRes.json()) as { document: DocumentData };

      // Step 2: Generate contract
      const genRes = await fetch(`${API_BASE}/documents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId: createData.document._id }),
      });
      if (!genRes.ok) throw new Error("Failed to generate contract");
      const genData = (await genRes.json()) as { document: DocumentData };
      setDocument(genData.document);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRisk = async () => {
    if (!document) return;
    setError("");
    setAnalyzing(true);
    setSelectedClause(null);

    try {
      const res = await fetch(`${API_BASE}/documents/analyze-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId: document._id }),
      });
      if (!res.ok) throw new Error("Failed to analyze risk");
      const data = (await res.json()) as { document: DocumentData };
      setDocument(data.document);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          AI Legal Risk Intelligence
        </h1>

        {/* Input Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Contract Title
            </label>
            <input
              type="text"
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="e.g. Freelance Service Agreement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Describe your contract in plain language
            </label>
            <textarea
              className="w-full h-32 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
              placeholder="e.g. A service agreement between a freelance developer and a startup for 3 months of work, $5000/month, with IP rights assigned to the client..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-5 py-2 rounded-full text-sm font-medium transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading ? "Generating…" : "Generate Contract"}
          </button>
        </div>

        {/* Contract Viewer */}
        {document?.contractText && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Generated Contract
              </h2>
              {document.status !== "analyzed" && (
                <button
                  onClick={handleAnalyzeRisk}
                  disabled={analyzing}
                  className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analyzing && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {analyzing ? "Analyzing…" : "Analyze Risk"}
                </button>
              )}
            </div>
            <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono leading-relaxed border border-zinc-200 dark:border-zinc-700">
              {document.contractText}
            </pre>
          </div>
        )}

        {/* Risk Analysis */}
        {document?.riskAnalysis && document.riskAnalysis.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Risk Analysis — {document.riskAnalysis.length} clause{document.riskAnalysis.length !== 1 ? "s" : ""} flagged
            </h2>
            <div className="space-y-3">
              {document.riskAnalysis.map((clause, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    setSelectedClause(selectedClause?.text === clause.text ? null : clause)
                  }
                  className={`w-full text-left border rounded-xl p-4 transition-all ${riskColors[clause.riskLevel]} hover:opacity-90`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{clause.text}</p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${riskBadge[clause.riskLevel]}`}
                    >
                      {clause.riskLevel.toUpperCase()}
                    </span>
                  </div>

                  {selectedClause?.text === clause.text && (
                    <div className="mt-3 pt-3 border-t border-current/20 space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Why it&apos;s risky:</span>{" "}
                        {clause.explanation}
                      </p>
                      <p>
                        <span className="font-semibold">Suggestion:</span>{" "}
                        {clause.suggestion}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
