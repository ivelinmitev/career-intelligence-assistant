# Research: Career Intelligence Assistant

## Embeddings

- **Decision**: `Llm.embed` with a deterministic local hasher for tests; Ollama `nomic-embed-text` or Gemini `text-embedding-004` when configured.
- **Rationale**: Assignment forbids requiring paid OpenAI. Local embeddings make CI and `npm test` work offline.
- **Alternatives**: `@xenova/transformers` MiniLM (allowed, first-run download); skipped for now to keep tests fast and gitignore-friendly.

## Vector store

- **Decision**: In-process array + cosine similarity.
- **Rationale**: Few chunks; no Pinecone; restart-reset is acceptable.
- **Alternatives**: Chroma JS client — extra service, not needed.

## LLM completion

- **Decision**: Same `Llm` interface. Local completer echoes retrieved context. Ollama `/api/generate`. Gemini `generateContent`.
- **Rationale**: Reviewer can demo without keys; fluent answers when a provider is set.
- **Alternatives**: Fake canned answers with no retrieval — rejected (fake RAG).

## Orchestration

- **Decision**: Custom retrieve → prompt → generate.
- **Rationale**: Constitution bans defaulting to LangChain.
- **Alternatives**: LangChain / LlamaIndex — heavier, hides the thought process the assignment grades.

## Uploads

- **Decision**: Multipart POST, parse in memory, rebuild session vectors.
- **Rationale**: Take-home persistence. No object storage.
- **Alternatives**: Disk cache of uploads — extra cleanup, easy to commit secrets/PII by mistake.
