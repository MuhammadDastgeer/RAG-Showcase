import React from "react";
import { RagType } from "../types";
import {
  ArrowRight,
  Database,
  Search,
  Sparkles,
  Bot,
  BrainCircuit,
  Filter,
  Layers,
  GitFork,
  RotateCw,
  Network,
  FolderGit2,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Image as ImageIcon,
  Merge,
  Cpu,
  CheckCircle,
} from "lucide-react";

interface RagDiagramProps {
  ragType: RagType;
}

export const RagDiagram: React.FC<RagDiagramProps> = ({ ragType }) => {
  const renderDiagramContent = () => {
    switch (ragType) {
      case "naive":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                User Query
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Embed Text
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Vector DB
              </span>
            </div>
            <div className="flex items-center justify-center my-1">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center font-medium text-slate-700 dark:text-slate-300">
              Top-K Chunks Direct Prompt Injection &rarr; LLM Answer
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700">Query</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700">Rewrite</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700">Top-8 Vector</span>
            </div>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-center">
              <div className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">Reranker Cross-Encoder</div>
              <div className="text-[10px] text-slate-500">Rescores to Top-4 Highest Relevance Chunks</div>
            </div>
          </div>
        );

      case "modular":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
              <div className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px] mb-1">
                Modular Dynamic Orchestrator
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-medium">
                <span className="p-1 rounded bg-white dark:bg-slate-800">Rewriter</span>
                <span className="p-1 rounded bg-white dark:bg-slate-800">Reranker</span>
                <span className="p-1 rounded bg-white dark:bg-slate-800">Memory</span>
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-medium">
              Flexible Plugin Pipeline Executed On Demand
            </div>
          </div>
        );

      case "multi-hop":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-300 text-[11px]">Query Decomposition</div>
              <div className="flex gap-1 text-[10px]">
                <div className="flex-1 p-1 rounded bg-white dark:bg-slate-800 text-center font-medium truncate">Sub-Q1 Search</div>
                <div className="flex-1 p-1 rounded bg-white dark:bg-slate-800 text-center font-medium truncate">Sub-Q2 Search</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-medium">
              Synthesizes Multi-Hop Evidence Across Documents
            </div>
          </div>
        );

      case "iterative":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <div className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">Search &rarr; Draft Answer</div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Self-Reflection Loop: Are gaps remaining? &rarr; Iterate Search
              </div>
            </div>
          </div>
        );

      case "hyde":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-center space-y-1">
              <div className="font-bold text-cyan-700 dark:text-cyan-300 text-[11px]">
                Hypothetical Document Generator
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Embed Hypo Doc &rarr; Search Real Chunks &rarr; LLM Synthesizer
              </div>
            </div>
          </div>
        );

      case "graph":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 space-y-1">
              <div className="font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                Knowledge Graph Traversal
              </div>
              <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 text-center">
                (Entity A) &rarr; [Relation] &rarr; (Entity B) + Vector Chunks
              </div>
            </div>
          </div>
        );

      case "hybrid":
        return (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="p-1.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 text-center font-bold text-[10px]">
                Dense Vector Search
              </div>
              <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 text-center font-bold text-[10px]">
                Sparse BM25 Keyword
              </div>
            </div>
            <div className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-center font-bold text-teal-800 dark:text-teal-300 text-[10px]">
              Reciprocal Rank Fusion (RRF) &rarr; LLM
            </div>
          </div>
        );

      case "branched":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-center space-y-1">
              <div className="font-bold text-orange-700 dark:text-orange-300 text-[11px]">
                Document Branch Router
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Routes Query to Specific Folder / File Context &rarr; Targeted Search
              </div>
            </div>
          </div>
        );

      case "conversational":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-center space-y-1">
              <div className="font-bold text-sky-700 dark:text-sky-300 text-[11px]">
                Standalone Query Reformulator
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Resolves Ambiguous Pronouns with Conversation Memory Context
              </div>
            </div>
          </div>
        );

      case "agentic":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-center space-y-1">
              <div className="font-bold text-violet-700 dark:text-violet-300 text-[11px]">
                ReAct Autonomous Agent Loop
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                Thought &rarr; Tool Action: search() &rarr; Observation
              </div>
            </div>
          </div>
        );

      case "self-rag":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <div className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                Self-Reflection & Grounding Critique
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Decision: Retrieve? &rarr; Grade Support & Grounding &rarr; Output
              </div>
            </div>
          </div>
        );

      case "corrective":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-center space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                CRAG Retrieval Evaluator
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Grades Quality &rarr; [Correct / Ambiguous / Incorrect Fallback]
              </div>
            </div>
          </div>
        );

      case "adaptive":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/60 border border-yellow-200 dark:border-yellow-800 text-center space-y-1">
              <div className="font-bold text-yellow-800 dark:text-yellow-300 text-[11px]">
                Complexity Classifier
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Simple (Direct) | Single-hop (Vector) | Multi-hop (GraphRAG)
              </div>
            </div>
          </div>
        );

      case "multimodal":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-center space-y-1">
              <div className="font-bold text-pink-700 dark:text-pink-300 text-[11px]">
                Joint Text + Image Retrieval
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Visual Assets + Text Embeddings &rarr; Vision LLM Synthesis
              </div>
            </div>
          </div>
        );

      case "fusion":
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center space-y-1">
              <div className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                RAG-Fusion Multi-Query Engine
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                4 Query Variations &rarr; 4 Searches &rarr; Reciprocal Rank Fusion
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Architecture Flow Diagram
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          Visual Diagram
        </span>
      </div>
      {renderDiagramContent()}
    </div>
  );
};
