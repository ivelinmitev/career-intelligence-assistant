# POST /api/chat

Request JSON:

```json
{
  "message": "How does my experience align with Job 2?",
  "selectedJobId": "job-2"
}
```

- `message`: non-empty string
- `selectedJobId`: optional string

Success `200`:

```json
{
  "answer": "…",
  "citations": [
    {
      "chunkId": "resume-sample-chunk-0",
      "source": "resume",
      "title": "Alex Morgan",
      "quote": "…"
    }
  ],
  "selectedJobId": "job-2",
  "retrievedChunkIds": ["resume-sample-chunk-0", "job-2-chunk-0"],
  "provider": "local",
  "latencyMs": 12
}
```

Errors:

- `400` invalid body or unresolved job
- `500` provider/runtime failure

Side effect: one `[career-intel] {event:"chat",…}` log line.
