import { readFile } from "node:fs/promises";
import path from "node:path";

import { createLlm } from "@/src/llm";
import { retrieveForJob } from "@/src/retrieve";
import {
  addJob,
  getDocumentsState,
  replaceResume,
  resetSession,
  getSessionStore,
} from "@/src/session";

async function main() {
  resetSession();
  const llm = createLlm("local");
  const fixturesDir = path.join(process.cwd(), "scripts", "fixtures");

  const resumeBuffer = await readFile(path.join(fixturesDir, "uploaded-resume.md"));
  const jobBuffer = await readFile(path.join(fixturesDir, "uploaded-job.md"));

  await replaceResume("uploaded-resume.md", resumeBuffer, llm);
  await addJob("uploaded-job.md", jobBuffer, llm);

  const state = await getDocumentsState(llm);
  const store = await getSessionStore(llm);
  const result = await retrieveForJob(
    store,
    {
      query: "How does my experience align with Job 4?",
      selectedJobId: "job-4",
    },
    llm,
  );

  console.log("=== Uploaded documents ===");
  console.log(
    JSON.stringify(
      {
        resume: {
          id: state.resume?.id,
          title: state.resume?.title,
          fileName: state.resume?.fileName,
        },
        jobs: state.jobs.map((job) => ({
          jobId: job.jobId,
          title: job.title,
          company: job.company,
        })),
      },
      null,
      2,
    ),
  );
  console.log("");
  console.log("=== Retrieval for Job 4 ===");
  console.log(
    JSON.stringify(
      {
        selectedJobId: result.selectedJobId,
        retrievedChunkIds: result.retrievedChunkIds,
        citationSources: result.citations.map((citation) => ({
          chunkId: citation.chunkId,
          source: citation.source,
          jobId: citation.jobId,
          title: citation.title,
        })),
        leakedJob1: result.citations.some((citation) => citation.jobId === "job-1"),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
