import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Search,
  Filter,
  Brain,
  Zap,
  Info,
} from "lucide-react";
import { PipelineStep, RagType } from "../types";
import { getRagArchById } from "../lib/ragRegistry";

interface RagPipelineProgressTimelineProps {
  ragType: RagType;
  ragName?: string;
  liveSteps: PipelineStep[];
  isGenerating: boolean;
}

export const RagPipelineProgressTimeline: React.FC<RagPipelineProgressTimelineProps> = ({
  ragType,
  ragName,
  liveSteps,
  isGenerating,
}) => {
  const arch = getRagArchById(ragType);
  const summarySteps = arch.pipelineStepsSummary || [
    "Query Processing",
    "Vector Search",
    "Context Reranking",
    "LLM Answer Synthesis",
  ];

  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

  const totalSteps = Math.max(summarySteps.length, liveSteps.length);
  const currentActiveIndex = liveSteps.length;
  const progressPercent = Math.min(
    100,
    Math.round(((currentActiveIndex + (isGenerating ? 0.5 : 1)) / (totalSteps + 1)) * 100)
  );

  const getStepIcon = (index: number) => {
    if (index < liveSteps.length) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    if (index === liveSteps.length && isGenerating) {
      return <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const getStepTypeIcon = (type?: string) => {
    switch (type) {
      case "rewrite":
        return <Brain className="w-3.5 h-3.5 text-indigo-500" />;
      case "retrieve":
        return <Search className="w-3.5 h-3.5 text-blue-500" />;
      case "rerank":
        return <Filter className="w-3.5 h-3.5 text-purple-500" />;
      case "synthesize":
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="my-3 border border-indigo-200 dark:border-indigo-900/80 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-4 space-y-4 shadow-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                RAG Pipeline Execution Progress
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {ragName || arch.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isGenerating
                ? `Phase ${currentActiveIndex + 1} of ${totalSteps} Executing...`
                : `All ${liveSteps.length} Pipeline Phases Completed`}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Pipeline Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finished</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Line Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>Pipeline Flow Stepper</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Interactive Step-by-Step Timeline Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {summarySteps.map((stepTitle, idx) => {
          const isCompleted = idx < liveSteps.length;
          const isCurrent = idx === liveSteps.length && isGenerating;
          const isPending = idx > liveSteps.length || (idx === liveSteps.length && !isGenerating);

          const liveData = liveSteps[idx];
          const isExpanded = expandedStepIndex === idx;

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all p-3 space-y-2 ${
                isCompleted
                  ? "bg-white dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/60 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer"
                  : isCurrent
                  ? "bg-indigo-50/80 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-md animate-pulse"
                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70"
              }`}
              onClick={() => {
                if (isCompleted) {
                  setExpandedStepIndex(isExpanded ? null : idx);
                }
              }}
            >
              {/* Step Top Bar */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  {getStepIcon(idx)}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Step {idx + 1}
                  </span>
                </span>

                {isCompleted && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Done
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 animate-pulse">
                    Executing...
                  </span>
                )}
                {isPending && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                    Pending
                  </span>
                )}
              </div>

              {/* Step Title */}
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                {liveData?.title || stepTitle}
              </div>

              {/* Step Description / Live Preview */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                {liveData?.description ||
                  (isCurrent
                    ? "Processing query with dense embeddings & neural filters..."
                    : "Waiting for preceding pipeline phase...")}
              </p>

              {/* Interactive Expand Details Button for Completed Steps */}
              {isCompleted && liveData && (
                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <span className="flex items-center gap-1">
                    {getStepTypeIcon(liveData.type)}
                    <span>Inspect Step Output</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              )}

              {/* Expanded Step Data Payload Drawer */}
              {isExpanded && liveData && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[10px] font-mono space-y-1.5 overflow-x-auto border border-slate-800 animate-in fade-in duration-150">
                  <div className="text-indigo-400 font-sans font-bold border-b border-slate-800 pb-1">
                    {liveData.title}
                  </div>
                  {liveData.details?.rewritten && (
                    <div>
                      <span className="text-slate-400">Rewritten Query:</span> "{liveData.details.rewritten}"
                    </div>
                  )}
                  {Array.isArray(liveData.details) && (
                    <div>
                      <span className="text-slate-400">Retrieved Items:</span> {liveData.details.length} chunks matched
                    </div>
                  )}
                  <p className="text-slate-300 font-sans leading-snug">{liveData.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
