import {
  formatIngestInspection,
  ingestSampleData,
} from "@/src/ingest";

async function main() {
  const result = await ingestSampleData();
  console.log(formatIngestInspection(result));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
