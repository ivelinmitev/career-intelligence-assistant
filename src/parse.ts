import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown"]);

export function isSupportedDocumentPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".pdf" || TEXT_EXTENSIONS.has(ext);
}

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

export async function parseDocumentFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === ".pdf") {
    return parsePdf(buffer);
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported file type: ${ext || "(none)"}`);
}

export async function parseDocumentBuffer(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".pdf") {
    return parsePdf(buffer);
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported file type: ${ext || "(none)"}`);
}
