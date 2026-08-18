"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

import type {
  ChatResponse,
  Citation,
  JobDocument,
  ResumeDocument,
} from "@/src/types";

const PROMPT_CHIPS = [
  "What skills am I missing for this role?",
  "How does my experience align with this job?",
  "Give me interview preparation questions for Job 2",
];

const RESUME_SKILLS = [
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

export function CareerWorkspace({ resume, jobs }: CareerWorkspaceProps) {
  const [selectedJobId, setSelectedJobId] = useState(
    jobs.find((job) => job.jobId === "job-2")?.jobId ?? jobs[0]?.jobId ?? "",
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );

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
            <span className="status-pill">Loaded</span>
          </div>

          <article className="card resume-card">
            <p className="card-kicker">Sample candidate</p>
            <h3>{resume.title}</h3>
            <p>{previewText(resume.text, 220)}</p>
            <div className="meta-row">
              {RESUME_SKILLS.map((skill) => (
                <span key={skill} className="tag">
                  {skill}
                </span>
              ))}
            </div>
          </article>

          <label className="upload-button">
            Replace resume
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf"
              disabled
            />
          </label>
          <p className="hint">
            Sample resume is ready for chat. File ingest comes next.
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
            <span className="status-pill">{jobs.length} roles</span>
          </div>

          <div className="job-list">
            {jobs.map((job) => {
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
                    <span className="tag">{job.jobId.replace("job-", "Job ")}</span>
                  </header>
                  <p>{previewText(job.text)}</p>
                </button>
              );
            })}
          </div>

          <label className="upload-button">
            Add job description
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf"
              disabled
            />
          </label>
          <p className="hint">
            Three sample jobs are loaded. Extra uploads come next.
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
              {selectedJob
                ? selectedJob.jobId.replace("job-", "Job ")
                : "No job"}
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
                            : citation.jobId?.replace("job-", "Job ") ?? "Job"}
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
