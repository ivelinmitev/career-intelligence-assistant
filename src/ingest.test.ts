import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { chunkDocument } from "@/src/ingest";
import type { JobDocument } from "@/src/types";

describe("chunkDocument", () => {
  it("splits a sample job description into job-scoped chunks", async () => {
    const text = await readFile(
      path.join(process.cwd(), "sample-data/jobs/job-2-ai-product-engineer.md"),
      "utf8",
    );

    const document: JobDocument = {
      id: "job-2",
      jobId: "job-2",
      source: "job",
      title: "AI Product Engineer",
      company: "SignalForge",
      fileName: "job-2-ai-product-engineer.md",
      createdAt: "2026-08-18T09:00:00.000Z",
      text,
    };

    const chunks = chunkDocument(document, { chunkSize: 160, overlap: 40 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.metadata.source === "job")).toBe(true);
    expect(chunks.every((chunk) => chunk.metadata.jobId === "job-2")).toBe(true);
    expect(chunks.some((chunk) => chunk.text.includes("SignalForge"))).toBe(true);
    expect(chunks.map((chunk) => chunk.text).join("\n")).toMatch(/Vector search/);
    expect(chunks[0]?.metadata.chunkIndex).toBe(0);
    expect(chunks.at(-1)?.metadata.chunkIndex).toBe(chunks.length - 1);
  });
});
