import type { LlmProvider } from "@/src/types";

export interface ChatLogEvent {
  question: string;
  selectedJobId?: string;
  retrievedChunkIds: string[];
  provider: LlmProvider;
  latencyMs: number;
}

export function formatChatLog(event: ChatLogEvent): string {
  return JSON.stringify({
    event: "chat",
    question: event.question,
    selectedJobId: event.selectedJobId ?? null,
    retrievedChunkIds: event.retrievedChunkIds,
    provider: event.provider,
    latencyMs: event.latencyMs,
  });
}

export function logChatEvent(event: ChatLogEvent): void {
  console.info(`[career-intel] ${formatChatLog(event)}`);
}
