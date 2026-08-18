# Implementation Plan: Career Intelligence Assistant

**Branch**: `001-career-intelligence-assistant` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-career-intelligence-assistant/spec.md`

## Summary

Next.js App Router app that ingests one resume and several jobs, embeds chunks locally (or via Ollama/Gemini), retrieves job-scoped context, and generates a grounded answer with citations. UI is one 3-pane screen. Session state is in-process.

## Technical Context

**Language/Version**: TypeScript (strict), Node 22, React 19, Next.js 16 App Router

**Primary Dependencies**: `next`, `react`, `pdf-parse`; LLM via `fetch` to Ollama or Gemini; local hash embeddings for $0 tests

**Storage**: In-memory document session + in-memory vector list (cosine). No database.

**Testing**: Vitest (`npm test`)

**Target Platform**: Local developer machine; optional later Docker for the Next app only

**Project Type**: fullstack web application (UI + route handlers in one repo)

**Performance Goals**: Sample ingest and local retrieval in well under a second; first remote model call may be slow

**Constraints**: No paid OpenAI; no LangChain/Pinecone; no auth; zip-friendly (ignore caches, secrets, models)

**Scale/Scope**: One user, one resume, a handful of jobs, one main screen

## Constitution Check

- Spec first: this folder is the source of truth for Option 4.
- Job-scoped retrieval: `retrieveForJob` metadata filter.
- Grounded generation: `generateAnswer` refuses on empty retrieval.
- Swappable `Llm`: `src/llm.ts`.
- Custom RAG: `src/ingest.ts` → `src/retrieve.ts` → `src/generate.ts`.
- Observable: `src/observe.ts`.
- Human README: not generated here.

No constitution violations. Complexity tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-career-intelligence-assistant/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── page.tsx
├── career-workspace.tsx
└── api/{chat,documents}/route.ts
src/
├── types.ts
├── parse.ts
├── ingest.ts
├── embeddings.ts
├── llm.ts
├── vector-store.ts
├── retrieve.ts
├── generate.ts
├── session.ts
├── observe.ts
└── *.test.ts
sample-data/
scripts/
```

**Structure Decision**: Single Next.js project. RAG lives in `src/`, HTTP in `app/api/`, UI in `app/`.

## Current implementation status

Implemented: ingest, retrieval, chat API, 3-pane UI, uploads, focused tests, JSON chat logs.

Not implemented (follow-on): Docker image, submission README (human), screenshot capture, production persistence.
