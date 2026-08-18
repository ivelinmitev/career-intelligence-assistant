import { generateAnswer } from "@/src/generate";
import { createLlm, getLlmProviderFromEnv } from "@/src/llm";
import { buildSampleVectorStore, retrieveForJob } from "@/src/retrieve";
import type { ChatRequest, ChatResponse, Llm } from "@/src/types";
import { InMemoryVectorStore } from "@/src/vector-store";

const storeCache = new Map<string, Promise<InMemoryVectorStore>>();

export async function getDefaultStore(llm: Llm): Promise<InMemoryVectorStore> {
  const cacheKey = process.env.LLM_PROVIDER ?? "local";
  const existing = storeCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const created = buildSampleVectorStore(llm);
  storeCache.set(cacheKey, created);
  return created;
}

export async function answerQuestion(
  request: ChatRequest,
  options?: {
    llm?: Llm;
    store?: InMemoryVectorStore;
  },
): Promise<ChatResponse> {
  const startedAt = Date.now();
  const provider = getLlmProviderFromEnv();
  const llm = options?.llm ?? createLlm(provider);
  const store = options?.store ?? (await getDefaultStore(llm));
  const message = request.message.trim();

  const retrieval = await retrieveForJob(
    store,
    {
      query: message,
      selectedJobId: request.selectedJobId,
    },
    llm,
  );

  const answer = await generateAnswer(message, retrieval, llm);
  const emptyRetrieval = retrieval.chunks.length === 0;

  return {
    answer,
    citations: emptyRetrieval ? [] : retrieval.citations,
    selectedJobId: retrieval.selectedJobId,
    retrievedChunkIds: retrieval.retrievedChunkIds,
    provider,
    latencyMs: Date.now() - startedAt,
  };
}
