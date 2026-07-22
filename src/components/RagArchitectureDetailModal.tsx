import React from "react";
import { X, Sparkles, Cpu, BookOpen, CheckCircle, ArrowRight, GitBranch, Layers, ShieldCheck } from "lucide-react";
import { RagType } from "../types";
import { getRagArchById } from "../lib/ragRegistry";

interface RagArchitectureDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ragType: RagType;
}

export const RagArchitectureDetailModal: React.FC<RagArchitectureDetailModalProps> = ({
  isOpen,
  onClose,
  ragType,
}) => {
  if (!isOpen) return null;

  const arch = getRagArchById(ragType);

  const renderFullFlowDiagram = () => {
    switch (ragType) {
      case "naive":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 space-y-1">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">Step 1: User Prompt</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Raw natural language question input</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1">
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Step 2: Dense Embedding</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Convert query text to 384d vector space</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 space-y-1">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">Step 3: Vector Similarity</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Cosine Similarity retrieve Top-K chunks</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Step 4: LLM Synthesis</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Direct Context Prompt Injection &rarr; Answer</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-mono text-center">
              [ User Query ] &rarr; [ Embedding ] &rarr; [ Vector Index Search ] &rarr; [ Context + Prompt ] &rarr; [ LLM Response ]
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">1. Query Rewriter</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Expands synonyms & clarifies pronouns</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">2. Candidate Pool</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Fetches Top-8 broad matches from Vector DB</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">3. Reranker Cross-Encoder</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Cross-evaluates chunk relevance & selects Top-4</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">4. High-Precision LLM</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Generates accurate answer from reranked context</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Full Execution Flow Pipeline
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {arch.pipelineStepsSummary.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{arch.name}</h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {arch.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Category: {arch.category}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Overview & How it works (Theory) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Theory & Mechanics (How it Works)</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
              <p className="font-medium text-slate-900 dark:text-slate-100">{arch.description}</p>
              <p>
                In standard vector search architectures, user queries are matched directly against embedded document chunks.
                {arch.id === "naive" && " Naive RAG is the simplest foundational pattern, performing single-step Cosine Similarity vector retrieval and injecting retrieved text directly into the LLM prompt."}
                {arch.id === "advanced" && " Advanced RAG introduces pre-retrieval query rewriting to expand terms and post-retrieval cross-encoder reranking to filter out noise."}
                {arch.id === "multi-hop" && " Multi-hop RAG breaks complex questions into 2-4 sub-questions, retrieves independent evidence for each, and synthesizes overall context."}
                {arch.id === "hyde" && " HyDE (Hypothetical Document Embeddings) generates a hypothetical response draft first, using that draft vector to fetch real matching chunks."}
                {arch.id === "graph" && " GraphRAG constructs an Entity-Relationship Knowledge Graph during ingestion, traversing graph triples alongside vector similarity."}
                {arch.id === "agentic" && " Agentic RAG operates via an autonomous ReAct loop (Thought -> Action -> Observation) to search, inspect, and reason dynamically."}
                {arch.id === "hybrid" && " Hybrid RAG combines dense semantic vectors with sparse BM25 keyword search, merging results via Reciprocal Rank Fusion."}
              </p>
            </div>
          </div>

          {/* Section 2: Step-by-Step Execution Pipeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Pipeline Steps Summary</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {arch.pipelineStepsSummary.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span className="w-6 h-6 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Full Visual Flow Diagram */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <GitBranch className="w-4 h-4 text-indigo-500" />
              <span>Full Visual Architecture Flow Diagram</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800">
              {renderFullFlowDiagram()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
