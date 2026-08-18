export type DocumentSource = "resume" | "job";

export type LlmProvider = "ollama" | "gemini" | "local";

export interface BaseDocument {
  id: string;
  title: string;
  fileName: string;
  text: string;
  createdAt: string;
}

export interface ResumeDocument extends BaseDocument {
  source: "resume";
  candidateId: string;
}

export interface JobDocument extends BaseDocument {
  source: "job";
  jobId: string;
  company: string;
}

export type CareerDocument = ResumeDocument | JobDocument;

export interface DocumentsState {
  resume: ResumeDocument | null;
  jobs: JobDocument[];
}

export interface ChunkMetadata {
  source: DocumentSource;
  documentId: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  title: string;
  jobId?: string;
  candidateId?: string;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface Citation {
  chunkId: string;
  source: DocumentSource;
  title: string;
  quote: string;
  jobId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  selectedJobId?: string;
  selectedCandidateId?: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  selectedJobId?: string;
  selectedCandidateId?: string;
  retrievedChunkIds: string[];
  provider: LlmProvider;
  latencyMs: number;
}

export interface Llm {
  embed(texts: string[]): Promise<number[][]>;
  complete(prompt: string): Promise<string>;
}

export interface EmbeddedChunk {
  chunk: DocumentChunk;
  embedding: number[];
}

export interface RetrievalRequest {
  query: string;
  selectedJobId?: string;
  selectedCandidateId?: string;
  availableJobIds?: string[];
}

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
}

export interface RetrievalResult {
  query: string;
  selectedJobId: string;
  selectedCandidateId: string;
  chunks: ScoredChunk[];
  citations: Citation[];
  retrievedChunkIds: string[];
}
