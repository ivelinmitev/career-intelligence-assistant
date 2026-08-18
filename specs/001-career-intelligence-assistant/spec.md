# Feature Specification: Career Intelligence Assistant

**Feature Branch**: `001-career-intelligence-assistant`

**Created**: 2026-08-18

**Status**: Active

**Input**: Option 4 take-home — compare one resume to several job descriptions with job-scoped RAG, citations, and a designed 3-pane chat UI. No paid OpenAI required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare resume to a selected job (Priority: P1)

A candidate opens the app with sample documents already loaded, selects Job 2, and asks how their experience aligns. The assistant answers from the resume and Job 2 only, with citations.

**Why this priority**: This is the product. Without grounded, job-scoped chat the take-home fails.

**Independent Test**: `npm run example:chat` or click the Job 2 alignment prompt in the UI and inspect sources.

**Acceptance Scenarios**:

1. **Given** sample resume and jobs are ingested, **When** the user asks "How does my experience align with Job 2?", **Then** the answer cites resume and Job 2 chunks only.
2. **Given** Job 1 and Job 2 are both ingested, **When** retrieval runs for Job 2, **Then** no Job 1 chunk ids appear.

---

### User Story 2 - Inspect skill gaps and interview prep (Priority: P1)

The same candidate asks what skills they are missing for the selected role, or requests interview questions for Job 2.

**Why this priority**: These are the example queries in the assignment.

**Independent Test**: Use the suggested prompt chips in the chat pane.

**Acceptance Scenarios**:

1. **Given** Job 2 is selected, **When** the user clicks "What skills am I missing for this role?", **Then** the answer is grounded in resume + Job 2 context.
2. **Given** another job is selected, **When** the user clicks "Give me interview preparation questions for Job 2", **Then** Job 2 is resolved from the message text.

---

### User Story 3 - Replace resume and add jobs (Priority: P2)

The candidate replaces the sample resume and adds another job description. Chat uses the new documents. New jobs receive the next `job-N` id.

**Why this priority**: Uploads prove ingest is real, not hardcoded sample strings.

**Independent Test**: `npm run verify:upload` or upload the fixture files in the UI and ask about Job 4.

**Acceptance Scenarios**:

1. **Given** sample jobs 1–3, **When** a new job file is uploaded, **Then** it becomes `job-4` and retrieval for Job 4 does not return Job 1.
2. **Given** a new resume file, **When** it is uploaded, **Then** chat citations use the replacement resume, not Alex Morgan.

---

### User Story 4 - Safe empty retrieval (Priority: P1)

If nothing relevant is in the store, the assistant must not hallucinate.

**Why this priority**: Guardrail required by the assignment.

**Independent Test**: Vitest empty-store case in `src/chat.test.ts`.

**Acceptance Scenarios**:

1. **Given** an empty vector store, **When** a question is asked, **Then** the reply says the answer is not in the uploaded or provided documents and the LLM complete path is not used.

---

### Edge Cases

- Unresolvable job (no selection and no "Job N" mention) returns a clear client error.
- Unsupported file types are rejected.
- Files over 2 MB are rejected.
- Process restart resets in-memory uploads back to sample data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load one fake sample resume and at least two fake job descriptions with no real PII.
- **FR-002**: System MUST parse PDF, markdown, and plain text; markdown/text is the working path.
- **FR-003**: System MUST chunk documents with `source: "resume"` or `source: "job"` plus `jobId`.
- **FR-004**: System MUST embed chunks and retrieve with cosine similarity in process.
- **FR-005**: System MUST answer only from retrieved resume + selected job context and return citations.
- **FR-006**: System MUST expose `POST /api/chat` and `GET|POST /api/documents`.
- **FR-007**: System MUST provide a 3-pane UI (resume, jobs, chat + sources) with suggested prompts.
- **FR-008**: System MUST allow replacing one resume and adding multiple jobs.
- **FR-009**: System MUST log question, selectedJobId, retrievedChunkIds, provider, and latency.
- **FR-010**: System MUST keep `Llm` swappable (`local` | `ollama` | `gemini`).

### Key Entities

- **ResumeDocument**: Single candidate profile currently in session.
- **JobDocument**: One role, identified by `jobId` (`job-1`, `job-2`, …).
- **DocumentChunk**: Text slice plus source metadata.
- **Citation**: Chunk id, source, title, quote, optional jobId.
- **ChatRequest / ChatResponse**: Question, optional selected job, answer, citations, debug fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Happy path works with zero uploads via sample data.
- **SC-002**: Job 2 retrieval tests fail if any Job 1 chunk is returned.
- **SC-003**: Empty store never calls `complete` and returns the safe refusal.
- **SC-004**: A reviewer can clone, `npm i`, `npm run dev`, and ask a Job 2 question without a paid API key.

## Assumptions

- Single-process, single-user, in-memory session is enough for the take-home.
- README prose is written by the human later.
- Docker, screenshots, and polished UX extras are follow-on specs if time remains.
- First `@xenova/transformers` or Ollama model pull may be slow and must stay gitignored if added later.
