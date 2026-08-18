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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
