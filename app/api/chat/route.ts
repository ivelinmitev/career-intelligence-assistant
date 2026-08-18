import { NextResponse } from "next/server";

import { answerQuestion } from "@/src/chat";
import type { ChatRequest } from "@/src/types";

function isChatRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<ChatRequest>;
  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return false;
  }

  if (
    body.selectedJobId !== undefined &&
    typeof body.selectedJobId !== "string"
  ) {
    return false;
  }

  if (
    body.selectedCandidateId !== undefined &&
    typeof body.selectedCandidateId !== "string"
  ) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isChatRequest(body)) {
      return NextResponse.json(
        {
          error:
            "Expected JSON with a non-empty message and optional selectedJobId.",
        },
        { status: 400 },
      );
    }

    const result = await answerQuestion({
      message: body.message,
      selectedJobId: body.selectedJobId,
      selectedCandidateId: body.selectedCandidateId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Chat failed";
    const status = message.includes("Could not resolve a target job")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
