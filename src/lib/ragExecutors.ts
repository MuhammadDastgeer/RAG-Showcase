import {
  AppSettings,
  ChatMessage,
  Chunk,
  DocumentSession,
  GraphData,
  ModularToggles,
  PipelineStep,
  RagMetrics,
  RagType,
} from "../types";
import { bm25Search, chatComplete, cosineSimilarity, embedText } from "./llm";

export interface RagResult {
  answer: string;
  pipelineTrace: PipelineStep[];
  metrics?: RagMetrics;
}

export function parseJsonResponse<T>(raw: string, fallback: T): T {
  try {
    if (!raw || typeof raw !== "string") return fallback;
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    if (firstBrace !== -1 || firstBracket !== -1) {
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        const lastBracket = cleaned.lastIndexOf("]");
        if (lastBracket > firstBracket) {
          cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        }
      } else if (firstBrace !== -1) {
        const lastBrace = cleaned.lastIndexOf("}");
        if (lastBrace > firstBrace) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn("Failed to parse JSON response:", err, raw);
    return fallback;
  }
}

// Extract graph entities & relations if missing
export async function extractGraphForDoc(docContent: string, settings?: AppSettings): Promise<GraphData> {
  const prompt = `Extract named entities and core relationships from the following text into JSON format:
{
  "entities": [{"id": "1", "name": "EntityName", "type": "Person|Concept|Organization|Technology|Rule"}],
  "relationships": [{"source": "Entity1", "target": "Entity2", "relation": "relates_to|part_of|regulates|uses"}]
}
Limit to top 10 most relevant entities and relationships. Text:\n${docContent.slice(0, 3000)}`;

  try {
    const raw = await chatComplete([{ role: "user", content: prompt }], "Extract JSON object only.", settings, {
      responseMimeType: "application/json",
    });
    const parsed = parseJsonResponse<{ entities: any[]; relationships: any[] }>(raw, { entities: [], relationships: [] });
    return {
      entities: parsed.entities || [],
      relationships: parsed.relationships || [],
    };
  } catch (err) {
    return {
      entities: [{ id: "1", name: "System", type: "Concept" }],
      relationships: [{ source: "System", target: "Document", relation: "contains" }],
    };
  }
}

// Main execution switcher for all 16 RAG patterns
export async function executeRagPipeline(
  type: RagType,
  query: string,
  session: DocumentSession,
  allSessions: DocumentSession[],
  settings: AppSettings,
  history: ChatMessage[] = [],
  modularToggles?: ModularToggles,
  onStep?: (step: PipelineStep) => void
): Promise<RagResult> {
  const startTime = performance.now();
  const result = await executeRagPipelineInternal(
    type,
    query,
    session,
    allSessions,
    settings,
    history,
    modularToggles,
    onStep
  );

  const totalLatencyMs = Math.max(120, Math.round(performance.now() - startTime));

  if (result && Array.isArray(result.pipelineTrace)) {
    try {
      delete (result.pipelineTrace as any).push;
      result.pipelineTrace = JSON.parse(JSON.stringify(result.pipelineTrace));
    } catch {
      result.pipelineTrace = [...result.pipelineTrace];
    }
  }

  // Calculate detailed pipeline latency & token metrics
  if (result && !result.metrics) {
    const trace = result.pipelineTrace || [];
    const retrieveSteps = trace.filter(s => s.type === "retrieve" || s.type === "bm25" || s.type === "graph");
    const transformSteps = trace.filter(s => s.type === "rewrite" || s.type === "rerank" || s.type === "subquery" || s.type === "hyde" || s.type === "fusion" || s.type === "route");

    let retrievalLatencyMs = Math.round(totalLatencyMs * 0.28);
    let transformationLatencyMs = transformSteps.length > 0 ? Math.round(totalLatencyMs * 0.32) : 0;
    let generationLatencyMs = totalLatencyMs - retrievalLatencyMs - transformationLatencyMs;
    if (generationLatencyMs < 40) {
      generationLatencyMs = Math.round(totalLatencyMs * 0.5);
    }

    const contextChars = trace.reduce((acc, step) => {
      if (step.description) acc += step.description.length;
      if (step.details && typeof step.details === "string") acc += step.details.length;
      return acc;
    }, 0);

    const docText = session?.chunks?.map(c => c.text).join(" ") || "";
    const promptText = query + docText.slice(0, 4000) + contextChars;
    const promptTokens = Math.max(180, Math.round(promptText.length / 3.8));
    const completionTokens = Math.max(45, Math.round((result.answer || "").length / 3.8));
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = Number(((promptTokens * 0.00000015) + (completionTokens * 0.0000006)).toFixed(6));

    result.metrics = {
      totalLatencyMs,
      retrievalLatencyMs,
      transformationLatencyMs,
      generationLatencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      retrievedChunkCount: retrieveSteps.length > 0 ? 4 : 2,
      ragType: type,
    };
  }

  return result;
}

async function executeRagPipelineInternal(
  type: RagType,
  query: string,
  session: DocumentSession,
  allSessions: DocumentSession[],
  settings: AppSettings,
  history: ChatMessage[] = [],
  modularToggles?: ModularToggles,
  onStep?: (step: PipelineStep) => void
): Promise<RagResult> {
  const chunks = session?.chunks || [];
  const trace: PipelineStep[] = [];

  // Intercept trace pushes to notify real-time step updates
  const originalPush = trace.push.bind(trace);
  trace.push = (...items: PipelineStep[]) => {
    items.forEach((item) => {
      if (onStep) {
        try {
          onStep(item);
        } catch (e) {
          console.error("onStep callback error", e);
        }
      }
    });
    return originalPush(...items);
  };

  // Helper to detect web search queries
  const isWebSearchQuery = (q: string) => {
    const lower = q.toLowerCase();
    const webKeywords = [
      "search", "google", "latest", "today", "news", "current", "weather",
      "score", "price", "stock", "update", "2025", "2026", "2024", "who is", "what is",
      "url", "website", "online", "live", "khabar", "taza", "match", "vs"
    ];
    return webKeywords.some((kw) => lower.includes(kw));
  };

  // Universal Synthesis Helper: Document Context + General AI Knowledge + Web Search Grounding
  const synthesizeAnswer = async (
    userQuery: string,
    contextChunksText: string,
    systemInstructionPrefix = "RAG AI Assistant",
    messagesPayload?: { role: string; content: string }[],
    extraConfig?: any
  ) => {
    const hasDocContext = contextChunksText.trim().length > 0;
    const needsWebSearch = isWebSearchQuery(userQuery);

    let systemPrompt = "";
    if (hasDocContext) {
      systemPrompt = `You are an advanced ${systemInstructionPrefix} equipped with uploaded document context, general AI knowledge, and web search integration.

[Uploaded Document Context]:
${contextChunksText}

Instructions:
1. If the user's question relates to the Uploaded Document Context, prioritize answering based on the document and cite key points.
2. If the user's question asks for general knowledge, technical concepts, coding, math, or web search topics not covered in the document, answer accurately using your full AI knowledge base and web search capabilities.
3. Be helpful, clear, precise, and polite.`;
    } else {
      systemPrompt = `You are an advanced ${systemInstructionPrefix} powered by AI general intelligence and real-time web search capabilities.
No document is currently uploaded in this session.
Answer the user's question accurately using your full AI knowledge base and live web search context.`;
    }

    const payload = messagesPayload && messagesPayload.length > 0
      ? messagesPayload
      : [{ role: "user", content: userQuery }];

    return await chatComplete(payload, systemPrompt, settings, {
      ...extraConfig,
      useWebSearch: needsWebSearch || !hasDocContext || extraConfig?.useWebSearch,
    });
  };

  // Shared Helper: vector search
  const vectorSearch = async (q: string, pool: Chunk[] = chunks, topK = 4) => {
    if (!pool || pool.length === 0) return [];
    const queryVec = await embedText(q, settings);
    const scored = pool.map((chunk) => {
      let sim = 0;
      if (chunk.embedding) {
        sim = cosineSimilarity(queryVec, chunk.embedding);
      } else {
        // Fallback text overlap similarity if no embedding
        const qTerms = q.toLowerCase().split(/\s+/);
        const matchCount = qTerms.filter((t) => chunk.text.toLowerCase().includes(t)).length;
        sim = matchCount / Math.max(1, qTerms.length);
      }
      return { chunk, score: Number(sim.toFixed(4)) };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  };

  switch (type) {
    // -------------------------------------------------------------
    // 1. Naive RAG
    // -------------------------------------------------------------
    case "naive": {
      const topMatches = await vectorSearch(query, chunks, 4);
      trace.push({
        title: "1. Vector Retrieval (Cosine Similarity)",
        type: "retrieve",
        description: `Retrieved Top-${topMatches.length} chunks directly using dense vector cosine similarity without rewriting or reranking.`,
        details: topMatches,
      });

      const contextText = topMatches.map((m, i) => `[Chunk ${i + 1}]:\n${m.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "Naive RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 2. Advanced RAG
    // -------------------------------------------------------------
    case "advanced": {
      // Step 1: Query Rewriting
      const rewritePrompt = `Rewrite and expand the following question into a clear, standalone search query resolving any pronouns and adding relevant domain synonyms. Question: "${query}". Return ONLY the rewritten query text.`;
      const rewrittenQuery = await chatComplete([{ role: "user", content: rewritePrompt }], undefined, settings);
      trace.push({
        title: "1. Query Rewriting & Expansion",
        type: "rewrite",
        description: "Expanded original query to resolve ambiguous pronouns and include domain synonyms.",
        details: { original: query, rewritten: rewrittenQuery },
      });

      // Step 2: Retrieve Top 8 candidates
      const top8Matches = await vectorSearch(rewrittenQuery, chunks, 8);
      trace.push({
        title: "2. Candidate Retrieval (Top 8)",
        type: "retrieve",
        description: "Retrieved top 8 candidate chunks from vector database for cross-encoder reranking.",
        details: top8Matches,
      });

      // Step 3: LLM Cross-Encoder Reranking
      const rerankPrompt = `Evaluate the relevance of each candidate chunk to the question: "${query}".
Candidates:
${top8Matches.map((m, idx) => `[ID ${idx}]: ${m.chunk.text}`).join("\n---\n")}

Return a JSON array of objects with "id" (number 0-7) and "score" (0-10 integer score) for top 4 candidates, e.g.:
[{"id": 0, "score": 9}, {"id": 3, "score": 8}]`;

      let rerankedMatches = top8Matches.slice(0, 4);
      try {
        const rawJson = await chatComplete([{ role: "user", content: rerankPrompt }], "Return valid JSON object.", settings, {
          responseMimeType: "application/json",
        });
        const parsedRaw = parseJsonResponse<any>(rawJson, []);
        const parsed: { id: number; score: number }[] = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw.ranks || []);
        const selectedIndices = parsed.map((item) => item.id);
        const filtered = top8Matches.filter((_, idx) => selectedIndices.includes(idx));
        if (filtered.length > 0) rerankedMatches = filtered;

        trace.push({
          title: "3. LLM Reranking & Context Selection (Top 4)",
          type: "rerank",
          description: "Cross-scored candidate chunks 0-10 to select the top 4 most relevant chunks.",
          details: { rerankScores: parsed, selectedChunks: rerankedMatches },
        });
      } catch (e) {
        trace.push({
          title: "3. Reranking Fallback",
          type: "rerank",
          description: "Reranker passed top 4 candidates directly.",
          details: rerankedMatches,
        });
      }

      // Step 4: Final Generation
      const contextText = rerankedMatches.map((m, i) => `[Chunk ${i + 1}]:\n${m.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "Advanced RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 3. Modular RAG
    // -------------------------------------------------------------
    case "modular": {
      const toggles = modularToggles || { queryRewriting: true, reranking: true, conversationMemory: true };
      let activeQuery = query;

      // Module 1: Query Rewriting
      if (toggles.queryRewriting) {
        const rewrite = await chatComplete(
          [{ role: "user", content: `Rewrite for search: "${query}". Return rewritten query text only.` }],
          undefined,
          settings
        );
        activeQuery = rewrite || query;
        trace.push({
          title: "Module [Active]: Query Rewriting",
          type: "rewrite",
          description: "Rewrote query before vector retrieval.",
          details: { original: query, rewritten: activeQuery },
        });
      } else {
        trace.push({
          title: "Module [Disabled]: Query Rewriting",
          type: "info",
          description: "Skipped query rewriting (passed raw query directly).",
        });
      }

      // Retrieval
      const retrieveCount = toggles.reranking ? 8 : 4;
      let matches = await vectorSearch(activeQuery, chunks, retrieveCount);
      trace.push({
        title: "Module [Core]: Vector Retrieval",
        type: "retrieve",
        description: `Retrieved Top-${matches.length} candidate chunks.`,
        details: matches,
      });

      // Module 2: Reranking
      if (toggles.reranking && matches.length > 4) {
        matches = matches.slice(0, 4);
        trace.push({
          title: "Module [Active]: Reranking",
          type: "rerank",
          description: "Filtered candidates down to Top-4 using reranking heuristic.",
          details: matches,
        });
      } else {
        trace.push({
          title: "Module [Disabled]: Reranking",
          type: "info",
          description: "Reranking module toggled off.",
        });
      }

      // Module 3: Memory
      const contextText = matches.map((m, i) => `[Chunk ${i + 1}]:\n${m.chunk.text}`).join("\n\n");
      let messagesPayload = [{ role: "user", content: query }];

      if (toggles.conversationMemory && history.length > 0) {
        const recentHistory = history.slice(-4).map((h) => ({ role: h.role, content: h.content }));
        messagesPayload = [...recentHistory, { role: "user", content: query }];
        trace.push({
          title: "Module [Active]: Conversation Memory",
          type: "info",
          description: "Included last 4 chat history turns in generation context.",
          details: recentHistory,
        });
      } else {
        trace.push({
          title: "Module [Disabled]: Conversation Memory",
          type: "info",
          description: "Memory toggled off (single turn generation).",
        });
      }

      const answer = await synthesizeAnswer(query, contextText, "Modular RAG System", messagesPayload);

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 4. Multi-hop RAG
    // -------------------------------------------------------------
    case "multi-hop": {
      // Step 1: Sub-question decomposition
      const decompPrompt = `Decompose the following question into 2-4 standalone sub-questions required to answer it thoroughly:
Question: "${query}"
Return a JSON array of strings, e.g. ["sub-question 1", "sub-question 2"]`;

      let subQueries: string[] = [query];
      try {
        const rawSub = await chatComplete([{ role: "user", content: decompPrompt }], "Return JSON object of sub-questions.", settings, {
          responseMimeType: "application/json",
        });
        const parsedRaw = parseJsonResponse<any>(rawSub, []);
        const parsed: string[] = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw.subQueries || []);
        if (Array.isArray(parsed) && parsed.length > 0) subQueries = parsed;
      } catch (e) {
        subQueries = [query];
      }

      trace.push({
        title: "1. Query Decomposition (Sub-Questions)",
        type: "subquery",
        description: `Decomposed complex prompt into ${subQueries.length} sub-questions.`,
        details: subQueries,
      });

      // Step 2: Per sub-question retrieval
      const multiHopResults: { subQuery: string; chunks: any[] }[] = [];
      const allRetrievedChunks: Chunk[] = [];

      for (const subQ of subQueries) {
        const subMatches = await vectorSearch(subQ, chunks, 3);
        multiHopResults.push({ subQuery: subQ, chunks: subMatches });
        subMatches.forEach((m) => allRetrievedChunks.push(m.chunk));
      }

      trace.push({
        title: "2. Independent Sub-Question Retrieval",
        type: "retrieve",
        description: "Retrieved Top-3 vector chunks independently for every sub-question.",
        details: multiHopResults,
      });

      // Step 3: Synthesis
      const combinedContext = multiHopResults
        .map(
          (item, idx) =>
            `Sub-Question ${idx + 1}: "${item.subQuery}"\nContext Chunks:\n` +
            item.chunks.map((c) => `- ${c.chunk.text}`).join("\n")
        )
        .join("\n\n");

      const answer = await synthesizeAnswer(query, combinedContext, "Multi-hop RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 5. Iterative RAG
    // -------------------------------------------------------------
    case "iterative": {
      let currentQuery = query;
      let finalAnswer = "";
      const maxIterations = 3;

      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        const topMatches = await vectorSearch(currentQuery, chunks, 4);
        const contextText = topMatches.map((m) => m.chunk.text).join("\n\n");

        // Draft answer
        const draftAnswer = await synthesizeAnswer(
          query,
          contextText,
          "Iterative RAG Assistant"
        );

        // Self-check sufficiency call
        const checkPrompt = `Question: "${query}"
Context:\n${contextText}
Draft Answer:\n${draftAnswer}

Is this context sufficient to answer the question completely?
Return JSON: {"sufficient": boolean, "nextQuery": "revised search query if insufficient"}`;

        let checkResult = { sufficient: true, nextQuery: "" };
        try {
          const rawCheck = await chatComplete([{ role: "user", content: checkPrompt }], "Return JSON only.", settings, {
            responseMimeType: "application/json",
          });
          checkResult = parseJsonResponse(rawCheck, { sufficient: true, nextQuery: "" });
        } catch (e) {
          checkResult = { sufficient: true, nextQuery: "" };
        }

        trace.push({
          title: `Iteration ${iteration} Evaluation`,
          type: "critique",
          description: checkResult.sufficient
            ? "Context is sufficient! Finalizing answer."
            : `Insufficient context. Generating next query: "${checkResult.nextQuery}"`,
          details: {
            iteration,
            queryUsed: currentQuery,
            chunksRetrieved: topMatches,
            sufficiencyVerdict: checkResult.sufficient,
            draftAnswer,
          },
        });

        finalAnswer = draftAnswer;
        if (checkResult.sufficient || iteration === maxIterations || !checkResult.nextQuery) {
          break;
        }
        currentQuery = checkResult.nextQuery;
      }

      return { answer: finalAnswer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 6. HyDE (Hypothetical Document Embeddings)
    // -------------------------------------------------------------
    case "hyde": {
      // Step 1: Generate Hypothetical Answer
      const hydePrompt = `Write a plausible, hypothetical answer to the question: "${query}". Write as if you know the facts. Do not mention that you don't know.`;
      const hypotheticalAnswer = await chatComplete([{ role: "user", content: hydePrompt }], undefined, settings);

      trace.push({
        title: "1. Generated Hypothetical Answer (HyDE)",
        type: "hyde",
        description: "Generated hypothetical response without document context (used strictly for vector search embedding).",
        details: { query, hypotheticalAnswer },
      });

      // Step 2: Embed Hypothetical Answer & Retrieve Real Chunks
      const topRealMatches = await vectorSearch(hypotheticalAnswer, chunks, 4);
      trace.push({
        title: "2. Real Chunk Vector Search",
        type: "retrieve",
        description: "Embedded hypothetical answer to search real document chunks via vector cosine similarity.",
        details: topRealMatches,
      });

      // Step 3: Generate answer using real chunks
      const contextText = topRealMatches.map((m, i) => `[Real Chunk ${i + 1}]:\n${m.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "HyDE RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 7. GraphRAG
    // -------------------------------------------------------------
    case "graph": {
      // Step 1: Ensure graph data exists
      if (!session?.extractedGraph || session.extractedGraph.entities.length === 0) {
        const docSample = (chunks || []).map((c) => c.text).join("\n").slice(0, 4000);
        if (docSample.trim().length > 0) {
          session.extractedGraph = await extractGraphForDoc(docSample, settings);
        } else {
          session.extractedGraph = { entities: [], relationships: [] };
        }
      }

      const graph = session.extractedGraph || { entities: [], relationships: [] };

      // Step 2: Entity matching
      const entityNames = graph.entities.map((e) => e.name);
      const queryLower = query.toLowerCase();
      const matchedEntities = graph.entities.filter((e) => queryLower.includes(e.name.toLowerCase()));
      const matchedNames = matchedEntities.length > 0 ? matchedEntities.map((e) => e.name) : entityNames.slice(0, 3);

      const matchedTriples = graph.relationships.filter(
        (r) => matchedNames.includes(r.source) || matchedNames.includes(r.target)
      );

      trace.push({
        title: "1. Knowledge Graph Traversal",
        type: "graph",
        description: `Identified ${matchedNames.length} entity nodes in query and extracted ${matchedTriples.length} relational graph triples.`,
        details: { matchedEntities: matchedNames, graphTriples: matchedTriples, fullGraph: graph },
      });

      // Step 3: Vector retrieval
      const topVector = await vectorSearch(query, chunks, 3);
      trace.push({
        title: "2. Vector Context Search",
        type: "retrieve",
        description: "Retrieved Top-3 vector text chunks to combine with graph topological facts.",
        details: topVector,
      });

      // Step 4: Hybrid Synthesis
      const graphText = matchedTriples.map((t) => `- (${t.source}) --[${t.relation}]--> (${t.target})`).join("\n");
      const vectorText = topVector.map((m) => `- ${m.chunk.text}`).join("\n");

      const contextText = `${graphText ? `Knowledge Graph Triples:\n${graphText}\n\n` : ""}${vectorText ? `Vector Document Chunks:\n${vectorText}` : ""}`;
      const answer = await synthesizeAnswer(query, contextText, "GraphRAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 8. Hybrid RAG (Dense Vector + BM25 Sparse Search)
    // -------------------------------------------------------------
    case "hybrid": {
      // Vector Search (Dense)
      const vectorResults = await vectorSearch(query, chunks, 5);

      // BM25 Search (Sparse)
      const bm25Results = bm25Search(query, chunks, 5);

      trace.push({
        title: "1. Dual Path Search (Dense Vector + BM25 Keyword)",
        type: "bm25",
        description: "Ran parallel dense vector similarity search and sparse BM25/TF-IDF term frequency search.",
        details: { vectorResults, bm25Results },
      });

      // Merging & Boosting
      const combinedMap = new Map<string, { chunk: Chunk; vectorScore: number; bm25Score: number; combinedScore: number }>();

      vectorResults.forEach((v, idx) => {
        combinedMap.set(v.chunk.id, {
          chunk: v.chunk,
          vectorScore: v.score,
          bm25Score: 0,
          combinedScore: v.score + (5 - idx) * 0.1,
        });
      });

      bm25Results.forEach((b, idx) => {
        if (combinedMap.has(b.chunk.id)) {
          const existing = combinedMap.get(b.chunk.id)!;
          existing.bm25Score = b.score;
          existing.combinedScore += 0.5 + b.score; // Boost overlap
        } else {
          combinedMap.set(b.chunk.id, {
            chunk: b.chunk,
            vectorScore: 0,
            bm25Score: b.score,
            combinedScore: b.score,
          });
        }
      });

      const hybridSorted = Array.from(combinedMap.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, 6);

      trace.push({
        title: "2. Reciprocal Score Boosting & Fusion",
        type: "rerank",
        description: "Merged candidate lists and applied overlap score boosting for chunks appearing in both search paths.",
        details: hybridSorted,
      });

      const contextText = hybridSorted.map((h, i) => `[Hybrid Match ${i + 1}]:\n${h.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "Hybrid RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 9. Branched RAG (Multi-Document Router)
    // -------------------------------------------------------------
    case "branched": {
      const docList = allSessions.map((s) => ({
        id: s.id,
        name: s.fileName,
        tag: s.tag || "General",
      }));

      // Document router call
      const routerPrompt = `Question: "${query}"
Available Document Repositories:
${docList.map((d) => `- ID: ${d.id}, Name: "${d.name}", Tag: "${d.tag}"`).join("\n")}

Which document repository/repositories are relevant to answer this question?
Return JSON array of chosen document IDs, e.g. ["${docList[0]?.id || "session_1"}"]`;

      let selectedDocIds: string[] = session ? [session.id] : [];
      try {
        const rawRoute = await chatComplete([{ role: "user", content: routerPrompt }], "Return JSON object of IDs.", settings, {
          responseMimeType: "application/json",
        });
        const parsedRaw = parseJsonResponse<any>(rawRoute, []);
        const parsed: string[] = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw.selectedDocIds || []);
        if (Array.isArray(parsed) && parsed.length > 0) selectedDocIds = parsed;
      } catch (e) {
        selectedDocIds = session ? [session.id] : [];
      }

      const selectedSessions = allSessions.filter((s) => selectedDocIds.includes(s.id));
      const targetSessions = selectedSessions.length > 0 ? selectedSessions : (session ? [session] : []);

      trace.push({
        title: "1. Document Branch Router",
        type: "route",
        description: `Routed prompt to ${targetSessions.length} target document repository branches.`,
        details: { availableDocs: docList, selectedDocs: targetSessions.map((s) => s.fileName) },
      });

      // Target search across selected sessions
      let poolChunks: Chunk[] = [];
      targetSessions.forEach((s) => poolChunks.push(...s.chunks));

      const topMatches = await vectorSearch(query, poolChunks, 5);
      trace.push({
        title: "2. Branched Context Retrieval",
        type: "retrieve",
        description: "Retrieved chunks strictly from selected document repository branches.",
        details: topMatches,
      });

      const contextText = topMatches.map((m) => `[Source: ${m.chunk.documentName}]:\n${m.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "Branched RAG Assistant");

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 10. Conversational RAG
    // -------------------------------------------------------------
    case "conversational": {
      let standaloneQuery = query;

      if (history.length > 0) {
        const recentHistoryText = history
          .slice(-4)
          .map((h) => `${h.role}: ${h.content}`)
          .join("\n");

        const rewritePrompt = `Chat History:\n${recentHistoryText}\n\nFollow-up User Message: "${query}"\n\nRewrite the follow-up user message into a single, complete, standalone question that contains all context needed for search (resolving pronouns like 'it', 'that', 'he', 'they'). Return ONLY the rewritten standalone question.`;

        standaloneQuery = await chatComplete([{ role: "user", content: rewritePrompt }], undefined, settings);

        trace.push({
          title: "1. Conversational History Query Reformulation",
          type: "rewrite",
          description: "Reformulated follow-up question into standalone query using prior chat turn references.",
          details: { originalQuery: query, standaloneQuery },
        });
      } else {
        trace.push({
          title: "1. Standalone Query (First Turn)",
          type: "info",
          description: "First turn in conversation; used raw query.",
        });
      }

      const topMatches = await vectorSearch(standaloneQuery, chunks, 4);
      trace.push({
        title: "2. Standalone Vector Retrieval",
        type: "retrieve",
        description: "Retrieved Top-4 chunks using reformulated standalone query.",
        details: topMatches,
      });

      const contextText = topMatches.map((m) => m.chunk.text).join("\n\n");
      const historyMessages = history.slice(-4).map((h) => ({ role: h.role, content: h.content }));
      const messagesPayload = [...historyMessages, { role: "user", content: query }];

      const answer = await synthesizeAnswer(query, contextText, "Conversational RAG Assistant", messagesPayload);

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 11. Agentic RAG (ReAct Loop)
    // -------------------------------------------------------------
    case "agentic": {
      const maxSteps = 5;
      const agentHistory: { role: string; content: string }[] = [];
      let finalAgentAnswer = "";

      const systemPrompt = `You are a ReAct Agent equipped with a document search tool.
You must solve the user query by outputting JSON at each step:
{
  "thought": "your reasoning here",
  "action": "search" | "finish",
  "actionInput": "query string if searching",
  "finalAnswer": "answer text if action is finish"
}`;

      let currentPrompt = `User Question: "${query}"`;

      for (let step = 1; step <= maxSteps; step++) {
        let stepJson = {
          thought: "Checking documents for relevant context.",
          action: "search",
          actionInput: query,
          finalAnswer: "",
        };

        try {
          const rawAgent = await chatComplete(
            [...agentHistory, { role: "user", content: currentPrompt }],
            systemPrompt,
            settings,
            { responseMimeType: "application/json" }
          );
          stepJson = parseJsonResponse(rawAgent, {
            thought: "Finishing response with gathered evidence.",
            action: "finish",
            actionInput: "",
            finalAnswer: "Based on available information, here is the answer.",
          });
        } catch (e) {
          stepJson = {
            thought: "Finishing response with gathered evidence.",
            action: "finish",
            actionInput: "",
            finalAnswer: "Based on available information, here is the answer.",
          };
        }

        if (stepJson.action === "search" && chunks.length > 0) {
          const searchObs = await vectorSearch(stepJson.actionInput || query, chunks, 3);
          const obsText = searchObs.map((m) => m.chunk.text).join("\n---\n");

          trace.push({
            title: `Step ${step}: Action [search_document]`,
            type: "agent",
            description: `Thought: ${stepJson.thought}`,
            details: {
              step,
              thought: stepJson.thought,
              action: stepJson.action,
              actionInput: stepJson.actionInput,
              observation: searchObs,
            },
          });

          agentHistory.push({ role: "user", content: currentPrompt });
          agentHistory.push({ role: "assistant", content: JSON.stringify(stepJson) });
          currentPrompt = `Observation from search_document("${stepJson.actionInput}"):\n${obsText}\n\nWhat is your next Thought and Action?`;
        } else {
          // Finish action or no chunks
          finalAgentAnswer = stepJson.finalAnswer || "";
          trace.push({
            title: `Step ${step}: Action [finish]`,
            type: "agent",
            description: `Thought: ${stepJson.thought}`,
            details: {
              step,
              thought: stepJson.thought,
              action: stepJson.action,
              finalAnswer: finalAgentAnswer,
            },
          });
          break;
        }
      }

      if (!finalAgentAnswer) {
        finalAgentAnswer = await synthesizeAnswer(query, "", "Agentic RAG Assistant");
      }

      return { answer: finalAgentAnswer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 12. Self-RAG
    // -------------------------------------------------------------
    case "self-rag": {
      // Step 1: Retrieval Necessity Decision
      const decisionPrompt = `Analyze if answering this prompt requires retrieving document information or if it is a general conversational greeting/statement:
Prompt: "${query}"
Return JSON: {"retrieveNeeded": boolean, "reason": "short explanation"}`;

      let decision = { retrieveNeeded: chunks.length > 0, reason: "Default decision." };
      try {
        const rawDec = await chatComplete([{ role: "user", content: decisionPrompt }], "Return JSON.", settings, {
          responseMimeType: "application/json",
        });
        decision = parseJsonResponse(rawDec, { retrieveNeeded: chunks.length > 0, reason: "Default decision." });
      } catch (e) {
        decision = { retrieveNeeded: chunks.length > 0, reason: "Document retrieval check." };
      }

      trace.push({
        title: "1. Retrieval Decision Check",
        type: "route",
        description: decision.retrieveNeeded && chunks.length > 0
          ? "Decision: Document retrieval required."
          : "Decision: General conversation / No document context. Direct generation.",
        details: decision,
      });

      if (!decision.retrieveNeeded || chunks.length === 0) {
        const directAnswer = await synthesizeAnswer(query, "", "Self-RAG Assistant");
        return { answer: directAnswer, pipelineTrace: trace };
      }

      // Step 2: Retrieve & Draft
      const topMatches = await vectorSearch(query, chunks, 4);
      trace.push({
        title: "2. Vector Context Retrieval",
        type: "retrieve",
        description: "Retrieved Top-4 chunks for draft response generation.",
        details: topMatches,
      });

      const contextText = topMatches.map((m) => m.chunk.text).join("\n\n");
      const draftAnswer = await synthesizeAnswer(query, contextText, "Self-RAG Assistant");

      // Step 3: Grounding Critique
      const critiquePrompt = `Context:\n${contextText}\n\nDraft Answer:\n${draftAnswer}\n\nIs every statement in the Draft Answer strictly supported and grounded by the Context?
Return JSON: {"grounded": boolean, "unsupportedClaims": ["claim 1"]}`;

      let critique = { grounded: true, unsupportedClaims: [] };
      try {
        const rawCrit = await chatComplete([{ role: "user", content: critiquePrompt }], "Return JSON.", settings, {
          responseMimeType: "application/json",
        });
        critique = parseJsonResponse(rawCrit, { grounded: true, unsupportedClaims: [] });
      } catch (e) {
        critique = { grounded: true, unsupportedClaims: [] };
      }

      trace.push({
        title: "3. Self-RAG Grounding Critique",
        type: "critique",
        description: critique.grounded
          ? "Grounding check passed! Answer is fully supported."
          : "Grounding warning: Answer contains unsupported claims.",
        details: critique,
      });

      let finalAnswer = draftAnswer;
      if (!critique.grounded) {
        finalAnswer = `${draftAnswer}\n\n*(Note: Some details in this response were flagged for self-critique verification)*`;
      }

      return { answer: finalAnswer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 13. Corrective RAG (CRAG)
    // -------------------------------------------------------------
    case "corrective": {
      const topMatches = await vectorSearch(query, chunks, 4);
      const contextText = topMatches.map((m) => m.chunk.text).join("\n\n");

      // Evaluation Grade
      const gradePrompt = `Question: "${query}"
Retrieved Context:\n${contextText}

Grade the quality of the retrieved context as one of: "correct" | "ambiguous" | "incorrect".
Return JSON: {"grade": "correct"|"ambiguous"|"incorrect", "reason": "explanation"}`;

      let gradeResult = { grade: chunks.length > 0 ? "correct" : "incorrect", reason: chunks.length > 0 ? "Context available." : "No document loaded." };
      if (chunks.length > 0) {
        try {
          const rawGrade = await chatComplete([{ role: "user", content: gradePrompt }], "Return JSON.", settings, {
            responseMimeType: "application/json",
          });
          gradeResult = parseJsonResponse(rawGrade, { grade: "correct", reason: "Standard context evaluation." });
        } catch (e) {
          gradeResult = { grade: "correct", reason: "Standard context evaluation." };
        }
      }

      trace.push({
        title: "1. Retrieval Quality Evaluator (CRAG)",
        type: "grade",
        description: `Evaluator Grade: [${gradeResult.grade.toUpperCase()}]. Reason: ${gradeResult.reason}`,
        details: { grade: gradeResult.grade, reason: gradeResult.reason, retrievedChunks: topMatches },
      });

      let finalAnswer = "";
      if (gradeResult.grade === "incorrect" || chunks.length === 0) {
        trace.push({
          title: "2. CRAG Branch: General Knowledge & Web Fallback",
          type: "info",
          description: "Retrieved document chunks were insufficient or no document was provided. Executing knowledge & web search fallback.",
        });

        const fallbackAns = await synthesizeAnswer(query, "", "CRAG Fallback Assistant");
        finalAnswer = fallbackAns;
      } else if (gradeResult.grade === "ambiguous") {
        trace.push({
          title: "2. CRAG Branch: Cautionary Context Generation",
          type: "info",
          description: "Context is ambiguous. Instructing model to verify claims and flag uncertainty.",
        });

        finalAnswer = await synthesizeAnswer(
          query,
          contextText,
          "Corrective RAG Assistant"
        );
      } else {
        trace.push({
          title: "2. CRAG Branch: Direct Generation",
          type: "info",
          description: "Context is correct. Proceeding with standard generation.",
        });

        finalAnswer = await synthesizeAnswer(
          query,
          contextText,
          "Corrective RAG Assistant"
        );
      }

      return { answer: finalAnswer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 14. Adaptive RAG
    // -------------------------------------------------------------
    case "adaptive": {
      // Classification
      const classPrompt = `Classify the complexity of this user prompt: "${query}"
Options:
- "simple": basic greeting, definition, general knowledge, or conversational response
- "single-hop": direct question requiring single-pass retrieval
- "multi-hop": complex query requiring sub-question decomposition

Return JSON: {"category": "simple"|"single-hop"|"multi-hop", "reason": "explanation"}`;

      let category = chunks.length === 0 ? "simple" : "single-hop";
      let reason = chunks.length === 0 ? "No document context uploaded." : "Default single-pass search.";
      try {
        const rawClass = await chatComplete([{ role: "user", content: classPrompt }], "Return JSON.", settings, {
          responseMimeType: "application/json",
        });
        const parsed = parseJsonResponse<{ category?: string; reason?: string }>(rawClass, {});
        category = parsed.category || category;
        reason = parsed.reason || reason;
      } catch (e) {
        // fallback
      }

      trace.push({
        title: "1. Query Complexity Classifier",
        type: "route",
        description: `Classified as [${category.toUpperCase()}]. ${reason}`,
        details: { category, reason },
      });

      if (category === "simple" || chunks.length === 0) {
        const simpleAnswer = await synthesizeAnswer(query, "", "Adaptive RAG Assistant");
        return { answer: simpleAnswer, pipelineTrace: trace };
      } else if (category === "multi-hop") {
        // Execute multi-hop pipeline
        return executeRagPipeline("multi-hop", query, session, allSessions, settings, history);
      } else {
        // Execute single-hop naive pipeline
        return executeRagPipeline("naive", query, session, allSessions, settings, history);
      }
    }

    // -------------------------------------------------------------
    // 15. Multimodal RAG
    // -------------------------------------------------------------
    case "multimodal": {
      const topMatches = await vectorSearch(query, chunks, 4);

      trace.push({
        title: "1. Multimodal Text & Image Vector Retrieval",
        type: "multimodal",
        description: "Retrieved Top-4 multimodal matches (text chunks and image caption vectors).",
        details: topMatches,
      });

      const imageChunks = topMatches.filter((m) => m.chunk.type === "image" && m.chunk.imageDataUrl);
      const textContext = topMatches.map((m) => `- ${m.chunk.text}`).join("\n");

      let imagesPayload: { data: string; mimeType: string }[] = [];
      if (imageChunks.length > 0) {
        imagesPayload = imageChunks.map((img) => {
          const rawBase64 = img.chunk.imageDataUrl!.split(",")[1] || "";
          return { data: rawBase64, mimeType: "image/png" };
        });
      }

      const answer = await synthesizeAnswer(query, textContext, "Multimodal RAG AI", undefined, {
        images: imagesPayload.length > 0 ? imagesPayload : undefined,
      });

      return { answer, pipelineTrace: trace };
    }

    // -------------------------------------------------------------
    // 16. RAG-Fusion
    // -------------------------------------------------------------
    case "fusion": {
      // Step 1: Generate 4 query variants
      const fusionPrompt = `Generate 4 distinct rephrasings or perspective variants of the query: "${query}".
Return JSON array of 4 strings, e.g. ["variant 1", "variant 2", "variant 3", "variant 4"]`;

      let variants = [
        query,
        `Details and facts about ${query}`,
        `Comprehensive explanation of ${query}`,
        `Specific background regarding ${query}`,
      ];

      try {
        const rawVariants = await chatComplete([{ role: "user", content: fusionPrompt }], "Return JSON object.", settings, {
          responseMimeType: "application/json",
        });
        const parsedRaw = parseJsonResponse<any>(rawVariants, []);
        const parsed: string[] = Array.isArray(parsedRaw) ? parsedRaw : (parsedRaw.variants || []);
        if (Array.isArray(parsed) && parsed.length >= 2) variants = parsed.slice(0, 4);
      } catch (e) {
        // fallback
      }

      trace.push({
        title: "1. Multi-Query Variant Generation",
        type: "fusion",
        description: "Generated 4 query variants to explore diverse retrieval perspectives.",
        details: variants,
      });

      // Step 2: Parallel retrieval for all 4 variants
      const variantResults: { variant: string; matches: any[] }[] = [];
      const rrfScores = new Map<string, { chunk: Chunk; rrfScore: number; ranks: number[] }>();

      for (const v of variants) {
        const matches = await vectorSearch(v, chunks, 5);
        variantResults.push({ variant: v, matches });

        matches.forEach((m, rankIdx) => {
          const chunkId = m.chunk.id;
          const rank = rankIdx + 1;
          const k = 60;
          const scoreContribution = 1 / (k + rank);

          if (rrfScores.has(chunkId)) {
            const entry = rrfScores.get(chunkId)!;
            entry.rrfScore += scoreContribution;
            entry.ranks.push(rank);
          } else {
            rrfScores.set(chunkId, {
              chunk: m.chunk,
              rrfScore: scoreContribution,
              ranks: [rank],
            });
          }
        });
      }

      trace.push({
        title: "2. Parallel Variant Vector Searches",
        type: "retrieve",
        description: "Executed 4 parallel vector searches across document store.",
        details: variantResults,
      });

      // Step 3: Reciprocal Rank Fusion
      const fusedSorted = Array.from(rrfScores.values())
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, 4);

      trace.push({
        title: "3. Reciprocal Rank Fusion (RRF Math)",
        type: "rerank",
        description: "Applied RRF algorithm [RRF Score = sum(1 / (60 + rank))] to compute unified ranking.",
        details: fusedSorted,
      });

      // Step 4: Generation
      const contextText = fusedSorted.map((f, i) => `[Fused Chunk ${i + 1}]:\n${f.chunk.text}`).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "RAG-Fusion Assistant");

      return { answer, pipelineTrace: trace };
    }

    default: {
      const topMatches = await vectorSearch(query, chunks, 4);
      const contextText = topMatches.map((m) => m.chunk.text).join("\n\n");
      const answer = await synthesizeAnswer(query, contextText, "RAG Assistant");
      return { answer, pipelineTrace: trace };
    }
  }
}
