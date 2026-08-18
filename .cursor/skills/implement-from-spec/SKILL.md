---
name: implement-from-spec
description: Implement the next incomplete Spec Kit tasks for this repo. Use when the user asks to implement, continue the spec, execute tasks.md, or build from the plan.
---

# Implement from spec

## Instructions

1. Read `.specify/memory/constitution.md`.
2. Open the active feature in `specs/` (default `001-career-intelligence-assistant` unless the user names another).
3. Read `spec.md`, `plan.md`, then `tasks.md`.
4. Implement the next unchecked task group only. Do not skip to polish if core stories are open.
5. Touch the files named in the task. Keep `Llm`, job-scoped retrieval, and empty-retrieval refusal intact.
6. Check off completed tasks in `tasks.md`.
7. Run `npm test` for behavior changes.
8. Commit in small logical chunks. No Cursor co-author trailers.

## Stop conditions

- Unchecked constitution violations → stop and update spec/plan first.
- User asked only for review → do not implement.
- T021 README: outline only, no polished first-person prose.
