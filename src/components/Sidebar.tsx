import React, { useState, useRef } from "react";
import {
  Plus,
  Upload,
  MessageSquare,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { DocumentSession, ChatSessionItem, RagType } from "../types";
import { chunkText, embedText } from "../lib/llm";
import { RagArchitectureDetailModal } from "./RagArchitectureDetailModal";

interface SidebarProps {
  currentRagType: RagType;
  currentRagName: string;
  chatSessions: ChatSessionItem[];
  activeChatSessionId: string | null;
  onSelectChatSession: (id: string) => void;
  onNewChatSession: () => void;
  onDeleteChatSession: (id: string) => void;
  documentSessions: DocumentSession[];
  onNewDocumentUploaded: (session: DocumentSession) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRagType,
  currentRagName,
  chatSessions,
  activeChatSessionId,
  onSelectChatSession,
  onNewChatSession,
  onDeleteChatSession,
  documentSessions,
  onNewDocumentUploaded,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload parser
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatus("Processing & embedding document...");

    try {
      const file = files[0];
      const fileName = file.name;
      const fileSize = file.size;

      // Check if image file
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          const imageChunk = {
            id: `img_chunk_${Date.now()}`,
            documentId: `doc_${Date.now()}`,
            documentName: fileName,
            text: `Image asset extracted from ${fileName}. Contains visual context.`,
            type: "image" as const,
            imageDataUrl: dataUrl,
            imageCaption: `Uploaded visual document: ${fileName}`,
          };

          const embedding = await embedText(imageChunk.text);
          const newSession: DocumentSession = {
            id: `session_${Date.now()}`,
            fileName,
            fileSize,
            uploadedAt: Date.now(),
            chunks: [{ ...imageChunk, embedding }],
            tag: "Multimodal Asset",
          };

          onNewDocumentUploaded(newSession);
          setIsUploading(false);
          setUploadStatus("");
        };
        reader.readAsDataURL(file);
        return;
      }

      // Text / Markdown / JSON / PDF text reader
      const text = await file.text();
      if (!text.trim()) {
        alert("File appears to be empty.");
        setIsUploading(false);
        return;
      }

      const rawChunks = chunkText(text, `doc_${Date.now()}`, fileName);
      setUploadStatus(`Generating vector embeddings for ${rawChunks.length} chunks...`);

      const chunksWithEmbeddings = await Promise.all(
        rawChunks.map(async (c) => {
          const embedding = await embedText(c.text);
          return { ...c, embedding };
        })
      );

      const newSession: DocumentSession = {
        id: `session_${Date.now()}`,
        fileName,
        fileSize,
        uploadedAt: Date.now(),
        chunks: chunksWithEmbeddings,
        tag: "Uploaded Document",
      };

      onNewDocumentUploaded(newSession);
      setIsUploading(false);
      setUploadStatus("");
    } catch (err: any) {
      alert("Error processing file: " + (err?.message || "Unknown error"));
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  return (
    <aside className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Header: New Chat & Full Width Upload File */}
      <div className="p-4 space-y-2.5 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onNewChatSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Chat Session</span>
        </button>

        {/* Full Width Upload File Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.pdf,image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs transition-all"
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            <span>Upload File</span>
          </button>
        </div>

        {isUploading && (
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 p-2 rounded-lg animate-pulse flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* RAG Architecture Button -> Click to open full details & diagram */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <button
          onClick={() => setIsDetailModalOpen(true)}
          className="w-full text-left p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Active Architecture
            </span>
            <span className="text-[10px] font-normal text-slate-400 group-hover:text-indigo-500 flex items-center gap-0.5 transition-colors">
              Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
            {currentRagName}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>Click for Full Flow Diagram & Theory</span>
          </p>
        </button>
      </div>

      {/* Active Chat Sessions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="px-1 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>Chat Sessions</span>
          <span>{chatSessions.length} Sessions</span>
        </div>

        {chatSessions.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-800/20">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No chat sessions yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Click "+ New Chat Session" to create your first session!
            </p>
          </div>
        ) : (
          chatSessions.map((session) => {
            const isActive = session.id === activeChatSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectChatSession(session.id)}
                className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-500/80 shadow-sm ring-1 ring-indigo-500/30"
                    : "border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {session.title}
                      </div>

                      {/* Display Question asked in this chat session */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {session.lastQuestion ? (
                          <span>"{session.lastQuestion}"</span>
                        ) : (
                          <span className="italic text-slate-400 dark:text-slate-500">No questions asked yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Chat Session Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChatSession(session.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all shrink-0"
                    title="Delete Chat Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RagArchitectureDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        ragType={currentRagType}
      />
    </aside>
  );
};
