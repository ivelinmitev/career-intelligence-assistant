import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { allocateJobId } from "@/src/ingest";
import { createLlm } from "@/src/llm";
import { retrieveForJob } from "@/src/retrieve";
import {
  addJob,
  getDocumentsState,
  getSessionStore,
  replaceResume,
  resetSession,
} from "@/src/session";

const fixturesDir = path.join(process.cwd(), "scripts", "fixtures");

afterEach(() => {
  resetSession();
});

describe("allocateJobId", () => {
  it("keeps unused job-N filenames and otherwise increments", () => {
    expect(allocateJobId(["job-1", "job-2"], "job-3-extra.md")).toBe("job-3");
    expect(allocateJobId(["job-1", "job-2"], "job-2-repeat.md")).toBe("job-3");
    expect(allocateJobId(["job-1", "job-2", "job-3"], "warehouse.md")).toBe("job-4");
  });
});

describe("document session uploads", () => {
  it("replaces the resume and adds a new job without mixing Job 1 chunks", async () => {
    const llm = createLlm("local");
    const resumeBuffer = await readFile(path.join(fixturesDir, "uploaded-resume.md"));
    const jobBuffer = await readFile(path.join(fixturesDir, "uploaded-job.md"));

    await replaceResume("uploaded-resume.md", resumeBuffer, llm);
    await addJob("uploaded-job.md", jobBuffer, llm);

    const state = await getDocumentsState(llm);
    expect(state.resume?.title).toContain("Jordan Lee");
    expect(state.jobs.map((job) => job.jobId)).toContain("job-4");

    const jobFour = state.jobs.find((job) => job.jobId === "job-4");
    expect(jobFour?.title).toBe("Warehouse Robotics Engineer");

    const store = await getSessionStore(llm);
    const result = await retrieveForJob(
      store,
      {
        query: "What skills am I missing for Job 4?",
        selectedJobId: "job-4",
      },
      llm,
    );

    expect(result.selectedJobId).toBe("job-4");
    expect(result.citations.some((citation) => citation.quote.includes("Jordan Lee"))).toBe(
      true,
    );
    expect(result.citations.some((citation) => citation.jobId === "job-4")).toBe(true);
    expect(result.citations.every((citation) => citation.jobId !== "job-1")).toBe(true);
  });
});
