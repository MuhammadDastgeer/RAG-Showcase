import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Zap,
  Layers,
  Database,
  Cpu,
  BarChart2,
  ShieldCheck,
  Sparkles,
  GitMerge,
  Search,
  BookOpen,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  ChevronRight,
  Play,
  Share2,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";

interface LandingPageProps {
  activeSection?: "home" | "about" | "features" | "architectures" | "contact";
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  activeSection = "home",
  theme = "dark",
  onToggleTheme,
}) => {
  const navigate = useNavigate();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    if (activeSection) {
      const el = document.getElementById(activeSection);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeSection]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Floating Glass Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white block leading-none">
                RAG<span className="text-indigo-600 dark:text-indigo-400">Showcase</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">PIPELINE VISUALIZER</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link to="/home" className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${activeSection === "home" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>Home</Link>
            <Link to="/about" className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${activeSection === "about" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>About RAG</Link>
            <Link to="/features" className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${activeSection === "features" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>Features</Link>
            <Link to="/architectures" className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${activeSection === "architectures" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>Architectures</Link>
            <Link to="/contact" className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${activeSection === "contact" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>Contact</Link>
          </nav>

          {/* Actions: Theme Toggle & Get Started */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-semibold shadow-2xs"
                title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline text-amber-300">Day Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline text-slate-700">Night Mode</span>
                  </>
                )}
              </button>
            )}

            <Link
              to="/rag"
              className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all flex items-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl md:hidden text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 pb-2 border-t border-slate-200 dark:border-slate-800 space-y-2 flex flex-col text-sm font-semibold">
            <Link
              to="/home"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${activeSection === "home" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            >
              Home
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${activeSection === "about" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            >
              About RAG
            </Link>
            <Link
              to="/features"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${activeSection === "features" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            >
              Features
            </Link>
            <Link
              to="/architectures"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${activeSection === "architectures" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            >
              Architectures
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${activeSection === "contact" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"}`}
            >
              Contact
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-16 pb-24 px-4 sm:px-8 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Interactive RAG Pipeline & Telemetry Playground</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Visualize, Benchmark & Master <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 dark:from-indigo-400 dark:via-purple-300 dark:to-emerald-400 bg-clip-text text-transparent">
              Retrieval-Augmented Generation
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Step inside production-grade RAG architectures. Inspect real-time vector embeddings, sub-query transformations, reranking stages, and execution latency metrics message by message.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate("/rag")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => scrollToSection("about")}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl font-bold text-sm bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Learn How RAG Works</span>
            </button>
          </div>

          {/* Interactive Hero Showcase Preview */}
          <div className="pt-12 max-w-4xl mx-auto">
            <div className="p-3 rounded-3xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl transition-colors">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">rag-pipeline-tracer.v2</span>
                </div>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3" /> Latency: 420ms
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                    <Search className="w-4 h-4" /> 1. Vector Retrieval
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Cosine similarity matching on 1,536-dim OpenAI embeddings. Top-K chunk retrieval.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <GitMerge className="w-4 h-4" /> 2. Rerank & Transform
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Cross-encoder scoring and query expansion eliminating irrelevant context noise.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <Cpu className="w-4 h-4" /> 3. LLM Synthesis
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Grounded prompt construction with OpenAI gpt-4o-mini generating verified answers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About RAG Section */}
      <section id="about" className="py-20 px-4 sm:px-8 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/60 transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">What is RAG?</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Bridging Private Knowledge & Generative AI
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Retrieval-Augmented Generation (RAG) grounds language models in verified external knowledge bases, preventing hallucination and providing accurate, source-attributed responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Chunking & Indexing</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Documents are split into semantic chunks and converted into dense vector representations using text-embedding-3-small for instant vector similarity lookup.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <GitMerge className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">2. Advanced Retrieval</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Hybrid BM25 keyword matching combined with dense vector search, HyDE (Hypothetical Document Embeddings), and cross-encoder reranking.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">3. Grounded Generation</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                The retrieved context is injected into structured system prompts, guaranteeing high-fidelity answers without relying on raw memory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Everything You Need to Analyze RAG
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Explore step-by-step pipeline execution, vector inspection, and performance metrics built for AI engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <BarChart2 className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Latency & Token Dashboard</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Track execution latency breakdown across retrieval, transformation, and generation alongside prompt & completion token consumption.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <Layers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">10+ RAG Architectures</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                From Naive Vector RAG to Advanced HyDE, Multi-Query Fusion, Parent Document, and Agentic Graph RAG.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <Zap className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">OpenAI gpt-4o-mini Integration</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High-speed server-side completions with strict secret management and optional custom API key support.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <Database className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">IndexedDB Session Persistence</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All document chunks, vector embeddings, and chat session traces stay saved locally in your browser cache.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architectures Overview Showcase */}
      <section id="architectures" className="py-20 px-4 sm:px-8 bg-slate-100/70 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/60 transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Architecture Catalog</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                Explore RAG Pipeline Variations
              </h2>
            </div>
            <button
              onClick={() => navigate("/rag")}
              className="self-start sm:self-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>View All Architectures</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                id: "naive",
                title: "Naive Vector RAG",
                category: "Baseline",
                desc: "Direct embedding similarity lookup with k-NN top chunks passed straight to prompt.",
                color: "text-indigo-600 dark:text-indigo-400",
              },
              {
                id: "hyde",
                title: "HyDE (Hypothetical Doc)",
                category: "Query Transformation",
                desc: "Generates a hypothetical answer first, then uses its embedding to retrieve relevant chunks.",
                color: "text-purple-600 dark:text-purple-400",
              },
              {
                id: "fusion",
                title: "Multi-Query Fusion RAG",
                category: "Advanced Retrieval",
                desc: "Rewrites prompt into 3 variations, runs parallel retrieval, and merges results using Reciprocal Rank Fusion.",
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                id: "parent-doc",
                title: "Parent Document RAG",
                category: "Chunk Strategy",
                desc: "Retrieves small child chunks for precise vector matching, but feeds large parent sections to the LLM.",
                color: "text-amber-600 dark:text-amber-400",
              },
              {
                id: "reranker",
                title: "Reranker Cross-Encoder RAG",
                category: "Precision Retrieval",
                desc: "Fetches top 15 chunks via vector search and scores them with a cross-encoder to select top 3.",
                color: "text-cyan-600 dark:text-cyan-400",
              },
              {
                id: "graph-rag",
                title: "Agentic Graph RAG",
                category: "Knowledge Graph",
                desc: "Extracts entities and relationships into a graph representation for multi-hop structural reasoning.",
                color: "text-pink-600 dark:text-pink-400",
              },
            ].map((arch) => (
              <div
                key={arch.id}
                onClick={() => navigate(`/rag/${arch.id}`)}
                className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${arch.color}`}>
                      {arch.category}
                    </span>
                    <Play className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {arch.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{arch.desc}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Launch Interactive Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Support Section */}
      <section id="contact" className="py-20 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Get in Touch</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Have Questions or Feedback?</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Whether you want to integrate custom vector databases, suggest additional RAG pipeline transformations, or ask technical questions, we'd love to hear from you.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Support Email: ragstudio.support@example.com</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Powered by OpenAI & React Pipeline Engine</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              {contactSubmitted ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Message Received!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Thank you for reaching out. We will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Message</label>
                    <textarea
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 py-10 px-4 sm:px-8 text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">RAGShowcase Visualizer</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/rag" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold">
              RAG Playground
            </Link>
            <Link to="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
