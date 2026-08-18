# GET /api/documents

Returns the current in-memory session.

```json
{
  "resume": { "id": "resume-sample", "source": "resume", "title": "Alex Morgan", "fileName": "alex-morgan-resume.md", "text": "…", "createdAt": "…" },
  "jobs": [
    { "id": "job-1", "jobId": "job-1", "source": "job", "title": "Frontend Engineer", "company": "Northstar Health", "fileName": "…", "text": "…", "createdAt": "…" }
  ]
}
```

# POST /api/documents

`multipart/form-data`:

- `kind`: `resume` | `job`
- `file`: `.pdf`, `.txt`, `.md`, `.markdown`, max 2 MB

`kind=resume` replaces the session resume.
`kind=job` appends a job. Unused `job-N` filenames keep that id; otherwise the next integer is allocated.

Success `200`: `{ "uploaded": "resume"|"job", "resume": …, "jobs": […] }`

Errors:

- `400` missing file/kind, unsupported type, too large
- `500` parse/ingest failure
