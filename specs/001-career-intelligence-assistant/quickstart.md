# Quickstart

## Run

```bash
npm install
cp .env.example .env.local   # optional; default LLM_PROVIDER=local
npm run dev
```

Open http://localhost:3000

## Happy path

1. Leave Job 2 selected.
2. Click **How does my experience align with this job?**
3. Confirm Sources show Resume + Job 2, not Job 1.

## Provider switch

```bash
# .env.local
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2
```

Or `LLM_PROVIDER=gemini` plus `GEMINI_API_KEY`.

## Verification

```bash
npm test
npm run verify:retrieval
npm run verify:upload
npm run example:chat
```
