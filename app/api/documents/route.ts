import { NextResponse } from "next/server";

import { isSupportedDocumentPath } from "@/src/parse";
import { addJob, getDocumentsState, replaceResume } from "@/src/session";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function GET() {
  try {
    const documents = await getDocumentsState();
    return NextResponse.json(documents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");

    if (kind !== "resume" && kind !== "job") {
      return NextResponse.json(
        { error: "Expected kind to be resume or job." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
    }

    if (!isSupportedDocumentPath(file.name)) {
      return NextResponse.json(
        { error: "Supported file types are PDF, TXT, and Markdown." },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Keep uploads under 2 MB for this take-home." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const documents =
      kind === "resume"
        ? await replaceResume(file.name, buffer)
        : await addJob(file.name, buffer);

    return NextResponse.json({
      uploaded: kind,
      ...documents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
