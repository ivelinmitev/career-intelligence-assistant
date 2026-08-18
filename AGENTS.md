# AGENTS.md

This repository is an **AI-native, spec-driven** Career Intelligence Assistant.

## Operating model

1. Read `.specify/memory/constitution.md`.
2. Read the active feature under `specs/` (`spec.md`, then `plan.md`, then `tasks.md`).
3. Implement only the next incomplete tasks. Mark them done in `tasks.md`.
4. Keep the `Llm` boundary, job-scoped retrieval, and grounded-generation guardrails intact.
5. Run `npm test` after behavior changes.
6. Commit in small logical steps. Do not add Cursor co-author trailers.

## Product

One resume compared to several job descriptions in a 3-pane UI. Chat is RAG: retrieve resume + selected job chunks, then generate with citations.

## Layout

- `app/` — Next.js App Router UI and route handlers
- `src/` — ingest, retrieve, generate, session, observe, types
- `sample-data/` — fake resume and jobs (no real PII)
- `specs/` — feature specifications, plans, contracts, tasks
- `.specify/memory/` — constitution
- `.cursor/rules/` and `.cursor/skills/` — agent guidance

## Commands

```bash
npm run dev
npm test
npm run inspect:ingest
npm run verify:retrieval
npm run verify:upload
npm run example:chat
```

## New work

Create `specs/NNN-short-name/` with `spec.md` before coding. Use the `add-feature-spec` skill. Implement with the `implement-from-spec` skill.

Do not add auth, LangChain, Pinecone, or paid-OpenAI-only paths unless the spec and constitution are amended first.
