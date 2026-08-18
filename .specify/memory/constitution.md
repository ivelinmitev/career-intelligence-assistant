# Career Intelligence Assistant Constitution

This constitution governs every spec, plan, task, and code change. Agents treat it as non-negotiable unless a later amendment explicitly replaces a clause.

## Core Principles

### I. Spec first, code second

Do not add product behavior without a spec. New work starts in `specs/`, then plan, then tasks, then implementation. If code and spec disagree, update the spec first or revert the code.

### II. Job-scoped retrieval

Resume chunks may mix with one selected job. Job 1 chunks must never appear in a Job 2 answer. Resolve the target job from an explicit mention (`Job 2`) before the UI `selectedJobId`.

### III. Grounded generation

Answers come only from retrieved context. Do not invent skills or requirements. Empty retrieval must refuse: the answer is not in the uploaded or provided documents.

### IV. Swappable intelligence

All model calls go through the `Llm` interface (`embed` + `complete`). Default path must run with local embeddings/completion, Ollama, or free Gemini. Do not hard-require paid OpenAI.

### V. Custom RAG, minimal stack

Orchestrate retrieve → prompt → generate in this repo. Do not add LangChain, Pinecone, auth, multi-user, or cloud deployment unless a spec explicitly changes that boundary.

### VI. Simple beats clever

A working, readable loop beats an over-engineered one. In-process storage is correct for this take-home. Prefer a few focused tests over a large harness.

### VII. Observable by default

Chat must log question, selected job id, retrieved chunk ids, provider, and latency. Keep it a single JSON line. No monitoring platform unless specified.

### VIII. Human-owned narrative

Agents must not write the submission README in polished first-person prose. Specs, comments, and outlines are fine. The candidate writes the README.

## Stack lock

- Next.js App Router, React, TypeScript, Node route handlers
- `pdf-parse` for PDFs; markdown/text as the working path
- In-memory vector store + cosine similarity
- Vitest for focused tests

## Anti-patterns

- Fake RAG (LLM answering without retrieval)
- Dumping resume + all JDs into one undifferentiated context
- Secrets, model weights, or `.env` in git
- `Co-authored-by: Cursor` or `cursoragent` in commits

## Governance

1. Every feature folder under `specs/` must include `spec.md`. `plan.md` and `tasks.md` are required before implementation.
2. Constitution check happens during planning. Violations need a Complexity Tracking table in the plan.
3. Amendments require updating this file, the date below, and any dependent agent rules.

**Version**: 1.0.0 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-08-18
