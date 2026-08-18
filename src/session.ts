import {
  allocateJobId,
  chunkDocuments,
  loadDocumentFromUpload,
  loadSampleDocuments,
} from "@/src/ingest";
import { createLlm, resolveLlmProvider } from "@/src/llm";
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
  const resumes = docs.filter(
    (document): document is ResumeDocument => document.source === "resume",
  );

  return {
    resume: resumes[0] ?? null,
    jobs: docs.filter((document): document is JobDocument => document.source === "job"),
  };
}

async function rebuildStore(llm: Llm): Promise<InMemoryVectorStore> {
  const chunks = chunkDocuments(documents);
  store = await buildVectorStoreFromChunks(chunks, llm);
  return store;
}

async function defaultLlm(llm?: Llm): Promise<Llm> {
  return llm ?? createLlm(await resolveLlmProvider());
}

export async function ensureSession(llm?: Llm): Promise<{
  documents: CareerDocument[];
  store: InMemoryVectorStore;
}> {
  const resolved = await defaultLlm(llm);
  if (!initialized) {
    documents = await loadSampleDocuments();
    initialized = true;
    await rebuildStore(resolved);
  }

  if (!store) {
    await rebuildStore(resolved);
  }

  return { documents, store: store! };
}

export async function getSessionStore(llm?: Llm): Promise<InMemoryVectorStore> {
  const session = await ensureSession(llm);
  return session.store;
}

export async function getDocumentsState(llm?: Llm): Promise<DocumentsState> {
  await ensureSession(llm);
  return toDocumentsState(documents);
}

export async function replaceResume(
  fileName: string,
  buffer: Buffer,
  llm?: Llm,
): Promise<DocumentsState> {
  const resolved = await defaultLlm(llm);
  await ensureSession(resolved);
  const resume = await loadDocumentFromUpload(fileName, buffer, "resume", "candidate-1");
  documents = [...documents.filter((document) => document.source !== "resume"), resume];
  await rebuildStore(resolved);
  return toDocumentsState(documents);
}

/** @deprecated Use replaceResume. */
export async function addCandidate(
  fileName: string,
  buffer: Buffer,
  llm?: Llm,
): Promise<DocumentsState> {
  return replaceResume(fileName, buffer, llm);
}

export async function addJob(
  fileName: string,
  buffer: Buffer,
  llm?: Llm,
): Promise<DocumentsState> {
  const resolved = await defaultLlm(llm);
  await ensureSession(resolved);
  const existingJobIds = documents
    .filter((document): document is JobDocument => document.source === "job")
    .map((document) => document.jobId);
  const jobId = allocateJobId(existingJobIds, fileName);
  const job = await loadDocumentFromUpload(fileName, buffer, "job", jobId);
  documents = [...documents, job];
  await rebuildStore(resolved);
  return toDocumentsState(documents);
}

export function resetSession(): void {
  documents = [];
  store = null;
  initialized = false;
}
