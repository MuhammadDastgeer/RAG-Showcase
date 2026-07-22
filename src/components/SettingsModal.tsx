import React, { useState } from "react";
import { X, Key, ShieldCheck, Database, Check, AlertCircle } from "lucide-react";
import { AppSettings } from "../types";
import { clearAllIDBData } from "../lib/idb";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [apiKey, setApiKey] = useState<string>(settings.customApiKey);
  const [clearedSuccess, setClearedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      provider: "openai",
      customApiKey: apiKey.trim(),
    });
    onClose();
  };

  const handleClearData = async () => {
    if (confirm("Clear all IndexedDB document sessions and chat history?")) {
      await clearAllIDBData();
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              OpenAI API Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure your OpenAI API key or use the environment OPENAI_API_KEY.
            </p>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          {/* Provider Badge */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              LLM Provider
            </label>
            <div className="p-3 rounded-xl border border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 flex items-center justify-between font-medium">
              <div>
                <div className="font-semibold text-sm">OpenAI API</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Using gpt-4o-mini & text-embedding-3-small</div>
              </div>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Custom Key Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Custom OpenAI API Key (Optional if OPENAI_API_KEY is in .env)
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Keys remain private in your browser.
            </p>
          </div>

          {/* Database Reset Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-500" /> IndexedDB Local Cache
                </div>
                <div className="text-[11px] text-slate-500">
                  Reset document chunks, embeddings, and saved chat logs.
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearData}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
              >
                Clear Storage
              </button>
            </div>
            {clearedSuccess && (
              <p className="text-xs text-emerald-600 font-medium mt-1">Storage cleared successfully!</p>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
