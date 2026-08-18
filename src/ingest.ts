import fs from "node:fs/promises";
import path from "node:path";

import { parseDocumentBuffer, parseDocumentFile } from "@/src/parse";
import type {
  CareerDocument,
  DocumentChunk,
  JobDocument,
  ResumeDocument,
} from "@/src/types";

export interface ChunkingOptions {
  chunkSize: number;
  overlap: number;
}

export const defaultChunkingOptions: ChunkingOptions = {
  chunkSize: 900,
  overlap: 120,
};

export interface IngestResult {
  documents: CareerDocument[];
  chunks: DocumentChunk[];
}

export interface IngestInspection {
  documentCount: number;
  chunkCount: number;
  documents: Array<{
    id: string;
    source: CareerDocument["source"];
    title: string;
    fileName: string;
    jobId?: string;
    textLength: number;
    chunkCount: number;
  }>;
  chunks: Array<{
    id: string;
    source: DocumentChunk["metadata"]["source"];
    jobId?: string;
    title: string;
    chunkIndex: number;
    textPreview: string;
  }>;
}

const SAMPLE_DATA_DIR = path.join(process.cwd(), "sample-data");

function jobIdFromFileName(fileName: string): string {
  const match = fileName.match(/^job-(\d+)/i);
  if (match) {
    return `job-${match[1]}`;
  }

  return path.basename(fileName, path.extname(fileName));
}

export function allocateCandidateId(existingCandidateIds: string[]): string {
  const numbers = existingCandidateIds
    .map((id) => {
      const match = id.match(/^candidate-(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => value > 0);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `candidate-${next}`;
}

export function allocateJobId(existingJobIds: string[], fileName: string): string {
  const fromName = jobIdFromFileName(fileName).toLowerCase();
  if (/^job-\d+$/.test(fromName) && !existingJobIds.includes(fromName)) {
    return fromName;
  }

  const numbers = existingJobIds
    .map((id) => {
      const match = id.match(/^job-(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => value > 0);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `job-${next}`;
}

function titleFromMarkdownHeading(text: string, fallback: string): string {
  const match = text.match(/^#\s*(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}

function companyFromMarkdown(text: string): string {
  const match = text.match(/##\s*Company\s*\n+([^\n#]+)/i);
  return match?.[1]?.trim() ?? "Unknown company";
}

function jobTitleFromMarkdown(text: string, fileName: string): string {
  const match = text.match(/^#\s*Job\s*\d+\s*[—-]\s*(.+)$/im);
  if (match?.[1]) {
    return match[1].trim();
  }

  return titleFromMarkdownHeading(text, path.basename(fileName, path.extname(fileName)));
}

export function chunkText(
  text: string,
  options: ChunkingOptions = defaultChunkingOptions,
): Array<{ text: string; startChar: number; endChar: number }> {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const { chunkSize, overlap } = options;
  const chunks: Array<{ text: string; startChar: number; endChar: number }> = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const paragraphBreak = slice.lastIndexOf("\n\n");
      const sentenceBreak = slice.lastIndexOf(". ");

      if (paragraphBreak > chunkSize * 0.4) {
        end = start + paragraphBreak + 2;
      } else if (sentenceBreak > chunkSize * 0.4) {
        end = start + sentenceBreak + 2;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push({
        text: chunk,
        startChar: start,
        endChar: end,
      });
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function chunkDocument(
  document: CareerDocument,
  options: ChunkingOptions = defaultChunkingOptions,
): DocumentChunk[] {
  const textChunks = chunkText(document.text, options);

  return textChunks.map((chunk, index) => ({
    id: `${document.id}-chunk-${index}`,
    text: chunk.text,
    metadata: {
      source: document.source,
      documentId: document.id,
      chunkIndex: index,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      title: document.title,
      ...(document.source === "job"
        ? { jobId: document.jobId }
        : { candidateId: document.candidateId }),
    },
  }));
}

export function chunkDocuments(
  documents: CareerDocument[],
  options: ChunkingOptions = defaultChunkingOptions,
): DocumentChunk[] {
  return documents.flatMap((document) => chunkDocument(document, options));
}

async function readResumeDocument(
  filePath: string,
  candidateId: string,
): Promise<ResumeDocument> {
  const fileName = path.basename(filePath);
  const text = await parseDocumentFile(filePath);
  const title = titleFromMarkdownHeading(text, "Sample resume");

  return {
    id: candidateId,
    candidateId,
    source: "resume",
    title,
    fileName,
    text,
    createdAt: new Date().toISOString(),
  };
}

async function readJobDocument(filePath: string): Promise<JobDocument> {
  const fileName = path.basename(filePath);
  const text = await parseDocumentFile(filePath);
  const jobId = jobIdFromFileName(fileName);

  return {
    id: jobId,
    jobId,
    source: "job",
    title: jobTitleFromMarkdown(text, fileName),
    company: companyFromMarkdown(text),
    fileName,
    text,
    createdAt: new Date().toISOString(),
  };
}

export async function loadSampleDocuments(): Promise<CareerDocument[]> {
  const resumeDir = path.join(SAMPLE_DATA_DIR, "resume");
  const jobsDir = path.join(SAMPLE_DATA_DIR, "jobs");

  const resumeFiles = (await fs.readdir(resumeDir))
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt") || file.endsWith(".pdf"))
    .sort();

  if (resumeFiles.length === 0) {
    throw new Error(`No resume sample found in ${resumeDir}`);
  }

  const resume = await readResumeDocument(
    path.join(resumeDir, resumeFiles[0]!),
    "candidate-1",
  );

  const jobFiles = (await fs.readdir(jobsDir))
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt") || file.endsWith(".pdf"))
    .sort();

  if (jobFiles.length < 2) {
    throw new Error(`Expected at least 2 job samples in ${jobsDir}`);
  }

  const jobs = await Promise.all(
    jobFiles.map((file) => readJobDocument(path.join(jobsDir, file))),
  );

  return [resume, ...jobs];
}

export async function loadDocumentFromUpload(
  fileName: string,
  buffer: Buffer,
  kind: "resume" | "job",
  id?: string,
): Promise<CareerDocument> {
  const text = await parseDocumentBuffer(fileName, buffer);
  const createdAt = new Date().toISOString();

  if (kind === "resume") {
    const candidateId = id ?? "candidate-uploaded";
    return {
      id: candidateId,
      candidateId,
      source: "resume",
      title: titleFromMarkdownHeading(text, fileName),
      fileName,
      text,
      createdAt,
    };
  }

  const resolvedJobId = id ?? jobIdFromFileName(fileName);

  return {
    id: resolvedJobId,
    jobId: resolvedJobId,
    source: "job",
    title: jobTitleFromMarkdown(text, fileName),
    company: companyFromMarkdown(text),
    fileName,
    text,
    createdAt,
  };
}

export async function ingestSampleData(
  options: ChunkingOptions = defaultChunkingOptions,
): Promise<IngestResult> {
  const documents = await loadSampleDocuments();
  const chunks = chunkDocuments(documents, options);

  return { documents, chunks };
}

export function inspectIngest(result: IngestResult): IngestInspection {
  const chunksByDocument = new Map<string, DocumentChunk[]>();

  for (const chunk of result.chunks) {
    const existing = chunksByDocument.get(chunk.metadata.documentId) ?? [];
    existing.push(chunk);
    chunksByDocument.set(chunk.metadata.documentId, existing);
  }

  return {
    documentCount: result.documents.length,
    chunkCount: result.chunks.length,
    documents: result.documents.map((document) => ({
      id: document.id,
      source: document.source,
      title: document.title,
      fileName: document.fileName,
      ...(document.source === "job" ? { jobId: document.jobId } : {}),
      textLength: document.text.length,
      chunkCount: chunksByDocument.get(document.id)?.length ?? 0,
    })),
    chunks: result.chunks.map((chunk) => ({
      id: chunk.id,
      source: chunk.metadata.source,
      ...(chunk.metadata.jobId ? { jobId: chunk.metadata.jobId } : {}),
      title: chunk.metadata.title,
      chunkIndex: chunk.metadata.chunkIndex,
      textPreview: `${chunk.text.slice(0, 140)}${chunk.text.length > 140 ? "…" : ""}`,
    })),
  };
}

export function formatIngestInspection(result: IngestResult): string {
  const inspection = inspectIngest(result);
  const lines = [
    `Documents: ${inspection.documentCount}`,
    `Chunks: ${inspection.chunkCount}`,
    "",
    "Documents:",
  ];

  for (const document of inspection.documents) {
    const jobLabel = document.jobId ? `, jobId=${document.jobId}` : "";
    lines.push(
      `- ${document.id} (${document.source}${jobLabel}) | ${document.title} | ${document.chunkCount} chunks | ${document.textLength} chars`,
    );
  }

  lines.push("", "Chunks:");
  for (const chunk of inspection.chunks) {
    const jobLabel = chunk.jobId ? `, jobId=${chunk.jobId}` : "";
    lines.push(
      `- ${chunk.id} (${chunk.source}${jobLabel}, index=${chunk.chunkIndex})`,
    );
    lines.push(`  ${chunk.textPreview}`);
  }

  return lines.join("\n");
}
