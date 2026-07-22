export type RagType =
  | "naive"
  | "advanced"
  | "modular"
  | "multi-hop"
  | "iterative"
  | "hyde"
  | "graph"
  | "hybrid"
  | "branched"
  | "conversational"
  | "agentic"
  | "self-rag"
  | "corrective"
  | "adaptive"
  | "multimodal"
  | "fusion";

export interface RagArchitectureInfo {
  id: RagType;
  route: string;
  name: string;
  category: "Basic" | "Query Transformation" | "Retrieval Enhancement" | "Agentic & Self-Correction" | "Multimodal & Advanced";
  description: string;
  badge: string;
  iconName: string;
  pipelineStepsSummary: string[];
}

export interface Chunk {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding?: number[];
  pageNumber?: number;
  type?: "text" | "image";
  imageDataUrl?: string;
  imageCaption?: string;
}

export interface DocumentSession {
  id: string;
  chatSessionId?: string;
  ragType?: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  chunks: Chunk[];
  tag?: string; // e.g. "Contract", "Policy", "Manual"
  extractedGraph?: GraphData;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  entities: GraphNode[];
  relationships: GraphEdge[];
}

export interface PipelineStep {
  title: string;
  type: "rewrite" | "retrieve" | "rerank" | "subquery" | "hyde" | "graph" | "bm25" | "agent" | "critique" | "grade" | "route" | "fusion" | "multimodal" | "info";
  description: string;
  details?: any; // JSON, array of chunks, thoughts, scores, etc.
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  pipelineTrace?: PipelineStep[];
  attachedImages?: string[]; // data URLs
  isError?: boolean;
}

export interface ModularToggles {
  queryRewriting: boolean;
  reranking: boolean;
  conversationMemory: boolean;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: number;
  lastQuestion?: string;
  documentSessionId?: string;
}

export interface AppSettings {
  provider: "openai";
  customApiKey: string;
  theme: "light" | "dark";
}
