import { ingestSampleData } from "@/src/ingest";
import { resolveTargetJobId } from "@/src/job-resolver";
import { createLlm, createLlmFromEnv } from "@/src/llm";
import type {
  Citation,
  DocumentChunk,
  EmbeddedChunk,
  Llm,
  RetrievalRequest,
  RetrievalResult,
  ScoredChunk,
} from "@/src/types";
import { InMemoryVectorStore } from "@/src/vector-store";

export interface RetrievalOptions {
  maxResults: number;
}

export const defaultRetrievalOptions: RetrievalOptions = {
  maxResults: 6,
};

export function listJobIds(chunks: DocumentChunk[]): string[] {
  const jobIds = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.metadata.source === "job" && chunk.metadata.jobId) {
      jobIds.add(chunk.metadata.jobId);
    }
  }

  return [...jobIds].sort();
}

export function chunkMatchesJobScope(
  chunk: DocumentChunk,
  selectedJobId: string,
): boolean {
  if (chunk.metadata.source === "resume") {
    return true;
  }

  if (chunk.metadata.source === "job") {
    return chunk.metadata.jobId === selectedJobId;
  }

  return false;
}

export function chunkToCitation(chunk: DocumentChunk): Citation {
  return {
    chunkId: chunk.id,
    source: chunk.metadata.source,
    title: chunk.metadata.title,
    quote: chunk.text,
    ...(chunk.metadata.jobId ? { jobId: chunk.metadata.jobId } : {}),
  };
}

export async function embedChunks(
  chunks: DocumentChunk[],
  llm: Llm,
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const embeddings = await llm.embed(chunks.map((chunk) => chunk.text));

  return chunks.map((chunk, index) => ({
    chunk,
    embedding: embeddings[index] ?? [],
  }));
}

export async function buildVectorStoreFromChunks(
  chunks: DocumentChunk[],
  llm: Llm = createLlmFromEnv(),
): Promise<InMemoryVectorStore> {
  const store = new InMemoryVectorStore();
  const embeddedChunks = await embedChunks(chunks, llm);
  store.addMany(embeddedChunks);
  return store;
}

export async function buildSampleVectorStore(
  llm: Llm = createLlmFromEnv(),
): Promise<InMemoryVectorStore> {
  const { chunks } = await ingestSampleData();
  return buildVectorStoreFromChunks(chunks, llm);
}

export async function retrieveForJob(
  store: InMemoryVectorStore,
  request: RetrievalRequest,
  llm: Llm = createLlmFromEnv(),
  options: RetrievalOptions = defaultRetrievalOptions,
): Promise<RetrievalResult> {
  const availableJobIds =
    request.availableJobIds ?? listJobIds(store.listChunks());
  const selectedJobId = resolveTargetJobId(
    request.query,
    request.selectedJobId,
    availableJobIds,
  );

  if (!selectedJobId) {
    throw new Error(
      "Could not resolve a target job. Select a job or mention one explicitly, e.g. Job 2.",
    );
  }

  const scopeFilter = (chunk: DocumentChunk) =>
    chunkMatchesJobScope(chunk, selectedJobId);

  const [queryEmbedding] = await llm.embed([request.query]);
  if (!queryEmbedding) {
    throw new Error("Failed to embed retrieval query.");
  }

  const scoredChunks: ScoredChunk[] = store.search(
    queryEmbedding,
    scopeFilter,
    options.maxResults,
  );

  return {
    query: request.query,
    selectedJobId,
    chunks: scoredChunks,
    citations: scoredChunks.map(({ chunk }) => chunkToCitation(chunk)),
    retrievedChunkIds: scoredChunks.map(({ chunk }) => chunk.id),
  };
}

export function formatRetrievalResult(result: RetrievalResult): string {
  const lines = [
    `Query: ${result.query}`,
    `Selected job: ${result.selectedJobId}`,
    `Retrieved chunks: ${result.retrievedChunkIds.length}`,
    "",
    "Results:",
  ];

  for (const { chunk, score } of result.chunks) {
    const jobLabel = chunk.metadata.jobId ? `, jobId=${chunk.metadata.jobId}` : "";
    lines.push(
      `- ${chunk.id} (${chunk.metadata.source}${jobLabel}) score=${score.toFixed(4)}`,
    );
    lines.push(`  ${chunk.text.slice(0, 160)}${chunk.text.length > 160 ? "…" : ""}`);
  }

  lines.push("", "Citations:");
  for (const citation of result.citations) {
    const jobLabel = citation.jobId ? `, jobId=${citation.jobId}` : "";
    lines.push(
      `- ${citation.chunkId} (${citation.source}${jobLabel}) | ${citation.title}`,
    );
  }

  return lines.join("\n");
}

export { resolveTargetJobId };
