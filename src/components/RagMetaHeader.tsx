import React from "react";
import { Sparkles, Sliders, ArrowRight, Layers, HelpCircle } from "lucide-react";
import { RagArchitectureInfo, ModularToggles } from "../types";

interface RagMetaHeaderProps {
  arch: RagArchitectureInfo;
  modularToggles?: ModularToggles;
  onToggleModular?: (key: keyof ModularToggles) => void;
}

export const RagMetaHeader: React.FC<RagMetaHeaderProps> = ({
  arch,
  modularToggles,
  onToggleModular,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
      {/* Title & Category Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {arch.category}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {arch.badge}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {arch.name}
          </h1>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
        {arch.description}
      </p>

      {/* Modular RAG Toggles */}
      {arch.id === "modular" && modularToggles && onToggleModular && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
            <Sliders className="w-4 h-4 text-indigo-500" /> Modular Architecture Pipeline Toggles
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onToggleModular("queryRewriting")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                modularToggles.queryRewriting
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Query Rewriting Module</span>
              <span className="text-[10px] opacity-80">{modularToggles.queryRewriting ? "[ON]" : "[OFF]"}</span>
            </button>

            <button
              onClick={() => onToggleModular("reranking")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                modularToggles.reranking
                  ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Reranking Module</span>
              <span className="text-[10px] opacity-80">{modularToggles.reranking ? "[ON]" : "[OFF]"}</span>
            </button>

            <button
              onClick={() => onToggleModular("conversationMemory")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                modularToggles.conversationMemory
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>Conversation Memory Module</span>
              <span className="text-[10px] opacity-80">{modularToggles.conversationMemory ? "[ON]" : "[OFF]"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Steps Flow Pills */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Execution Pipeline Flow
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {arch.pipelineStepsSummary.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
                {step}
              </div>
              {idx < arch.pipelineStepsSummary.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
