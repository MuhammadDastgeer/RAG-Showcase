import { AppSettings, Chunk } from "../types";

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Fallback pseudo-embedding generator using term frequency hashing when API is unavailable
function fallbackEmbed(text: string, dim = 256): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

// Generate embedding for text
export async function embedText(text: string, settings?: AppSettings): Promise<number[]> {
  try {
    const res = await fetch("/api/llm/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        customApiKey: settings?.customApiKey || "",
        provider: "openai",
      }),
    });

    if (!res.ok) {
      console.warn("Embedding API failed, using fallback vector indexer");
      return fallbackEmbed(text);
    }

    const data = await res.json();
    if (data.embedding && Array.isArray(data.embedding)) {
      return data.embedding;
    }
    return fallbackEmbed(text);
  } catch (err) {
    console.warn("Embedding fetch error, fallback activated:", err);
    return fallbackEmbed(text);
  }
}

// Chat completion wrapper
export async function chatComplete(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  settings?: AppSettings,
  extraConfig?: {
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
    images?: { data: string; mimeType: string }[];
    useWebSearch?: boolean;
  }
): Promise<string> {
  try {
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        systemPrompt,
        customApiKey: settings?.customApiKey || "",
        provider: "openai",
        responseMimeType: extraConfig?.responseMimeType,
        responseSchema: extraConfig?.responseSchema,
        temperature: extraConfig?.temperature,
        images: extraConfig?.images,
        useWebSearch: extraConfig?.useWebSearch,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to call LLM server endpoint");
    }
    return data.text || "";
  } catch (err: any) {
    console.error("chatComplete error:", err);
    throw new Error(err?.message || "LLM server error. Please check your network or API Key in Settings.");
  }
}

// Text Chunking utility: ~500 tokens / 1800 characters with ~50 token overlap
export function chunkText(
  fullText: string,
  documentId: string,
  documentName: string,
  chunkCharLimit = 1200,
  overlapChars = 200
): Omit<Chunk, "embedding">[] {
  const paragraphs = fullText.split(/\n\s*\n/);
  const chunks: Omit<Chunk, "embedding">[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (let p of paragraphs) {
    p = p.trim();
    if (!p) continue;

    if ((currentChunk + "\n\n" + p).length <= chunkCharLimit) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
    } else {
      if (currentChunk) {
        chunkIndex++;
        chunks.push({
          id: `${documentId}_chunk_${chunkIndex}`,
          documentId,
          documentName,
          text: currentChunk,
          type: "text",
        });
      }
      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      const overlapText = currentChunk.substring(overlapStart);
      currentChunk = overlapText ? overlapText + "\n\n" + p : p;
    }
  }

  if (currentChunk.trim()) {
    chunkIndex++;
    chunks.push({
      id: `${documentId}_chunk_${chunkIndex}`,
      documentId,
      documentName,
      text: currentChunk,
      type: "text",
    });
  }

  return chunks;
}

// Lightweight BM25 / Keyword search
export function bm25Search(query: string, chunks: Chunk[], topK = 5): { chunk: Chunk; score: number }[] {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK).map((c) => ({ chunk: c, score: 0.5 }));
  }

  const scores = chunks.map((chunk) => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      // term frequency
      const matches = textLower.split(term).length - 1;
      if (matches > 0) {
        score += Math.log(1 + matches) * (1 / Math.log(1 + term.length));
      }
    }
    return { chunk, score };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, topK);
}
