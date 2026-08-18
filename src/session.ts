import {
  allocateJobId,
  chunkDocuments,
  loadDocumentFromUpload,
  loadSampleDocuments,
} from "@/src/ingest";
import { createLlmFromEnv } from "@/src/llm";
import { buildVectorStoreFromChunks } from "@/src/retrieve";
import type {
  CareerDocument,
  DocumentsState,
  JobDocument,
  Llm,
  ResumeDocument,
} from "@/src/types";
import { InMemoryVectorStore } from "@/src/vector-store";

let documents: CareerDocument[] = [];
let store: InMemoryVectorStore | null = null;
let initialized = false;

function toDocumentsState(docs: CareerDocument[]): DocumentsState {
  return {
    resume: docs.find((document): document is ResumeDocument => document.source === "resume") ?? null,
    jobs: docs.filter((document): document is JobDocument => document.source === "job"),
  };
}

async function rebuildStore(llm: Llm): Promise<InMemoryVectorStore> {
  const chunks = chunkDocuments(documents);
  store = await buildVectorStoreFromChunks(chunks, llm);
  return store;
}

export async function ensureSession(llm: Llm = createLlmFromEnv()): Promise<{
  documents: CareerDocument[];
  store: InMemoryVectorStore;
}> {
  if (!initialized) {
    documents = await loadSampleDocuments();
    initialized = true;
    await rebuildStore(llm);
  }

  if (!store) {
    await rebuildStore(llm);
  }

  return { documents, store: store! };
}

export async function getSessionStore(llm: Llm = createLlmFromEnv()): Promise<InMemoryVectorStore> {
  const session = await ensureSession(llm);
  return session.store;
}

export async function getDocumentsState(
  llm: Llm = createLlmFromEnv(),
): Promise<DocumentsState> {
  await ensureSession(llm);
  return toDocumentsState(documents);
}

export async function replaceResume(
  fileName: string,
  buffer: Buffer,
  llm: Llm = createLlmFromEnv(),
): Promise<DocumentsState> {
  await ensureSession(llm);
  const resume = await loadDocumentFromUpload(fileName, buffer, "resume");
  documents = [resume, ...documents.filter((document) => document.source !== "resume")];
  await rebuildStore(llm);
  return toDocumentsState(documents);
}

export async function addJob(
  fileName: string,
  buffer: Buffer,
  llm: Llm = createLlmFromEnv(),
): Promise<DocumentsState> {
  await ensureSession(llm);
  const existingJobIds = documents
    .filter((document): document is JobDocument => document.source === "job")
    .map((document) => document.jobId);
  const jobId = allocateJobId(existingJobIds, fileName);
  const job = await loadDocumentFromUpload(fileName, buffer, "job", jobId);
  documents = [...documents, job];
  await rebuildStore(llm);
  return toDocumentsState(documents);
}

export function resetSession(): void {
  documents = [];
  store = null;
  initialized = false;
}
