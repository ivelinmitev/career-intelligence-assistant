import { describe, expect, it } from "vitest";

import { answerQuestion } from "@/src/chat";
import { EMPTY_CONTEXT_ANSWER } from "@/src/generate";
import { chunkDocuments } from "@/src/ingest";
import { createLlm } from "@/src/llm";
import { buildVectorStoreFromChunks } from "@/src/retrieve";
import type { JobDocument, Llm, ResumeDocument } from "@/src/types";
import { InMemoryVectorStore } from "@/src/vector-store";

const sampleResume: ResumeDocument = {
  id: "resume-sample",
  source: "resume",
  title: "Alex Morgan",
  fileName: "resume.md",
  createdAt: "2026-08-18T09:00:00.000Z",
  text: "Built AI workflow tools with retrieval pipelines and TypeScript.",
};

const jobTwo: JobDocument = {
  id: "job-2",
  jobId: "job-2",
  source: "job",
  title: "AI Product Engineer",
  company: "SignalForge",
  fileName: "job-2.md",
  createdAt: "2026-08-18T09:00:00.000Z",
  text: "Job 2 requires LLMs, retrieval pipelines, prompt engineering, and vector search.",
};

class RecordingLlm implements Llm {
  completeCalls = 0;
  lastPrompt = "";

  async embed(texts: string[]): Promise<number[][]> {
    return createLlm("local").embed(texts);
  }

  async complete(prompt: string): Promise<string> {
    this.completeCalls += 1;
    this.lastPrompt = prompt;
    return "Grounded answer from retrieved context only.";
  }
}

describe("answerQuestion", () => {
  it("returns a grounded answer with citations and debug metadata", async () => {
    const llm = new RecordingLlm();
    const store = await buildVectorStoreFromChunks(
      chunkDocuments([sampleResume, jobTwo]),
      llm,
    );

    const result = await answerQuestion(
      {
        message: "How does my experience align with Job 2?",
        selectedJobId: "job-2",
      },
      { llm, store },
    );

    expect(llm.completeCalls).toBe(1);
    expect(llm.lastPrompt).toContain("Retrieved context:");
    expect(llm.lastPrompt).toContain("Do not invent skills");
    expect(result.answer).toBe("Grounded answer from retrieved context only.");
    expect(result.selectedJobId).toBe("job-2");
    expect(result.retrievedChunkIds.length).toBeGreaterThan(0);
    expect(result.citations.some((citation) => citation.source === "resume")).toBe(
      true,
    );
    expect(result.citations.some((citation) => citation.jobId === "job-2")).toBe(
      true,
    );
    expect(result.citations.every((citation) => citation.jobId !== "job-1")).toBe(
      true,
    );
  });

  it("does not call the LLM when the store is empty", async () => {
    const llm = new RecordingLlm();
    const store = new InMemoryVectorStore();

    const result = await answerQuestion(
      {
        message: "What skills am I missing for this role?",
        selectedJobId: "job-2",
      },
      { llm, store },
    );

    expect(llm.completeCalls).toBe(0);
    expect(result.answer).toBe(EMPTY_CONTEXT_ANSWER);
    expect(result.citations).toEqual([]);
    expect(result.retrievedChunkIds).toEqual([]);
    expect(result.selectedJobId).toBe("job-2");
  });
});
