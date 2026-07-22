import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Copy, Check, RefreshCw, FileText, Upload, Paperclip } from "lucide-react";
import { ChatMessage, DocumentSession, PipelineStep, RagType } from "../types";
import { RagPipelineProgressTimeline } from "./RagPipelineProgressTimeline";
import { chunkText, embedText } from "../lib/llm";

interface ChatContainerProps {
  ragType?: RagType;
  ragName?: string;
  ragCategory?: string;
  messages: ChatMessage[];
  isGenerating: boolean;
  livePipelineSteps?: PipelineStep[];
  onSendMessage: (content: string) => void;
  documentName?: string;
  suggestedQuestions?: string[];
  onNewDocumentUploaded?: (session: DocumentSession) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  ragType = "naive",
  ragName,
  ragCategory,
  messages,
  isGenerating,
  livePipelineSteps = [],
  onSendMessage,
  documentName,
  suggestedQuestions = [
    "What are the main key takeaways from the document?",
    "What are the specific requirements or guarantees mentioned?",
    "Summarize the core guidelines or findings.",
  ],
  onNewDocumentUploaded,
}) => {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPipelineSteps, setUploadPipelineSteps] = useState<PipelineStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, isUploading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUploadInChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onNewDocumentUploaded) return;

    setIsUploading(true);
    setUploadStatus("Processing document & generating vector embeddings...");
    const steps: PipelineStep[] = [
      {
        title: "Document Parsing & Extraction",
        type: "retrieve",
        description: `Reading file ${files[0].name}...`,
      },
    ];
    setUploadPipelineSteps(steps);

    try {
      const file = files[0];
      const fileName = file.name;
      const fileSize = file.size;

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

          const step2: PipelineStep = {
            title: "Multimodal Embeddings Generation",
            type: "multimodal",
            description: "Generating vector embedding via OpenAI text-embedding-3-small...",
          };
          setUploadPipelineSteps([
            { ...steps[0], description: `Parsed image file (${(fileSize / 1024).toFixed(1)} KB)` },
            step2,
          ]);

          const embedding = await embedText(imageChunk.text);

          const step3: PipelineStep = {
            title: "Vector Store Indexing",
            type: "rerank",
            description: "Indexed image embedding in Vector Database",
          };
          setUploadPipelineSteps((prev) => [
            prev[0],
            step2,
            step3,
          ]);

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
          setUploadPipelineSteps([]);
        };
        reader.readAsDataURL(file);
        return;
      }

      const text = await file.text();
      if (!text.trim()) {
        alert("File appears to be empty.");
        setIsUploading(false);
        setUploadPipelineSteps([]);
        return;
      }

      // Step 2: Chunking
      const rawChunks = chunkText(text, `doc_${Date.now()}`, fileName);
      const step2: PipelineStep = {
        title: "Semantic Text Chunking",
        type: "rewrite",
        description: `Splitting text into ${rawChunks.length} semantic chunks...`,
      };
      setUploadPipelineSteps([
        { ...steps[0], description: `Extracted ${text.length} characters` },
        step2,
      ]);

      // Step 3: Embeddings
      const step3: PipelineStep = {
        title: "Vector Embeddings Generation",
        type: "multimodal",
        description: `Generating embeddings for ${rawChunks.length} chunks via OpenAI text-embedding-3-small...`,
      };
      setUploadPipelineSteps((prev) => [
        { ...prev[0], description: `Extracted ${text.length} characters` },
        { ...step2, description: `Created ${rawChunks.length} chunks` },
        step3,
      ]);

      const chunksWithEmbeddings = await Promise.all(
        rawChunks.map(async (c) => {
          const embedding = await embedText(c.text);
          return { ...c, embedding };
        })
      );

      // Step 4: Vector Storage
      const step4: PipelineStep = {
        title: "Vector DB Storage & Session Binding",
        type: "rerank",
        description: `Successfully indexed ${chunksWithEmbeddings.length} chunks into IndexedDB Vector Store!`,
      };
      setUploadPipelineSteps((prev) => [
        prev[0],
        prev[1],
        { ...step3, description: `Generated ${chunksWithEmbeddings.length} vectors` },
        step4,
      ]);

      const newSession: DocumentSession = {
        id: `session_${Date.now()}`,
        fileName,
        fileSize,
        uploadedAt: Date.now(),
        chunks: chunksWithEmbeddings,
        tag: "Uploaded Document",
      };

      // Finish & Hide Pipeline
      onNewDocumentUploaded(newSession);
      setIsUploading(false);
      setUploadStatus("");
      setUploadPipelineSteps([]);
    } catch (err: any) {
      alert("Error processing file: " + (err?.message || "Unknown error"));
      setIsUploading(false);
      setUploadStatus("");
      setUploadPipelineSteps([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
      {/* Top Chat Header Bar with RAG Name */}
      {ragName && (
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">{ragName}</span>
            {ragCategory && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {ragCategory}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {documentName && (
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="truncate max-w-[180px] font-semibold">{documentName}</span>
              </div>
            )}

            {/* Top Bar Quick File Upload Button */}
            {onNewDocumentUploaded && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5 transition-all"
                title="Upload Document File"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {ragName ? `${ragName} Chat` : "Ready to test this RAG Architecture!"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {documentName
                  ? `Active Document: "${documentName}". Type your question below to execute the RAG pipeline.`
                  : "Upload a document file or click a suggested prompt to test!"}
              </p>
            </div>

            {/* Suggested Question Chips */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Suggested Prompts
              </div>
              <div className="flex flex-col gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(q)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-300 text-xs font-medium text-left transition-all shadow-2xs hover:shadow-sm"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-4xl mx-auto ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                  msg.role === "user"
                    ? "bg-slate-800 dark:bg-slate-700"
                    : "bg-indigo-600 dark:bg-indigo-500"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble Body */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
                  <span className="font-semibold">{msg.role === "user" ? "You" : "RAG AI Assistant"}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border shadow-2xs relative group ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600 dark:text-white"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Copy button */}
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity"
                      title="Copy Answer"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="max-w-4xl mx-auto">
            <RagPipelineProgressTimeline
              ragType={ragType}
              ragName={ragName}
              liveSteps={livePipelineSteps}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {isUploading && (
          <div className="max-w-4xl mx-auto space-y-2">
            <RagPipelineProgressTimeline
              ragType={ragType}
              ragName="Document Ingestion & Vector Indexing"
              liveSteps={uploadPipelineSteps}
              isGenerating={true}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with Upload Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
          {/* File Upload Input inside Chatbox */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUploadInChat}
            accept=".txt,.md,.json,.pdf,image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center shrink-0"
            title="Upload Document File to RAG Engine"
          >
            <Paperclip className="w-4 h-4 text-indigo-500" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            placeholder={documentName ? `Ask anything about "${documentName}"...` : "Type your question or attach a file..."}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
          />

          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-98 shrink-0"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
