import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "not-implemented",
    message: "Document ingestion route will be added in the next step.",
  });
}
