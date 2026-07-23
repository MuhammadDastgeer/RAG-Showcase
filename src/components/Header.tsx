import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Layers,
  Moon,
  Sun,
  ChevronDown,
  Sparkles,
  Home,
  BookOpen,
} from "lucide-react";
import { RAG_ARCHITECTURES, getRagArchById } from "../lib/ragRegistry";
import { AppSettings } from "../types";

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings?: () => void;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onToggleTheme,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPath = location.pathname;
  const currentRagId = currentPath.startsWith("/rag/")
    ? currentPath.replace("/rag/", "")
    : null;
  const currentRagArch = currentRagId ? getRagArchById(currentRagId) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            title="Return to Landing Page"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">
                RAG<span className="text-indigo-600 dark:text-indigo-400">Showcase</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                16 Architectures
              </span>
            </div>
          </Link>
        </div>

        {/* Architecture Route Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {currentRagArch ? currentRagArch.name : "Select Architecture"}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden py-1.5 text-xs max-h-[80vh] overflow-y-auto"
              onClick={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80">
                EXPLORE 16 RAG ARCHITECTURES
              </div>
              <div className="py-1">
                {RAG_ARCHITECTURES.map((arch) => (
                  <button
                    key={arch.id}
                    onClick={() => navigate(arch.route)}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors ${
                      currentRagId === arch.id
                        ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium truncate">{arch.name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{arch.badge}</div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {arch.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            to="/rag"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Home Gallery"
          >
            <Home className="w-5 h-5" />
          </Link>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light / Dark Mode"
          >
            {settings.theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
