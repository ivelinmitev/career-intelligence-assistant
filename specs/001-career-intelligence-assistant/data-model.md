# Data Model: Career Intelligence Assistant

## ResumeDocument

- `id`, `source: "resume"`, `title`, `fileName`, `text`, `createdAt`
- Cardinality: at most one in the session (replace, do not append)

## JobDocument

- `id`, `jobId`, `source: "job"`, `title`, `company`, `fileName`, `text`, `createdAt`
- `jobId` is `job-{n}` and is how users say "Job 2"
- Cardinality: 2+ expected; uploads append

## DocumentChunk

- `id` (`{documentId}-chunk-{index}`)
- `text`
- `metadata`: `source`, `documentId`, `chunkIndex`, `startChar`, `endChar`, `title`, optional `jobId`

## EmbeddedChunk

- `chunk` + `embedding: number[]`

## Citation

- `chunkId`, `source`, `title`, `quote`, optional `jobId`

## ChatRequest

- `message` (required)
- `selectedJobId` (optional)
- `history` reserved, unused

## ChatResponse

- `answer`, `citations[]`
- Debug: `selectedJobId`, `retrievedChunkIds`, `provider`, `latencyMs`

## Session

- Process-local list of `CareerDocument` plus rebuilt `InMemoryVectorStore`
- Sample data seeds the session; uploads mutate it; process restart restores samples

## Validation rules

- Resume chunks MUST NOT include `jobId`
- Job chunks MUST include `jobId`
- Retrieval candidate set = resume chunks ∪ chunks where `jobId === selectedJobId`
