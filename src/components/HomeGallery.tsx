import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  Sliders,
  GitFork,
  RotateCw,
  BrainCircuit,
  Network,
  FolderGit2,
  MessageSquare,
  Bot,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Image as ImageIcon,
  Merge,
  Search,
  CheckCircle2,
} from "lucide-react";
import { RAG_ARCHITECTURES } from "../lib/ragRegistry";

export const HomeGallery: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Basic",
    "Query Transformation",
    "Retrieval Enhancement",
    "Agentic & Self-Correction",
    "Multimodal & Advanced",
  ];

  const filtered = selectedCategory === "All"
    ? RAG_ARCHITECTURES
    : RAG_ARCHITECTURES.filter((a) => a.category === selectedCategory);

  const getIcon = (id: string) => {
    switch (id) {
      case "naive": return <FileText className="w-5 h-5 text-blue-500" />;
      case "advanced": return <Sparkles className="w-5 h-5 text-indigo-500" />;
      case "modular": return <Sliders className="w-5 h-5 text-purple-500" />;
      case "multi-hop": return <GitFork className="w-5 h-5 text-amber-500" />;
      case "iterative": return <RotateCw className="w-5 h-5 text-emerald-500" />;
      case "hyde": return <BrainCircuit className="w-5 h-5 text-cyan-500" />;
      case "graph": return <Network className="w-5 h-5 text-rose-500" />;
      case "hybrid": return <Layers className="w-5 h-5 text-teal-500" />;
      case "branched": return <FolderGit2 className="w-5 h-5 text-orange-500" />;
      case "conversational": return <MessageSquare className="w-5 h-5 text-sky-500" />;
      case "agentic": return <Bot className="w-5 h-5 text-violet-500" />;
      case "self-rag": return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case "corrective": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "adaptive": return <Zap className="w-5 h-5 text-yellow-500" />;
      case "multimodal": return <ImageIcon className="w-5 h-5 text-pink-500" />;
      case "fusion": return <Merge className="w-5 h-5 text-indigo-600" />;
      default: return <Sparkles className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>16 Production RAG Architectures In One App</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Explore & Compare Every <span className="text-indigo-600 dark:text-indigo-400">RAG Pattern</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Test Naive, HyDE, GraphRAG, Multi-hop, Self-RAG, CRAG, RAG-Fusion, and more. Each route provides step-by-step pipeline execution inspection ("How I answered") to prove how retrieval and synthesis function under the hood.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Architectures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((arch) => (
            <div
              key={arch.id}
              onClick={() => navigate(arch.route)}
              className="group relative p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Top Badge Row */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getIcon(arch.id)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                    {arch.badge}
                  </span>
                </div>

                {/* Name & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {arch.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {arch.description}
                  </p>
                </div>

                {/* Steps summary */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pipeline Steps
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
                    {arch.pipelineStepsSummary[0]}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Launch Architecture Demo</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
