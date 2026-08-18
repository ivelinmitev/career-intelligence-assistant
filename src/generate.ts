import type { Llm, RetrievalResult, ScoredChunk } from "@/src/types";

export interface GenerationOptions {
  temperature: number;
}

export const defaultGenerationOptions: GenerationOptions = {
  temperature: 0.1,
};

export const EMPTY_CONTEXT_ANSWER =
  "The answer is not in the uploaded or provided documents. Upload a resume and the relevant job description, then ask again.";

function formatChunkForPrompt(scored: ScoredChunk): string {
  const { chunk } = scored;
  const jobLabel = chunk.metadata.jobId ? ` | jobId=${chunk.metadata.jobId}` : "";
  return `[${chunk.metadata.source} | ${chunk.id}${jobLabel}]\n${chunk.text}`;
}

export function buildGroundedPrompt(
  question: string,
  retrieval: RetrievalResult,
): string {
  const context = retrieval.chunks.map(formatChunkForPrompt).join("\n\n");

  return [
    "You are a career intelligence assistant that compares one resume with one job description.",
    "Answer using ONLY the retrieved context below.",
    "Do not invent skills that are not present in the resume excerpts.",
    "Do not invent requirements that are not present in the job excerpts.",
    "If the retrieved context is missing the answer, say the answer is not in the uploaded or provided documents.",
    "Keep the answer job-scoped: do not mix in other jobs.",
    "",
    `Selected job: ${retrieval.selectedJobId}`,
    `Selected candidate: ${retrieval.selectedCandidateId}`,
    "",
    "Retrieved context:",
    context,
    "",
    "Question:",
    question,
  ].join("\n");
}

export async function generateAnswer(
  question: string,
  retrieval: RetrievalResult,
  llm: Llm,
): Promise<string> {
  if (retrieval.chunks.length === 0) {
    return EMPTY_CONTEXT_ANSWER;
  }

  const prompt = buildGroundedPrompt(question, retrieval);
  const answer = (await llm.complete(prompt)).trim();

  if (!answer) {
    return EMPTY_CONTEXT_ANSWER;
  }

  return answer;
}
