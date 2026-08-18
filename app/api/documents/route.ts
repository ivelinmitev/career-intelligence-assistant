import { NextResponse } from "next/server";

import { ingestSampleData, inspectIngest } from "@/src/ingest";

export async function GET() {
  try {
    const result = await ingestSampleData();
    return NextResponse.json(inspectIngest(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
