import { describe, expect, it } from "vitest";

import { formatChatLog } from "@/src/observe";

describe("formatChatLog", () => {
  it("includes question, job id, chunk ids, provider, and latency", () => {
    const line = formatChatLog({
      question: "How does my experience align with Job 2?",
      selectedJobId: "job-2",
      retrievedChunkIds: ["resume-sample-chunk-0", "job-2-chunk-0"],
      provider: "local",
      latencyMs: 12,
    });

    expect(JSON.parse(line)).toEqual({
      event: "chat",
      question: "How does my experience align with Job 2?",
      selectedJobId: "job-2",
      retrievedChunkIds: ["resume-sample-chunk-0", "job-2-chunk-0"],
      provider: "local",
      latencyMs: 12,
    });
  });
});
