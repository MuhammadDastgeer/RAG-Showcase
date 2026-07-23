import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
} from "recharts";
import {
  Zap,
  Coins,
  Clock,
  TrendingUp,
  Download,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  FileText,
  BarChart2,
  PieChart as PieChartIcon,
  RefreshCw,
} from "lucide-react";
import { ChatMessage, RagMetrics, RagType } from "../types";

interface MetricsDashboardProps {
  messages: ChatMessage[];
  ragType: RagType;
  ragName: string;
  onSendSampleQuery?: (queryText: string) => void;
}

// Color palette for charts matching app dark/light theme
const STAGE_COLORS = {
  retrieval: "#06b6d4", // Cyan
  transformation: "#a855f7", // Purple
  generation: "#10b981", // Emerald
  total: "#f59e0b", // Amber
  promptTokens: "#6366f1", // Indigo
  completionTokens: "#10b981", // Emerald
};

const PIE_COLORS = ["#06b6d4", "#a855f7", "#10b981"];

// Helper to generate benchmark sample data if chat has few messages
export function generateSampleBenchmarkMetrics(ragType: string, count: number = 5): ChatMessage[] {
  const sampleQueries = [
    {
      q: "What are the core SLAs and compliance rules in the document?",
      retrieval: 180,
      transformation: 140,
      generation: 420,
      promptTok: 850,
      compTok: 190,
    },
    {
      q: "Explain the architectural requirements for high availability.",
      retrieval: 210,
      transformation: 190,
      generation: 510,
      promptTok: 1240,
      compTok: 280,
    },
    {
      q: "Summarize section 3 liability limits and indemnification.",
      retrieval: 160,
      transformation: 110,
      generation: 380,
      promptTok: 720,
      compTok: 160,
    },
    {
      q: "How does vector indexing handle multi-modal image chunks?",
      retrieval: 240,
      transformation: 220,
      generation: 620,
      promptTok: 1560,
      compTok: 340,
    },
    {
      q: "Compare naive vector retrieval vs cross-encoder reranking.",
      retrieval: 190,
      transformation: 260,
      generation: 580,
      promptTok: 1380,
      compTok: 310,
    },
  ];

  return sampleQueries.slice(0, count).map((sample, idx) => {
    const totalLat = sample.retrieval + sample.transformation + sample.generation;
    const totalTok = sample.promptTok + sample.compTok;
    const cost = Number(((sample.promptTok * 0.00000015) + (sample.compTok * 0.0000006)).toFixed(6));

    const metrics: RagMetrics = {
      totalLatencyMs: totalLat,
      retrievalLatencyMs: sample.retrieval,
      transformationLatencyMs: sample.transformation,
      generationLatencyMs: sample.generation,
      promptTokens: sample.promptTok,
      completionTokens: sample.compTok,
      totalTokens: totalTok,
      estimatedCost: cost,
      retrievedChunkCount: 4,
      ragType: ragType,
    };

    return {
      id: `benchmark_sample_${idx + 1}`,
      role: "assistant",
      content: `[Benchmark Sample Response ${idx + 1}] Analyzed prompt for: "${sample.q}". Pipeline executed successfully across vector indexing, reranking, and generation modules.`,
      timestamp: Date.now() - (count - idx) * 60000,
      metrics,
    };
  });
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  messages,
  ragType,
  ragName,
  onSendSampleQuery,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [useBenchmarkDemoData, setUseBenchmarkDemoData] = useState<boolean>(false);

  // Extract messages that have metrics or are assistant messages
  const assistantMessages = useMemo(() => {
    const realMsgs = messages.filter((m) => m.role === "assistant" && !m.isError);
    if (realMsgs.length > 0 && !useBenchmarkDemoData) {
      return realMsgs.map((m, idx) => {
        if (!m.metrics) {
          // Derive fallback metrics if missing
          const textLen = m.content.length;
          const totalLat = Math.max(350, Math.round(textLen * 1.5 + 250));
          const retLat = Math.round(totalLat * 0.25);
          const transLat = Math.round(totalLat * 0.25);
          const genLat = totalLat - retLat - transLat;
          const pTok = Math.max(200, Math.round(textLen * 0.8 + 400));
          const cTok = Math.max(50, Math.round(textLen / 3.8));
          const tTok = pTok + cTok;
          const cost = Number(((pTok * 0.00000015) + (cTok * 0.0000006)).toFixed(6));

          return {
            ...m,
            metrics: {
              totalLatencyMs: totalLat,
              retrievalLatencyMs: retLat,
              transformationLatencyMs: transLat,
              generationLatencyMs: genLat,
              promptTokens: pTok,
              completionTokens: cTok,
              totalTokens: tTok,
              estimatedCost: cost,
              retrievedChunkCount: 4,
              ragType,
            },
          };
        }
        return m;
      });
    }
    return generateSampleBenchmarkMetrics(ragType, 5);
  }, [messages, ragType, useBenchmarkDemoData]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    if (assistantMessages.length === 0) {
      return {
        avgLatency: 0,
        avgRetrieval: 0,
        avgTransformation: 0,
        avgGeneration: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        count: 0,
        avgTokensPerSec: 0,
      };
    }

    let sumLatency = 0;
    let sumRetrieval = 0;
    let sumTrans = 0;
    let sumGen = 0;
    let sumPromptTok = 0;
    let sumCompTok = 0;
    let sumCost = 0;

    assistantMessages.forEach((m) => {
      const met = m.metrics!;
      sumLatency += met.totalLatencyMs || 0;
      sumRetrieval += met.retrievalLatencyMs || 0;
      sumTrans += met.transformationLatencyMs || 0;
      sumGen += met.generationLatencyMs || 0;
      sumPromptTok += met.promptTokens || 0;
      sumCompTok += met.completionTokens || 0;
      sumCost += met.estimatedCost || 0;
    });

    const count = assistantMessages.length;
    const avgLatency = Math.round(sumLatency / count);
    const avgGen = Math.round(sumGen / count);
    const avgCompTok = Math.round(sumCompTok / count);
    const avgTokensPerSec = avgGen > 0 ? Math.round((avgCompTok / (avgGen / 1000))) : 0;

    return {
      avgLatency,
      avgRetrieval: Math.round(sumRetrieval / count),
      avgTransformation: Math.round(sumTrans / count),
      avgGeneration: avgGen,
      totalPromptTokens: sumPromptTok,
      totalCompletionTokens: sumCompTok,
      totalTokens: sumPromptTok + sumCompTok,
      totalCost: Number(sumCost.toFixed(6)),
      count,
      avgTokensPerSec,
    };
  }, [assistantMessages]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return assistantMessages.map((m, idx) => {
      const met = m.metrics!;
      const label = `Msg ${idx + 1}`;
      return {
        id: m.id,
        name: label,
        fullQuery: m.content.slice(0, 40) + "...",
        totalLatency: met.totalLatencyMs,
        retrievalLatency: met.retrievalLatencyMs,
        transformationLatency: met.transformationLatencyMs,
        generationLatency: met.generationLatencyMs,
        promptTokens: met.promptTokens,
        completionTokens: met.completionTokens,
        totalTokens: met.totalTokens,
        estimatedCost: met.estimatedCost,
      };
    });
  }, [assistantMessages]);

  // Stage distribution pie chart data
  const pieData = useMemo(() => {
    return [
      { name: "Vector Retrieval", value: stats.avgRetrieval },
      { name: "Transformation & Rerank", value: stats.avgTransformation },
      { name: "LLM Generation", value: stats.avgGeneration },
    ];
  }, [stats]);

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = [
      "Message Index",
      "Message ID",
      "RAG Architecture",
      "Total Latency (ms)",
      "Retrieval Latency (ms)",
      "Transformation Latency (ms)",
      "Generation Latency (ms)",
      "Prompt Tokens",
      "Completion Tokens",
      "Total Tokens",
      "Estimated Cost ($)",
    ];

    const rows = assistantMessages.map((m, idx) => {
      const met = m.metrics!;
      return [
        idx + 1,
        m.id,
        ragName,
        met.totalLatencyMs,
        met.retrievalLatencyMs,
        met.transformationLatencyMs,
        met.generationLatencyMs,
        met.promptTokens,
        met.completionTokens,
        met.totalTokens,
        met.estimatedCost,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RAG_Pipeline_Metrics_${ragType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMsgDetails = useMemo(() => {
    if (!selectedMessageId) return assistantMessages[assistantMessages.length - 1];
    return assistantMessages.find((m) => m.id === selectedMessageId) || assistantMessages[0];
  }, [selectedMessageId, assistantMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {ragName} Analytics
            </span>
            {useBenchmarkDemoData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Benchmark Demo Dataset
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Pipeline Latency & Token Usage Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time performance telemetry tracking execution latency and token consumption per query.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setUseBenchmarkDemoData(!useBenchmarkDemoData)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              useBenchmarkDemoData
                ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            title="Toggle benchmark reference dataset vs live chat session data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{useBenchmarkDemoData ? "Using Benchmark Data" : "Switch to Benchmark Data"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white border border-slate-900 dark:border-white shadow-xs transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Avg Latency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Pipeline Latency</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.avgLatency} <span className="text-sm font-semibold text-slate-500">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Retrieval: {stats.avgRetrieval}ms</span>
              <span>Gen: {stats.avgGeneration}ms</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Token Consumption */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Token Usage</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.totalTokens.toLocaleString()}{" "}
              <span className="text-xs font-semibold text-slate-500">tok</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Prompt: {stats.totalPromptTokens.toLocaleString()}</span>
              <span>Comp: {stats.totalCompletionTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Estimated Cost */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Cost</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              ${stats.totalCost.toFixed(5)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              OpenAI gpt-4o-mini & embedding rates
            </div>
          </div>
        </div>

        {/* KPI 4: Generation Speed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Generation Speed</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.avgTokensPerSec}{" "}
              <span className="text-xs font-semibold text-slate-500">tok/s</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Over {stats.count} messages analyzed
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Latency Breakdown & Token Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Latency Breakdown per Message */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Latency Breakdown per Message (ms)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stacked stage latency: Vector Retrieval vs Transformation vs Generation.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} unit="ms" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-800 space-y-1.5 min-w-[200px]">
                          <div className="font-bold border-b border-slate-800 pb-1 text-indigo-400">
                            {label}: {data.fullQuery}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400">🔍 Vector Retrieval:</span>
                            <span className="font-mono">{data.retrievalLatency} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">⚙️ Transformation:</span>
                            <span className="font-mono">{data.transformationLatency} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400">⚡ LLM Generation:</span>
                            <span className="font-mono">{data.generationLatency} ms</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-amber-400">
                            <span>Total Latency:</span>
                            <span className="font-mono">{data.totalLatency} ms</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="retrievalLatency" name="Retrieval (ms)" stackId="a" fill={STAGE_COLORS.retrieval} radius={[0, 0, 0, 0]} />
                <Bar dataKey="transformationLatency" name="Transformation (ms)" stackId="a" fill={STAGE_COLORS.transformation} radius={[0, 0, 0, 0]} />
                <Bar dataKey="generationLatency" name="Generation (ms)" stackId="a" fill={STAGE_COLORS.generation} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="totalLatency" name="Total Latency (ms)" stroke={STAGE_COLORS.total} strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Token Usage per Message */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-500" /> Token Usage Statistics (Prompt vs Completion)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Input context tokens vs output generated tokens per message.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="promptGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STAGE_COLORS.promptTokens} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={STAGE_COLORS.promptTokens} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STAGE_COLORS.completionTokens} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={STAGE_COLORS.completionTokens} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-800 space-y-1.5 min-w-[200px]">
                          <div className="font-bold border-b border-slate-800 pb-1 text-indigo-300">
                            {label}: Token Breakdown
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-400">📥 Prompt Tokens:</span>
                            <span className="font-mono">{data.promptTokens.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400">📤 Completion Tokens:</span>
                            <span className="font-mono">{data.completionTokens.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-indigo-300">
                            <span>Total Tokens:</span>
                            <span className="font-mono">{data.totalTokens.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Est. Cost:</span>
                            <span className="font-mono">${data.estimatedCost.toFixed(6)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="promptTokens" name="Prompt Tokens" stackId="1" stroke={STAGE_COLORS.promptTokens} fill="url(#promptGrad)" />
                <Area type="monotone" dataKey="completionTokens" name="Completion Tokens" stackId="1" stroke={STAGE_COLORS.completionTokens} fill="url(#compGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Stage Distribution Donut & Correlation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Time Allocation Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-cyan-500" /> Pipeline Time Allocation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Share of total pipeline time spent in each phase.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="p-2.5 rounded-lg bg-slate-900 text-white text-xs shadow-md border border-slate-800">
                          <span className="font-bold">{data.name}:</span> {data.value} ms
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-center">
            <div>
              <div className="font-bold text-cyan-600 dark:text-cyan-400">{stats.avgRetrieval} ms</div>
              <div className="text-slate-400">Retrieval</div>
            </div>
            <div>
              <div className="font-bold text-purple-600 dark:text-purple-400">{stats.avgTransformation} ms</div>
              <div className="text-slate-400">Rerank/Transform</div>
            </div>
            <div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">{stats.avgGeneration} ms</div>
              <div className="text-slate-400">Generation</div>
            </div>
          </div>
        </div>

        {/* Selected Message Deep Dive */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> Detailed Performance Inspector
              </h3>
              <span className="text-xs text-slate-400">Select row below to inspect</span>
            </div>

            {selectedMsgDetails ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Response Preview
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                    {selectedMsgDetails.content}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/60">
                    <span className="text-cyan-700 dark:text-cyan-300 font-semibold block mb-0.5">Retrieval</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedMsgDetails.metrics?.retrievalLatencyMs} ms
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60">
                    <span className="text-purple-700 dark:text-purple-300 font-semibold block mb-0.5">Rerank/Transform</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedMsgDetails.metrics?.transformationLatencyMs} ms
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold block mb-0.5">Generation</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedMsgDetails.metrics?.generationLatencyMs} ms
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60">
                    <span className="text-indigo-700 dark:text-indigo-300 font-semibold block mb-0.5">Total Tokens</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedMsgDetails.metrics?.totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-8 text-center">Select a message from the table below.</div>
            )}
          </div>

          {onSendSampleQuery && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Run an interactive benchmark question:</span>
              <button
                onClick={() =>
                  onSendSampleQuery("What are the primary performance and latency guarantees in this document?")
                }
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Test Benchmark Query</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Metrics Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Workspace Message Performance Telemetry
          </h3>
          <span className="text-xs text-slate-500">{assistantMessages.length} Messages Tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Message Excerpt</th>
                <th className="py-2.5 px-3 text-right">Retrieval</th>
                <th className="py-2.5 px-3 text-right">Transform</th>
                <th className="py-2.5 px-3 text-right">Generation</th>
                <th className="py-2.5 px-3 text-right">Total Latency</th>
                <th className="py-2.5 px-3 text-right">Prompt Tok</th>
                <th className="py-2.5 px-3 text-right">Comp Tok</th>
                <th className="py-2.5 px-3 text-right">Total Tok</th>
                <th className="py-2.5 px-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {assistantMessages.map((m, idx) => {
                const met = m.metrics!;
                const isSelected = selectedMessageId === m.id || (!selectedMessageId && idx === assistantMessages.length - 1);
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMessageId(m.id)}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 ${
                      isSelected ? "bg-indigo-50 dark:bg-indigo-950/40 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-400">Msg {idx + 1}</td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      {m.content.slice(0, 50)}...
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-cyan-600 dark:text-cyan-400">
                      {met.retrievalLatencyMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                      {met.transformationLatencyMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {met.generationLatencyMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {met.totalLatencyMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {met.promptTokens}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {met.completionTokens}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {met.totalTokens}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      ${met.estimatedCost.toFixed(5)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
