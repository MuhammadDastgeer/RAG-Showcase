import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { MessageSquare, BarChart2, PanelLeft, X } from "lucide-react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { ChatContainer } from "./components/ChatContainer";
import { MetricsDashboard } from "./components/MetricsDashboard";
import { HomeGallery } from "./components/HomeGallery";
import { LandingPage } from "./components/LandingPage";
import { AppSettings, ChatMessage, DocumentSession, ModularToggles, RagType, ChatSessionItem, PipelineStep } from "./types";
import { getRagArchById } from "./lib/ragRegistry";
import { createPreloadedSession } from "./lib/sampleDocs";
import { executeRagPipeline } from "./lib/ragExecutors";
import {
  getAllSessionsFromIDB,
  saveSessionToIDB,
  deleteSessionFromIDB,
  getChatMessagesFromIDB,
  saveChatMessageToIDB,
  deleteChatSessionMessagesFromIDB,
} from "./lib/idb";

const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  customApiKey: "",
  theme: "light",
};

// Main Workspace layout for any of the 16 RAG routes
function RagRouteWorkspace({
  settings,
  sessions,
  onNewDocumentUploaded,
  onDeleteDocumentSession,
}: {
  settings: AppSettings;
  sessions: DocumentSession[];
  onNewDocumentUploaded: (s: DocumentSession) => void;
  onDeleteDocumentSession: (id: string) => void;
}) {
  const params = useParams();
  const archId = (params.archId as RagType) || "naive";
  const arch = getRagArchById(archId);

  // Chat Sessions state
  const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem(`rag_chat_sessions_${archId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: `chat_${archId}_1`,
        title: "Chat Session 1",
        createdAt: Date.now(),
        lastQuestion: "",
      },
    ];
  });

  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(() => {
    return chatSessions.length > 0 ? chatSessions[0].id : null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [livePipelineSteps, setLivePipelineSteps] = useState<PipelineStep[]>([]);
  const [modularToggles] = useState<ModularToggles>({
    queryRewriting: true,
    reranking: true,
    conversationMemory: true,
  });

  // Calculate active document session strictly scoped to current chat session and RAG architecture
  const currentChatSession = chatSessions.find((cs) => cs.id === activeChatSessionId);
  const activeDocumentSession =
    sessions.find(
      (s) =>
        (s.id === currentChatSession?.documentSessionId || s.chatSessionId === activeChatSessionId) &&
        s.ragType === archId
    ) || null;

  // Re-sync chat sessions when archId route changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`rag_chat_sessions_${archId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setChatSessions(parsed);
          setActiveChatSessionId(parsed.length > 0 ? parsed[0].id : null);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const defaultSession = [
      {
        id: `chat_${archId}_1`,
        title: "Chat Session 1",
        createdAt: Date.now(),
        lastQuestion: "",
      },
    ];
    setChatSessions(defaultSession);
    setActiveChatSessionId(defaultSession[0].id);
  }, [archId]);

  // Persist chatSessions changes to localStorage
  useEffect(() => {
    localStorage.setItem(`rag_chat_sessions_${archId}`, JSON.stringify(chatSessions));
  }, [chatSessions, archId]);

  // Load chat messages when activeChatSessionId changes
  useEffect(() => {
    if (activeChatSessionId) {
      getChatMessagesFromIDB(activeChatSessionId, archId)
        .then((msgs) => setMessages(msgs))
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [activeChatSessionId, archId]);

  // Handle + New Chat Session
  const handleNewChatSession = () => {
    const newId = `chat_${archId}_${Date.now()}`;
    const newSession: ChatSessionItem = {
      id: newId,
      title: `Chat Session ${chatSessions.length + 1}`,
      createdAt: Date.now(),
      lastQuestion: "",
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatSessionId(newId);
    setMessages([]);
  };

  // Handle Delete Chat Session
  const handleDeleteChatSession = (id: string) => {
    // Delete any document associated with this chat session
    const targetChat = chatSessions.find((cs) => cs.id === id);
    const docsToDelete = sessions.filter(
      (s) => s.chatSessionId === id || (targetChat && targetChat.documentSessionId === s.id)
    );
    docsToDelete.forEach((docToDelete) => {
      deleteSessionFromIDB(docToDelete.id).catch(console.error);
      onDeleteDocumentSession(docToDelete.id);
    });

    // Delete chat messages
    deleteChatSessionMessagesFromIDB(id, archId).catch(console.error);

    const updated = chatSessions.filter((cs) => cs.id !== id);
    setChatSessions(updated);

    if (activeChatSessionId === id) {
      if (updated.length > 0) {
        setActiveChatSessionId(updated[0].id);
      } else {
        setActiveChatSessionId(null);
        setMessages([]);
      }
    }
  };

  // Handle Clear Chat Messages for current session ID
  const handleClearCurrentChat = async () => {
    if (!activeChatSessionId) return;

    setMessages([]);
    try {
      await deleteChatSessionMessagesFromIDB(activeChatSessionId, archId);
    } catch (e) {
      console.error("Failed to clear chat session from IndexedDB:", e);
    }

    setChatSessions((prev) =>
      prev.map((cs) =>
        cs.id === activeChatSessionId ? { ...cs, lastQuestion: "" } : cs
      )
    );
  };

  // Handle message submission
  const handleSendMessage = async (userText: string) => {
    let docToUse = activeDocumentSession;
    if (!docToUse) {
      docToUse = sessions.find((s) => s.ragType === archId) || sessions[0] || null;
    }

    if (!docToUse) {
      // Create default sample reference session for this archId if none exists
      docToUse = {
        id: `sample_doc_${archId}_${Date.now()}`,
        fileName: `${arch.name} Standard Reference.txt`,
        fileSize: 2048,
        uploadedAt: Date.now(),
        ragType: archId,
        tag: "Default Reference Base",
        chunks: [
          {
            id: `chunk_${archId}_1`,
            documentId: `sample_doc_${archId}`,
            documentName: `${arch.name} Standard Reference.txt`,
            text: `This is the default reference knowledge base for ${arch.name}. RAG architecture enables high-precision retrieval over indexed vector chunks.`,
            embedding: new Array(768).fill(0.01),
          },
        ],
      };
      onNewDocumentUploaded(docToUse);
    }

    let targetSessionId = activeChatSessionId;
    if (!targetSessionId) {
      const newId = `chat_${archId}_${Date.now()}`;
      const newSession: ChatSessionItem = {
        id: newId,
        title: `Chat Session 1`,
        createdAt: Date.now(),
        lastQuestion: userText,
        documentSessionId: docToUse.id,
      };
      setChatSessions([newSession]);
      setActiveChatSessionId(newId);
      targetSessionId = newId;
    } else {
      setChatSessions((prev) =>
        prev.map((cs) =>
          cs.id === targetSessionId
            ? { ...cs, lastQuestion: userText, documentSessionId: cs.documentSessionId || docToUse.id }
            : cs
        )
      );
    }

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatMessageToIDB(targetSessionId, archId, userMessage);

    setIsGenerating(true);
    setLivePipelineSteps([]);

    try {
      const result = await executeRagPipeline(
        archId,
        userText,
        docToUse,
        sessions.filter((s) => s.chatSessionId === targetSessionId || s.id === docToUse.id),
        settings,
        messages,
        modularToggles,
        (step) => {
          setLivePipelineSteps((prev) => [...prev, step]);
        }
      );

      const assistantMessage: ChatMessage = {
        id: `msg_assistant_${Date.now()}`,
        role: "assistant",
        content: result.answer,
        timestamp: Date.now(),
        pipelineTrace: result.pipelineTrace,
        metrics: result.metrics,
      };

      setMessages([...updatedMessages, assistantMessage]);
      saveChatMessageToIDB(targetSessionId, archId, assistantMessage);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_error_${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error executing ${arch.name}: ${err?.message || "Unknown pipeline execution failure."}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages([...updatedMessages, errorMessage]);
      saveChatMessageToIDB(targetSessionId, archId, errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const [workspaceViewMode, setWorkspaceViewMode] = useState<"chat" | "dashboard">("chat");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Handle document upload and post confirmation message into active chat
  const handleDocumentUploaded = (newSession: DocumentSession) => {
    setIsMobileSidebarOpen(false);
    let targetSessionId = activeChatSessionId;
    if (!targetSessionId) {
      const newId = `chat_${archId}_${Date.now()}`;
      const newChat: ChatSessionItem = {
        id: newId,
        title: "Chat Session 1",
        createdAt: Date.now(),
        lastQuestion: `Attached ${newSession.fileName}`,
        documentSessionId: newSession.id,
      };
      setChatSessions([newChat]);
      setActiveChatSessionId(newId);
      targetSessionId = newId;
    } else {
      setChatSessions((prev) =>
        prev.map((cs) =>
          cs.id === targetSessionId
            ? { ...cs, documentSessionId: newSession.id, lastQuestion: `Attached ${newSession.fileName}` }
            : cs
        )
      );
    }

    const sessionToSave: DocumentSession = {
      ...newSession,
      chatSessionId: targetSessionId,
      ragType: archId,
    };

    onNewDocumentUploaded(sessionToSave);

    const docMessage: ChatMessage = {
      id: `msg_doc_${Date.now()}`,
      role: "assistant",
      content: `📄 **Document Attached & Vector Indexed:** "${newSession.fileName}"\n\n- Chunks Indexed: **${newSession.chunks.length}**\n- File Size: **${(newSession.fileSize / 1024).toFixed(1)} KB**\n\nYou can now ask any questions about this document in this chat session!`,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, docMessage]);
    saveChatMessageToIDB(targetSessionId, archId, docMessage);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex md:w-80 shrink-0 h-full border-r border-slate-200 dark:border-slate-800">
        <Sidebar
          currentRagType={archId}
          currentRagName={arch.name}
          chatSessions={chatSessions}
          activeChatSessionId={activeChatSessionId}
          onSelectChatSession={(id) => setActiveChatSessionId(id)}
          onNewChatSession={handleNewChatSession}
          onDeleteChatSession={handleDeleteChatSession}
          documentSessions={activeDocumentSession ? [activeDocumentSession] : []}
          onNewDocumentUploaded={handleDocumentUploaded}
        />
      </div>

      {/* Mobile/Tablet Drawer Backdrop & Slide-over Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Sessions & Documents</span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar
                currentRagType={archId}
                currentRagName={arch.name}
                chatSessions={chatSessions}
                activeChatSessionId={activeChatSessionId}
                onSelectChatSession={(id) => {
                  setActiveChatSessionId(id);
                  setIsMobileSidebarOpen(false);
                }}
                onNewChatSession={() => {
                  handleNewChatSession();
                  setIsMobileSidebarOpen(false);
                }}
                onDeleteChatSession={handleDeleteChatSession}
                documentSessions={activeDocumentSession ? [activeDocumentSession] : []}
                onNewDocumentUploaded={handleDocumentUploaded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Center UI */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden p-2 sm:p-4 gap-2 sm:gap-3">
        {/* Top Workspace Navigation Bar */}
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Sidebar Trigger Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
              title="Open Sidebar Menu"
            >
              <PanelLeft className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Sessions</span>
            </button>

            <button
              onClick={() => setWorkspaceViewMode("chat")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                workspaceViewMode === "chat"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setWorkspaceViewMode("dashboard")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                workspaceViewMode === "dashboard"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Metrics</span>
              <span className="sm:hidden">Stats</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-300/40 dark:border-indigo-700/40">
                {messages.filter((m) => m.role === "assistant").length}
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="font-bold text-slate-900 dark:text-white truncate">{arch.name}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="truncate">{arch.category}</span>
          </div>
        </div>

        {/* View Mode Switcher Container */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          {workspaceViewMode === "chat" ? (
            <ChatContainer
              ragType={archId}
              ragName={arch.name}
              ragCategory={arch.category}
              messages={messages}
              isGenerating={isGenerating}
              livePipelineSteps={livePipelineSteps}
              onSendMessage={handleSendMessage}
              documentName={activeDocumentSession?.fileName}
              onNewDocumentUploaded={handleDocumentUploaded}
              onClearChat={handleClearCurrentChat}
            />
          ) : (
            <MetricsDashboard
              messages={messages}
              ragType={archId}
              ragName={arch.name}
              onSendSampleQuery={(queryText) => {
                setWorkspaceViewMode("chat");
                handleSendMessage(queryText);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("rag_showcase_settings");
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessions, setSessions] = useState<DocumentSession[]>([]);

  // Apply dark mode class to root html element
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("rag_showcase_settings", JSON.stringify(settings));
  }, [settings]);

  // Load IndexedDB document sessions on startup (empty by default)
  useEffect(() => {
    getAllSessionsFromIDB().then((loaded) => {
      setSessions(loaded || []);
    });
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  };

  const handleNewDocumentUploaded = (newSession: DocumentSession) => {
    saveSessionToIDB(newSession);
    setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
  };

  const handleDeleteDocumentSession = (sessionId: string) => {
    deleteSessionFromIDB(sessionId).catch(console.error);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                activeSection="home"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/home"
            element={
              <LandingPage
                activeSection="home"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/about"
            element={
              <LandingPage
                activeSection="about"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/features"
            element={
              <LandingPage
                activeSection="features"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/architectures"
            element={
              <LandingPage
                activeSection="architectures"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/contact"
            element={
              <LandingPage
                activeSection="contact"
                theme={settings.theme}
                onToggleTheme={handleToggleTheme}
              />
            }
          />
          <Route
            path="/rag"
            element={
              <>
                <Header
                  settings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onToggleTheme={handleToggleTheme}
                />
                <HomeGallery />
              </>
            }
          />
          <Route
            path="/rag/:archId"
            element={
              <>
                <Header
                  settings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onToggleTheme={handleToggleTheme}
                />
                <RagRouteWorkspace
                  settings={settings}
                  sessions={sessions}
                  onNewDocumentUploaded={handleNewDocumentUploaded}
                  onDeleteDocumentSession={handleDeleteDocumentSession}
                />
              </>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
        />
      </div>
    </BrowserRouter>
  );
}
