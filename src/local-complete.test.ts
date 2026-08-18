import { describe, expect, it } from "vitest";

import { completeFromRetrievedContext } from "@/src/local-complete";
import { buildGroundedPrompt } from "@/src/generate";
import type { ChunkMetadata, RetrievalResult, ScoredChunk } from "@/src/types";

function scored(
  id: string,
  text: string,
  metadata: Partial<ChunkMetadata> & Pick<ChunkMetadata, "source">,
  score: number,
): ScoredChunk {
  return {
    chunk: {
      id,
      text,
      metadata: {
        documentId: id,
        chunkIndex: 0,
        startChar: 0,
        endChar: text.length,
        title: metadata.source === "resume" ? "Resume" : "Job",
        ...metadata,
      },
    },
    score,
  };
}

const retrieval: RetrievalResult = {
  query: "Is this candidate okay for the selected job?",
  selectedJobId: "job-2",
  selectedCandidateId: "candidate-1",
  chunks: [
    scored(
      "resume-chunk-0",
      "## Core Skills\n\n- TypeScript\n- React\n- Next.js\n- Node.js\n\nBuilt AI workflow tools with retrieval pipelines.",
      { source: "resume", candidateId: "candidate-1" },
      0.9,
    ),
    scored(
      "job-2-chunk-0",
      "## Requirements\n\n- TypeScript or Python\n- Prompt engineering\n- Evaluation mindset\n- Kubernetes",
      { source: "job", jobId: "job-2" },
      0.8,
    ),
  ],
  citations: [],
  retrievedChunkIds: ["resume-chunk-0", "job-2-chunk-0"],
};

describe("completeFromRetrievedContext", () => {
  it("answers fit questions with a structured verdict instead of dumping chunks", () => {
    const prompt = buildGroundedPrompt(
      "Is this candidate okay for the selected job?",
      retrieval,
    );
    const answer = completeFromRetrievedContext(prompt);

    expect(answer).toContain("Resume highlights");
    expect(answer.toLowerCase()).toContain("typescript");
    expect(answer).not.toContain("Based only on the retrieved documents:");
    expect(answer).not.toContain("[resume | resume-chunk-0]");
  });

  it("lists missing skills for gap questions", () => {
    const prompt = buildGroundedPrompt(
      "What skills am I missing for this role?",
      retrieval,
    );
    const answer = completeFromRetrievedContext(prompt);

    expect(answer.toLowerCase()).toContain("kubernetes");
    expect(answer.toLowerCase()).toContain("relevant skills still present");
    expect(answer.toLowerCase()).toContain("typescript");
  });

  it("recognizes core frontend stack for Job 1 fit reads", () => {
    const frontendRetrieval: RetrievalResult = {
      query: "Is this candidate okay for the selected job?",
      selectedJobId: "job-1",
      selectedCandidateId: "candidate-1",
      chunks: [
        scored(
          "candidate-1-chunk-0",
          `# Alex Morgan

## Core Skills

- TypeScript
- React
- Next.js
- Jest
- Redux
- Accessibility (WCAG)

Partnered closely with product managers and designers on patient-facing UI.`,
          { source: "resume", candidateId: "candidate-1" },
          0.9,
        ),
        scored(
          "job-1-chunk-0",
          `# Job 1 — Frontend Engineer

## Summary

Northstar Health is hiring a Frontend Engineer to build patient-facing experiences in React and TypeScript.

## Requirements

- Experience with design systems
- Accessibility best practices
- State management
- Frontend testing
- Collaboration with product and design`,
          { source: "job", jobId: "job-1" },
          0.8,
        ),
      ],
      citations: [],
      retrievedChunkIds: ["candidate-1-chunk-0", "job-1-chunk-0"],
    };

    const answer = completeFromRetrievedContext(
      buildGroundedPrompt("Is this candidate okay for the selected job?", frontendRetrieval),
    );

    expect(answer.toLowerCase()).toMatch(/strong fit|solid fit/);
    expect(answer.toLowerCase()).toContain("react");
    expect(answer.toLowerCase()).toContain("typescript");
  });
});
