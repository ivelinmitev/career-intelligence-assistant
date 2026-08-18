---
description: Task list for Career Intelligence Assistant
---

# Tasks: Career Intelligence Assistant

**Input**: Design documents from `/specs/001-career-intelligence-assistant/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup

- [x] T001 Create Next.js App Router + TypeScript project scaffold
- [x] T002 Add `.env.example` and `.gitignore` for env, `.next`, caches, models
- [x] T003 Add sample resume and 2–3 fake job markdown files

## Phase 2: Foundational

- [x] T004 Define Document / Chunk / Citation / Chat / Llm types in `src/types.ts`
- [x] T005 Implement `Llm` with local, Ollama, and Gemini in `src/llm.ts`
- [x] T006 Implement parse + chunk with job metadata in `src/parse.ts` and `src/ingest.ts`
- [x] T007 Implement in-memory vectors and job-scoped retrieve in `src/vector-store.ts` and `src/retrieve.ts`
- [x] T008 Implement grounded generate + empty refusal in `src/generate.ts`

## Phase 3: User Story 1 — Compare resume to selected job (P1)

- [x] T009 [US1] Chat API `app/api/chat/route.ts` + `src/chat.ts`
- [x] T010 [US1] Retrieval test: Job 2 does not return Job 1 (`src/retrieve.test.ts`)
- [x] T011 [US1] 3-pane UI with Job 2 happy path (`app/career-workspace.tsx`)

## Phase 4: User Story 2 — Skill gaps and interview prep (P1)

- [x] T012 [US2] Suggested prompt chips including Job 2 interview prep
- [x] T013 [US2] Job resolver prefers `"Job N"` in the message (`src/job-resolver.ts`)

## Phase 5: User Story 3 — Uploads (P2)

- [x] T014 [US3] Session replace-resume / add-job in `src/session.ts`
- [x] T015 [US3] `GET|POST /api/documents`
- [x] T016 [US3] UI file inputs + `verify:upload`

## Phase 6: User Story 4 — Empty retrieval (P1)

- [x] T017 [US4] Safe empty-store chat test in `src/chat.test.ts`
- [x] T018 [US4] Sample JD chunking test in `src/ingest.test.ts`
- [x] T019 [US4] Chat observability in `src/observe.ts`

## Phase 7: Polish (remaining)

- [ ] T020 Add Dockerfile for the Next app; keep env and models out of the image
- [ ] T021 Provide a README outline only; human writes final prose
- [ ] T022 Capture screenshots into `screenshots/`
- [ ] T023 Optional: `specify` CLI install if a reviewer wants the upstream Spec Kit commands

## Dependencies

Setup → Foundational → US1/US4 (core) → US2/US3 → Polish.

US1 is the MVP. Docker and README are submission polish, not blockers for local demo.
