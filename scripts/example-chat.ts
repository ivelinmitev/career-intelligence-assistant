import { answerQuestion } from "@/src/chat";
import { createLlm } from "@/src/llm";
import { buildSampleVectorStore } from "@/src/retrieve";

async function main() {
  const llm = createLlm("local");
  const store = await buildSampleVectorStore(llm);
  const request = {
    message: "How does my experience align with Job 2?",
    selectedJobId: "job-2",
  };

  const response = await answerQuestion(request, { llm, store });

  console.log("=== Request ===");
  console.log(JSON.stringify(request, null, 2));
  console.log("");
  console.log("=== Response ===");
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
