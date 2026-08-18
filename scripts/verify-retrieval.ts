import { createLlm } from "@/src/llm";
import {
  buildSampleVectorStore,
  formatRetrievalResult,
  retrieveForJob,
} from "@/src/retrieve";

async function main() {
  const llm = createLlm("local");
  const store = await buildSampleVectorStore(llm);

  const jobTwoResult = await retrieveForJob(
    store,
    {
      query: "How does my experience align with Job 2?",
      selectedJobId: "job-2",
    },
    llm,
  );

  const leakedJobOne = jobTwoResult.chunks.some(
    ({ chunk }) => chunk.metadata.jobId === "job-1",
  );

  console.log("=== Job 2 retrieval ===");
  console.log(formatRetrievalResult(jobTwoResult));
  console.log("");
  console.log(`Job 1 leakage detected: ${leakedJobOne ? "YES" : "NO"}`);

  if (leakedJobOne) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
