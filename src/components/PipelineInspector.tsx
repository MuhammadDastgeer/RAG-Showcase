import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Brain,
  Network,
  Bot,
  ShieldCheck,
  Zap,
  Merge,
  FileText,
  Info,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { PipelineStep } from "../types";

interface PipelineInspectorProps {
  trace?: PipelineStep[];
  isExpandedInitial?: boolean;
}

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({
  trace,
  isExpandedInitial = false,
}) => {
  const [isOpen, setIsOpen] = useState(isExpandedInitial);

  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  if (!trace || trace.length === 0) return null;

  const displayedTrace =
    selectedStepIndex !== null ? [trace[selectedStepIndex]] : trace;

  return (
    <div className="mt-3 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden shadow-xs">
      {/* Header Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>How I answered — Pipeline Execution Inspector ({trace.length} Steps)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
            {isOpen ? "Hide Pipeline" : "Inspect Steps"}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content Drawer */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-indigo-200/80 dark:border-indigo-900/50 bg-white/80 dark:bg-slate-900/80 text-xs">
          {/* Interactive Pipeline Phase Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Interactive Phase:
            </span>
            <button
              onClick={() => setSelectedStepIndex(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedStepIndex === null
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All {trace.length} Steps
            </button>
            {trace.map((step, sIdx) => (
              <button
                key={sIdx}
                onClick={() => setSelectedStepIndex(selectedStepIndex === sIdx ? null : sIdx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  selectedStepIndex === sIdx
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold">
                  {sIdx + 1}
                </span>
                <span className="truncate max-w-[120px]">{step.type.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {displayedTrace.map((step, idx) => {
            const stepActualNumber = trace.indexOf(step) + 1;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5"
              >
                {/* Step Title & Type Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                      {stepActualNumber}
                    </span>
                    {step.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {step.type}
                  </span>
                </div>

              <p className="text-slate-600 dark:text-slate-400 text-xs">{step.description}</p>

              {/* Step Detail Renderers based on type */}

              {/* 1. Rewritten query details */}
              {step.details?.rewritten && (
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/50 space-y-1">
                  <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Rewritten Query:</div>
                  <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    "{step.details.rewritten}"
                  </div>
                </div>
              )}

              {/* 2. Vector search chunks with cosine similarity badges */}
              {Array.isArray(step.details) && step.details[0]?.chunk && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Retrieved Chunks ({step.details.length}):
                  </div>
                  <div className="grid gap-2">
                    {step.details.map((m: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="text-[10px] font-bold text-slate-400">
                            Chunk {cIdx + 1} • Source: {m.chunk?.documentName || "Doc"}
                          </div>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
                            "{m.chunk?.text}"
                          </div>
                        </div>
                        {typeof m.score === "number" && (
                          <span className="shrink-0 px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            {(m.score * 100).toFixed(1)}% match
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Multi-hop Sub-questions details */}
              {step.type === "subquery" && Array.isArray(step.details) && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500">Decomposed Sub-Questions:</div>
                  <div className="space-y-1">
                    {step.details.map((sq: string, sIdx: number) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{sq}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. HyDE Hypothetical text */}
              {step.details?.hypotheticalAnswer && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Hypothetical Answer (Used ONLY to Search, Not Shown to User as Fact)
                  </div>
                  <div className="italic text-[11px] text-slate-700 dark:text-slate-300">
                    "{step.details.hypotheticalAnswer}"
                  </div>
                </div>
              )}

              {/* 5. Graph Triples */}
              {step.details?.graphTriples && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Traversed Knowledge Graph Triples ({step.details.graphTriples.length}):
                  </div>
                  <div className="grid gap-1">
                    {step.details.graphTriples.map((t: any, gIdx: number) => (
                      <div
                        key={gIdx}
                        className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono flex items-center gap-2 text-indigo-600 dark:text-indigo-400"
                      >
                        <span className="font-bold">({t.source})</span>
                        <span className="text-slate-400">&rarr; [{t.relation}] &rarr;</span>
                        <span className="font-bold">({t.target})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. ReAct Agent step trace */}
              {step.type === "agent" && step.details && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300">
                    <span>ReAct Thought & Action (Step {step.details.step})</span>
                    <span className="uppercase px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900">
                      Action: {step.details.action}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300">
                    <strong>Thought:</strong> {step.details.thought}
                  </div>
                  {step.details.actionInput && (
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                      search_document("{step.details.actionInput}")
                    </div>
                  )}
                </div>
              )}

              {/* 7. Fusion / RRF Math trace */}
              {step.type === "fusion" && Array.isArray(step.details) && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500">4 Query Variants:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {step.details.map((varText: string, vIdx: number) => (
                      <div
                        key={vIdx}
                        className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 truncate"
                      >
                        {vIdx + 1}. "{varText}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
