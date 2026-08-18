import { describe, expect, it } from "vitest";

import { chunkDocuments } from "@/src/ingest";
import { extractJobIdFromMessage, resolveTargetJobId } from "@/src/job-resolver";
import { createLlm } from "@/src/llm";
import {
  buildVectorStoreFromChunks,
  chunkMatchesJobScope,
  retrieveForJob,
} from "@/src/retrieve";
import type { DocumentChunk, JobDocument, ResumeDocument } from "@/src/types";

const sampleResume: ResumeDocument = {
  id: "resume-sample",
  source: "resume",
  title: "Alex Morgan",
  fileName: "resume.md",
  createdAt: "2026-08-18T09:00:00.000Z",
  text: "Built AI workflow tools with retrieval pipelines and TypeScript.",
};

const jobOne: JobDocument = {
  id: "job-1",
  jobId: "job-1",
  source: "job",
  title: "Frontend Engineer",
  company: "Northstar Health",
  fileName: "job-1.md",
  createdAt: "2026-08-18T09:00:00.000Z",
  text: "Job 1 requires React, design systems, accessibility, and frontend testing.",
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

function chunkJobIds(chunks: DocumentChunk[]): string[] {
  return chunks
    .filter((chunk) => chunk.metadata.source === "job")
    .map((chunk) => chunk.metadata.jobId)
    .filter((jobId): jobId is string => Boolean(jobId));
}

describe("resolveTargetJobId", () => {
  it("prefers explicit job mentions in the message", () => {
    expect(
      resolveTargetJobId("How does my experience align with Job 2?", "job-1", [
        "job-1",
        "job-2",
      ]),
    ).toBe("job-2");
  });

  it("falls back to the selected job when no mention exists", () => {
    expect(
      resolveTargetJobId("What skills am I missing?", "job-1", ["job-1", "job-2"]),
    ).toBe("job-1");
  });

  it("extracts numeric job references", () => {
    expect(extractJobIdFromMessage("Give me interview prep for role 3")).toBe("job-3");
  });
});

describe("chunkMatchesJobScope", () => {
  const chunks = chunkDocuments([sampleResume, jobOne, jobTwo]);

  it("includes resume chunks for any selected job", () => {
    const resumeChunk = chunks.find((chunk) => chunk.metadata.source === "resume");
    expect(resumeChunk).toBeDefined();
    expect(chunkMatchesJobScope(resumeChunk!, "job-2")).toBe(true);
  });

  it("excludes other job chunks from the selected job scope", () => {
    const jobOneChunk = chunks.find((chunk) => chunk.metadata.jobId === "job-1");
    const jobTwoChunk = chunks.find((chunk) => chunk.metadata.jobId === "job-2");

    expect(jobOneChunk).toBeDefined();
    expect(jobTwoChunk).toBeDefined();
    expect(chunkMatchesJobScope(jobOneChunk!, "job-2")).toBe(false);
    expect(chunkMatchesJobScope(jobTwoChunk!, "job-2")).toBe(true);
  });
});

describe("retrieveForJob", () => {
  it("does not return Job 1 chunks when retrieving for Job 2", async () => {
    const chunks = chunkDocuments([sampleResume, jobOne, jobTwo]);
    const store = await buildVectorStoreFromChunks(chunks, createLlm("local"));

    const result = await retrieveForJob(
      store,
      {
        query: "How does my experience align with Job 2?",
        selectedJobId: "job-2",
        availableJobIds: ["job-1", "job-2"],
      },
      createLlm("local"),
    );

    expect(result.selectedJobId).toBe("job-2");
    expect(chunkJobIds(result.chunks.map(({ chunk }) => chunk))).toEqual(["job-2"]);
    expect(result.retrievedChunkIds.some((id) => id.startsWith("job-1-"))).toBe(false);
    expect(result.citations.every((citation) => citation.jobId !== "job-1")).toBe(true);
    expect(result.citations.some((citation) => citation.source === "resume")).toBe(true);
    expect(result.citations.some((citation) => citation.jobId === "job-2")).toBe(true);
  });
});
