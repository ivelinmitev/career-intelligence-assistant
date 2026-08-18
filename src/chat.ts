import { generateAnswer } from "@/src/generate";
import { createLlm, getLlmProviderFromEnv } from "@/src/llm";
import { logChatEvent, type ChatLogEvent } from "@/src/observe";
import { retrieveForJob } from "@/src/retrieve";
import { getSessionStore } from "@/src/session";
import type { ChatRequest, ChatResponse, Llm } from "@/src/types";
import { InMemoryVectorStore } from "@/src/vector-store";

export async function getDefaultStore(llm: Llm): Promise<InMemoryVectorStore> {
  return getSessionStore(llm);
}

export async function answerQuestion(
  request: ChatRequest,
  options?: {
    llm?: Llm;
    store?: InMemoryVectorStore;
    logger?: (event: ChatLogEvent) => void;
  },
): Promise<ChatResponse> {
  const startedAt = Date.now();
  const provider = getLlmProviderFromEnv();
  const llm = options?.llm ?? createLlm(provider);
  const store = options?.store ?? (await getDefaultStore(llm));
  const logger = options?.logger ?? logChatEvent;
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
  const latencyMs = Date.now() - startedAt;
  const retrievedChunkIds = emptyRetrieval ? [] : retrieval.retrievedChunkIds;

  logger({
    question: message,
    selectedJobId: retrieval.selectedJobId,
    retrievedChunkIds,
    provider,
    latencyMs,
  });

  return {
    answer,
    citations: emptyRetrieval ? [] : retrieval.citations,
    selectedJobId: retrieval.selectedJobId,
    retrievedChunkIds,
    provider,
    latencyMs,
  };
}
