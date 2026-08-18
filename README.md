# Career Intelligence Assistant

Take-home Option 4: one resume, several job descriptions, a chat UI that answers from retrieved text only.

I built this as a small Next.js app. No paid OpenAI key. Sample files are fake — do not commit a real CV.

## Quick setup

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Happy path (nothing to upload):

1. Leave **Job 2 — AI Product Engineer** selected.
2. Click **How does my experience align with Job 2?**
3. On the right, **Sources** should show the resume and Job 2. Not Job 1.

```bash
npm test
npm run verify:retrieval
npm run verify:upload
```

### LLM providers

| `LLM_PROVIDER` | What you need |
|----------------|----------------|
| unset / `auto` | Use Ollama if `http://localhost:11434` is up, otherwise local |
| `local` | No extra install. Structured fit/gap answers from retrieved chunks |
| `ollama` | Ollama with `nomic-embed-text` and `llama3.2` (overridable) |
| `gemini` | `GEMINI_API_KEY` |

Tests always inject a local `Llm`. They do not hit the network.

Fluent chat needs Ollama or Gemini. Local mode is intentional so `npm test` and a clone-and-run demo work on a laptop with no API key.

### Docker

Keys stay out of the image.

```bash
docker build -t career-intelligence-assistant .
docker run --rm -p 3000:3000 -e LLM_PROVIDER=local career-intelligence-assistant
```

Ollama on the host: `-e LLM_PROVIDER=ollama -e OLLAMA_HOST=http://host.docker.internal:11434`.

## Architecture

```text
Resume / job file
    → parse (md / txt / pdf)
    → chunk { source, jobId? }
    → embed (Llm.embed)
    → in-memory vectors

Question + selectedJobId
    → resolve job ("Job 2" in the message beats the UI selection)
    → retrieve resume chunks + that job only
    → prompt with retrieved context only
    → Llm.complete
    → { answer, citations, selectedJobId, retrievedChunkIds, provider, latencyMs }
```

```text
app/          UI, /api/chat, /api/documents
src/          ingest, retrieve, generate, session, observe, llm
sample-data/  fake resume + three jobs
specs/        what I specified before coding
```

Layout: jobs + resume on the left, chat in the middle, job details and **Sources** on the right. Chat is job-scoped. Switching jobs clears the thread.

## Productionizing on a hyperscaler

This is a single Node process. The retrieve → generate loop can stay. Almost everything around it has to change:

- **Uploads**: private S3 / GCS / Azure Blob. Resumes are PII. Encrypt at rest, short-lived signed URLs.
- **Ingest**: parse PDFs off the request path (queue + worker).
- **Vectors**: pgvector, OpenSearch, or a managed vector store, with a `jobId` filter so Job 1 never leaks into Job 2.
- **LLM**: Bedrock / Vertex / Azure OpenAI behind the existing `Llm` interface. Same `embed` / `complete` methods.
- **App**: more than one replica, so drop the in-memory session. Cloud Run, ECS, or App Service is enough.
- **Identity**: some auth product. Documents keyed by `userId`.
- **Ops**: request ids, redacted logs, TTL / right-to-delete, health probes.

I would not start with Kubernetes for this.

## RAG / LLM decisions

| Piece | Choice | Also considered | Why |
|-------|--------|-----------------|-----|
| Chunking | ~900 chars, 120 overlap, break on paragraphs | Tiny chunks, dump whole files | Sample docs are short; overlap keeps a bullet from splitting badly |
| Embeddings | `Llm.embed` — hash locally in tests, Ollama or Gemini when configured | MiniLM via Transformers.js | Tests have to run offline. MiniLM is still an easy swap later |
| Generation | Same `Llm.complete`. Auto prefers Ollama | Hard-coding OpenAI | The brief should not require a paid ChatGPT key |
| Vectors | In-process cosine | Pinecone, Chroma | No extra service for a zip / clone demo |
| Orchestration | Custom retrieve → prompt → generate | LangChain | I wanted the loop visible in this repo, not hidden in a framework |
| Context | Resume + **one** job | Stuff every JD into the prompt | “Align with Job 2” is wrong if Job 1 is in the context |
| Guardrails | Empty retrieval refuses. Prompt says do not invent skills | Letting the model freewheel | Easy to test |
| Quality | A few Vitest cases (Job 2 isolation, empty store, uploads) | A big eval set | Time box |
| Observability | One JSON line: question, job id, chunk ids, provider, latency | LangSmith | Enough to debug a take-home |

Local completion is not an LLM. It scores requirement bullets against retrieved text and writes a structured answer. That is why a frontend CV can look “weak” if the retrieved chunks never mention Jest or Redux — I retrieve more chunks for fit/gap questions to reduce that. Ollama/Gemini is the path for a narrative answer.

## Other technical decisions

- **Next.js App Router** so the UI and the Node routes live in one TypeScript repo.
- **In-memory session** (`src/session.ts`). Upload a resume, it replaces the sample. Upload a job, it becomes `job-4`. Restart the process and you are back to sample data.
- Job ids stay `job-1`, `job-2`, … because the example query says “Job #2”.
- PDFs go through `pdf-parse`. Markdown/text is what I actually demoed. PDF worker setup is lazy so Docker does not blow up on import.
- No auth. Out of scope.

## Engineering standards I followed (and skipped)

**Did:** TypeScript, small modules, `jobId` on every job chunk, tests that fail if retrieval is fake, `.gitignore` for secrets and model caches, Dockerfile with env outside the image.

**Did not:** login, CI, rate limits, MiniLM by default, Compose with Ollama, streaming tokens. I would add CI (`npm test` + `npm run build`) before I added another retrieval library.

## How I used AI coding tools

I used Cursor for most of the implementation. I did not start by asking it to “build a RAG app”.

I wrote a constitution (`.specify/memory/constitution.md`) and a spec under `specs/001-career-intelligence-assistant/` first: job-scoped retrieval, grounded answers, swappable `Llm`, no LangChain, no paid-OpenAI-only path. The agent is supposed to read those before it touches code. When it drifted (multi-candidate ATS flow, a dull three-column dump, answers that dumped raw chunks), I sent it back.

What I kept from the agent: ingest/chunk/retrieve loop, Vitest cases, the Docker file, a lot of TypeScript boilerplate.

What I threw out or rewrote: a recruiter “select req then candidate then chat” wizard that was not in the assignment; a local completer that just echoed chunks; UI that looked like a debug console.

How I check the agent’s work:

- `npm test` — especially Job 2 must not return Job 1 chunks, and an empty store must not call `complete`.
- `npm run verify:retrieval` / `verify:upload`.
- Click the Job 2 chip and look at **Sources**.

Do’s: spec before code, keep `Llm.embed` / `Llm.complete` as the only model boundary, make the agent run the tests.

Don’ts: accept a first UI, let it add Pinecone “because production”, leave `Co-authored-by: Cursor` in commits, let it write this README as a polished memoir. The bullets above are mine; if a sentence sounds like a brochure I deleted it.

## What I would do with more time

- Real embeddings by default, plus a similarity floor so junk chunks stay out.
- Persist uploads (resumes are PII, so auth comes with that).
- Stream tokens. Delete a job. A PDF fixture in CI.
- A tiny eval set of questions with expected citation sources.

## Known limits

- Local mode is a structured summary, not a chat model.
- Uploads live in RAM. Refresh the server, they are gone.
- First Ollama pull is slow. Those files are gitignored.
- PDF in Docker is better than it was (lazy worker), but markdown is still the path I trust.

## Screenshots

1. `screenshots/01-workspace.png` — idle UI, Job 2 selected.
2. `screenshots/02-job2-answer.png` — Job 2 alignment answer with resume + Job 2 sources.
