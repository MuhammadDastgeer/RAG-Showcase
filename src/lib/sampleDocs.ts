import { DocumentSession } from "../types";
import { chunkText, embedText } from "./llm";

export const SAMPLE_DOCUMENTS = [
  {
    id: "sample_rag_paper",
    fileName: "RAG_Architectures_Comprehensive_Overview.txt",
    tag: "Research Paper",
    description: "In-depth guide covering Naive, HyDE, Multi-hop, Graph, and Self-RAG paradigms.",
    content: `Title: Survey of Advanced Retrieval-Augmented Generation (RAG) Architectures for Large Language Models

Abstract: Large Language Models (LLMs) suffer from knowledge cutoff dates and non-deterministic hallucinations. Retrieval-Augmented Generation (RAG) bridges this gap by coupling generative parametric memory with non-parametric vector databases. This paper evaluates sixteen distinct RAG architectural patterns designed to maximize factual precision and contextual relevance.

Section 1: Naive vs Advanced RAG
Naive RAG follows a linear three-stage pipeline: Document Chunking, Embedding Indexing, and Vector Cosine Similarity Retrieval. While efficient, Naive RAG fails when queries are vague, domain vocabulary diverges from chunk representations, or top-K retrieved chunks contain irrelevant noise.
Advanced RAG introduces Pre-Retrieval and Post-Retrieval transformations. Pre-retrieval techniques rewrite user queries to resolve ambiguous pronouns and expand domain terminology. Post-retrieval pipelines apply cross-encoder reranking, context compression, and dynamic chunk selection to boost signal-to-noise ratio before passing prompt context to the generator.

Section 2: Query Transformation Paradigms (HyDE & RAG-Fusion)
Hypothetical Document Embeddings (HyDE) bypasses query-document embedding asymmetry by prompting an LLM to generate a hypothetical answer snippet. Embeddings are generated from this hypothetical response rather than the raw query, significantly improving recall for implicit questions.
RAG-Fusion expands user intent by generating multiple multi-perspective query variants. Each variant executes independent similarity searches. Reciprocal Rank Fusion (RRF) then re-scores items using the mathematical formula: score(d) = sum(1 / (60 + rank_i(d))), producing a unified context ranking that outperforms single-pass retrieval.

Section 3: GraphRAG and Knowledge Graphs
Vector similarity captures semantic proximity but struggles with non-adjacent global relational reasoning. GraphRAG extracts named entities (e.g., Models, Benchmarks, Organizations) and explicit relationships during document ingestion. Graph traversal pulls topological subgraphs, enabling the LLM to summarize global concepts across disparate document sections.

Section 4: Self-Correction (Self-RAG & CRAG)
Corrective RAG (CRAG) evaluates retrieved document quality using an external evaluator grade ("Correct", "Ambiguous", or "Incorrect"). If chunks are graded Incorrect, the system triggers web search fallback or flags non-found status.
Self-RAG incorporates critique tokens [IsREL], [IsSUP], and [IsUSE] to inspect both retrieval necessity and answer grounding, ensuring generated claims are directly verifiable from retrieved context.`,
  },
  {
    id: "sample_hr_policy",
    fileName: "Enterprise_Global_HR_and_Benefits_2026.txt",
    tag: "HR Policy",
    description: "Company policy covering PTO, remote stipend, parental leave, and expense claims.",
    content: `Apex Global Technologies - Employee Handbook & Benefits Policy 2026

1. Flexible Work & Home Office Stipend
All full-time employees are eligible for a one-time remote workstation allowance of $1,500 USD upon hire. Additionally, employees receive a monthly wellness & internet stipend of $150 USD. Equipment such as MacBook Pros and ergonomic chairs remain company property and must be returned upon employment termination.

2. Paid Time Off (PTO) & Parental Leave
Full-time staff accrue 22 days of paid time off per calendar year. Employees with over 3 years of service accrue 25 days. PTO roll-over is capped at 5 days into the following year; unused excess PTO is paid out in December.
Parental Leave: Primary caregivers receive 16 weeks of 100% paid parental leave. Secondary caregivers receive 8 weeks of 100% paid leave. Parental leave must be taken within 12 months of the child's birth or legal adoption.

3. Expense Reimbursement Guidelines
Business travel expenses must be submitted within 30 calendar days via the expense portal. Meals during business travel are covered up to $85 USD per day. Hotel accommodations are capped at $250 USD per night in tier-2 cities and $380 USD per night in tier-1 financial hubs (e.g., New York, Tokyo, London). Expenses exceeding $500 require pre-approval from the Department Vice President.

4. Professional Development Stipend
Each employee is allocated an annual learning budget of $2,000 USD for professional conferences, online certifications, and educational literature. Subscriptions to technical journals and approved developer tool licenses are billed directly to the team cost center.`,
  },
  {
    id: "sample_saas_tos",
    fileName: "CloudScale_SaaS_Service_Level_Agreement.txt",
    tag: "Legal SLA",
    description: "Terms of service detailing 99.95% uptime guarantees, service credits, and ISO security.",
    content: `CloudScale Enterprise Cloud Platform - Master Service Agreement & SLA

1. Service Availability Guarantee (99.95% Uptime)
CloudScale guarantees a monthly service availability uptime percentage of 99.95% for all Enterprise tier subscriptions. Unscheduled service downtime is measured from the minute of primary service outage reported on the official CloudScale Status Dashboard until full restoration of core API endpoints.

2. Service Credit Schedule
If CloudScale fails to meet the Guaranteed Uptime in any given billing month, Customer is eligible for Service Credits calculated as follows:
- Monthly Uptime 99.0% to 99.94%: 10% credit of monthly invoice
- Monthly Uptime 95.0% to 98.99%: 25% credit of monthly invoice
- Monthly Uptime below 95.0%: 50% credit of monthly invoice
To claim credits, Customer must file a written claim to billing@cloudscale.io within 15 business days of month-end.

3. Security & Compliance Declarations
CloudScale maintains ISO/IEC 27001, SOC 2 Type II, and HIPAA compliance certifications. All customer data at rest is encrypted using AES-256 GCM encryption. Data in transit is protected via TLS 1.3 encryption. Automated cross-region database backups are performed every 4 hours with a 30-day point-in-time recovery window.

4. Limitation of Liability & Termination
Neither party's aggregate liability arising out of or related to this agreement shall exceed the total amount paid by Customer in the 12 months preceding the first event giving rise to liability. Either party may terminate the agreement upon 30 days written notice for material breach if such breach remains uncured.`,
  },
];

// Instantiates a pre-loaded document session with pre-calculated embeddings
export async function createPreloadedSession(sampleId: string): Promise<DocumentSession> {
  const sample = SAMPLE_DOCUMENTS.find((d) => d.id === sampleId) || SAMPLE_DOCUMENTS[0];
  const rawChunks = chunkText(sample.content, sample.id, sample.fileName);

  // Generate embeddings for sample chunks
  const chunks = await Promise.all(
    rawChunks.map(async (c) => {
      const embedding = await embedText(c.text);
      return { ...c, embedding };
    })
  );

  return {
    id: `session_${sample.id}_${Date.now()}`,
    fileName: sample.fileName,
    fileSize: sample.content.length,
    uploadedAt: Date.now(),
    chunks,
    tag: sample.tag,
  };
}
