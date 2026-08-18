---
name: add-feature-spec
description: Create a new Spec Kit feature folder with spec.md, plan.md, and tasks.md. Use when the user wants a new capability, a spec, or spec-driven planning before code.
---

# Add a feature spec

## Instructions

1. Read `.specify/memory/constitution.md`. If the feature needs auth, LangChain, Pinecone, or paid-OpenAI-only, call that out as a constitution amendment — do not silently violate it.
2. Pick the next `specs/NNN-kebab-name/` folder.
3. Write `spec.md` from the Spec Kit shape: user stories, acceptance scenarios, functional requirements, success criteria. No stack dump in the spec.
4. Write `plan.md` with stack, constitution check, and file paths.
5. Add `contracts/` if there is an HTTP or data contract.
6. Write `tasks.md` with checkbox tasks, exact paths, and `[US#]` labels.
7. Do not implement until the user asks.

## Folder shape

```text
specs/NNN-name/
├── spec.md
├── plan.md
├── tasks.md
├── research.md      # optional
├── data-model.md    # optional
├── quickstart.md    # optional
└── contracts/       # optional
```
