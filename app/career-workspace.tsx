"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useState } from "react";

import type {
  ChatResponse,
  Citation,
  DocumentsState,
  JobDocument,
  ResumeDocument,
} from "@/src/types";

const PROMPT_CHIPS = [
  "What skills am I missing for this role?",
  "How does my experience align with this job?",
  "Give me interview preparation questions for Job 2",
];

const SAMPLE_RESUME_SKILLS = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "PostgreSQL",
];

interface CareerWorkspaceProps {
  resume: ResumeDocument;
  jobs: JobDocument[];
}

interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  selectedJobId?: string;
}

function previewText(text: string, max = 180): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function jobLabel(jobId: string): string {
  return jobId.replace("job-", "Job ");
}

export function CareerWorkspace({ resume, jobs }: CareerWorkspaceProps) {
  const [currentResume, setCurrentResume] = useState(resume);
  const [currentJobs, setCurrentJobs] = useState(jobs);
  const [selectedJobId, setSelectedJobId] = useState(
    jobs.find((job) => job.jobId === "job-2")?.jobId ?? jobs[0]?.jobId ?? "",
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => currentJobs.find((job) => job.jobId === selectedJobId) ?? currentJobs[0],
    [currentJobs, selectedJobId],
  );

  function applyDocuments(state: DocumentsState, uploadedJobId?: string) {
    if (state.resume) {
      setCurrentResume(state.resume);
    }
    setCurrentJobs(state.jobs);
    if (uploadedJobId) {
      setSelectedJobId(uploadedJobId);
      return;
    }
    if (!state.jobs.some((job) => job.jobId === selectedJobId)) {
      setSelectedJobId(state.jobs[0]?.jobId ?? "");
    }
  }

  async function uploadFiles(kind: "resume" | "job", files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsUploading(true);

    try {
      let latestJobId: string | undefined;
      let latestState: DocumentsState | null = null;

      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("kind", kind);
        form.append("file", file);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json()) as DocumentsState & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Upload failed.");
        }

        const state = payload as DocumentsState;
        latestState = state;
        if (kind === "job") {
          latestJobId = state.jobs.at(-1)?.jobId;
        }
      }

      if (latestState) {
        applyDocuments(latestState, latestJobId);
        setNotice(
          kind === "resume"
            ? "Resume replaced and re-ingested for retrieval."
            : `Added ${files.length === 1 ? "a job" : `${files.length} jobs`} and selected ${latestJobId ? jobLabel(latestJobId) : "the new role"}.`,
        );
      }
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || isSending || !selectedJobId) {
      return;
    }

    setError(null);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", content: message },
    ]);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          selectedJobId,
        }),
      });

      const payload = (await response.json()) as ChatResponse | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Chat request failed.",
        );
      }

      const result = payload as ChatResponse;
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: result.answer,
          citations: result.citations,
          selectedJobId: result.selectedJobId,
        },
      ]);
    } catch (sendError: unknown) {
      const nextError =
        sendError instanceof Error ? sendError.message : "Chat request failed.";
      setError(nextError);
    } finally {
      setIsSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  function onResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    void uploadFiles("resume", input.files).finally(() => {
      input.value = "";
    });
  }

  function onJobsChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    void uploadFiles("job", input.files).finally(() => {
      input.value = "";
    });
  }

  const resumeIsSample = currentResume.id === "resume-sample";

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Career Intelligence Assistant</p>
          <h1>See how your resume fits each role.</h1>
          <p>
            Compare one resume against several job descriptions. Answers stay
            grounded in those documents, with citations for resume evidence and
            the selected job.
          </p>
        </div>
        <div className="hero-badge">Grounded answers • Job-scoped retrieval</div>
      </section>

      <section className="pane-grid">
        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2>Resume</h2>
              <p className="panel-subtitle">
                One candidate profile for every comparison.
              </p>
            </div>
            <span className="status-pill">
              {resumeIsSample ? "Sample" : "Uploaded"}
            </span>
          </div>

          <article className="card resume-card">
            <p className="card-kicker">
              {resumeIsSample ? "Sample candidate" : "Uploaded resume"}
            </p>
            <h3>{currentResume.title}</h3>
            <p>{previewText(currentResume.text, 220)}</p>
            <div className="meta-row">
              {(resumeIsSample ? SAMPLE_RESUME_SKILLS : [currentResume.fileName]).map(
                (skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ),
              )}
            </div>
          </article>

          <label className="upload-button">
            {isUploading ? "Uploading…" : "Replace resume"}
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf"
              disabled={isUploading}
              onChange={onResumeChange}
            />
          </label>
          <p className="hint">
            PDF, Markdown, or text. Replacing the resume re-chunks it for chat.
          </p>
        </aside>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Jobs</h2>
              <p className="panel-subtitle">
                Select a role to scope retrieval.
              </p>
            </div>
            <span className="status-pill">{currentJobs.length} roles</span>
          </div>

          <div className="job-list">
            {currentJobs.map((job) => {
              const isActive = job.jobId === selectedJob?.jobId;
              return (
                <button
                  key={job.id}
                  type="button"
                  className={`job-card ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedJobId(job.jobId)}
                >
                  <header>
                    <div>
                      <h3>{job.title}</h3>
                      <p>{job.company}</p>
                    </div>
                    <span className="tag">{jobLabel(job.jobId)}</span>
                  </header>
                  <p>{previewText(job.text)}</p>
                </button>
              );
            })}
          </div>

          <label className="upload-button">
            {isUploading ? "Uploading…" : "Add job description"}
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf"
              disabled={isUploading}
              multiple
              onChange={onJobsChange}
            />
          </label>
          <p className="hint">
            Add one or more files. New jobs keep Job 1, Job 2, … IDs for chat.
          </p>
        </section>

        <section className="panel chat-panel">
          <div className="panel-header">
            <div>
              <h2>Chat</h2>
              <p className="panel-subtitle">
                Ask about fit, gaps, or interview prep for the selected job.
              </p>
            </div>
            <span className="status-pill">
              {selectedJob ? jobLabel(selectedJob.jobId) : "No job"}
            </span>
          </div>

          <div className="prompt-row">
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                className="prompt-chip"
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="chat-thread" aria-live="polite">
            {messages.length === 0 && !isSending ? (
              <div className="empty-chat">
                <h3>Ready when you are</h3>
                <p>
                  Select a job, then send a question or use a suggested prompt.
                  Sources will appear under each answer.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                <p>{message.content}</p>
                {message.role === "assistant" && message.citations?.length ? (
                  <div className="sources">
                    <p className="sources-label">Sources</p>
                    {message.citations.map((citation) => (
                      <div key={citation.chunkId} className="source-item">
                        <span className="source-badge">
                          {citation.source === "resume"
                            ? "Resume"
                            : citation.jobId
                              ? jobLabel(citation.jobId)
                              : "Job"}
                        </span>
                        <strong>{citation.title}</strong>
                        <p>{previewText(citation.quote, 220)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {isSending ? (
              <article className="message assistant">
                <strong>Assistant</strong>
                <p>Reading the resume and selected job…</p>
              </article>
            ) : null}
          </div>

          {notice ? <p className="notice-banner">{notice}</p> : null}
          {error ? <p className="error-banner">{error}</p> : null}

          <form className="composer" onSubmit={onSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder={`Ask about ${selectedJob?.title ?? "this role"}…`}
              rows={3}
              disabled={isSending}
            />
            <div className="composer-row">
              <span className="hint">
                Answers use the resume plus {selectedJob?.title ?? "the selected job"} only.
              </span>
              <button
                className="send-button"
                type="submit"
                disabled={isSending || draft.trim().length === 0}
              >
                Send
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
