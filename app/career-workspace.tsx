"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChatResponse,
  Citation,
  DocumentsState,
  JobDocument,
  ResumeDocument,
} from "@/src/types";

const PROMPT_CHIPS = [
  "How does my experience align with Job 2?",
  "What skills am I missing for this role?",
  "Give me interview preparation questions for Job 2",
];

const DEMO_ORG = "Northstar Talent";

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
  sentAt: number;
}

function previewText(text: string, max = 180): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function jobLabel(jobId: string): string {
  return jobId.replace("job-", "Req ");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeDocumentsState(payload: unknown): DocumentsState {
  if (!payload || typeof payload !== "object") {
    return { resume: null, jobs: [] };
  }

  const state = payload as Partial<DocumentsState> & {
    candidates?: ResumeDocument[];
  };

  if ("resume" in state || Array.isArray(state.jobs)) {
    return {
      resume: state.resume ?? null,
      jobs: Array.isArray(state.jobs) ? state.jobs : [],
    };
  }

  if (Array.isArray(state.candidates)) {
    return {
      resume: state.candidates[0] ?? null,
      jobs: Array.isArray(state.jobs) ? state.jobs : [],
    };
  }

  return { resume: null, jobs: [] };
}

function IconRoles() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4V4z" />
    </svg>
  );
}

function IconResume() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

export function CareerWorkspace({ resume, jobs }: CareerWorkspaceProps) {
  const [currentResume, setCurrentResume] = useState(resume);
  const [currentJobs, setCurrentJobs] = useState(jobs ?? []);
  const [selectedJobId, setSelectedJobId] = useState<string>("job-2");
  const [jobFilter, setJobFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedJob = useMemo(
    () => currentJobs.find((job) => job.jobId === selectedJobId),
    [currentJobs, selectedJobId],
  );

  const reviewReady = Boolean(selectedJob && currentResume);

  const filteredJobs = useMemo(() => {
    const query = jobFilter.trim().toLowerCase();
    if (!query) {
      return currentJobs;
    }
    return currentJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.jobId.toLowerCase().includes(query),
    );
  }, [currentJobs, jobFilter]);

  const latestCitations = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === "assistant" && message.citations?.length) {
        return message.citations;
      }
    }
    return [];
  }, [messages]);

  useEffect(() => {
    void fetch("/api/documents")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const state = normalizeDocumentsState(await response.json());
        if (state.resume) {
          setCurrentResume(state.resume);
        }
        if (state.jobs.length > 0) {
          setCurrentJobs(state.jobs);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    setMessages([]);
  }, [selectedJobId]);

  function applyDocuments(state: DocumentsState, uploadedJobId?: string) {
    if (state.resume) {
      setCurrentResume(state.resume);
    }
    setCurrentJobs(state.jobs);
    if (uploadedJobId) {
      setSelectedJobId(uploadedJobId);
    }
  }

  async function uploadFile(kind: "resume" | "job", file: File) {
    setError(null);
    setNotice(null);
    setIsUploading(true);

    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as DocumentsState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const state = normalizeDocumentsState(payload);
      applyDocuments(state, kind === "job" ? state.jobs.at(-1)?.jobId : undefined);
      setNotice(
        kind === "resume"
          ? "Resume replaced — chat now uses your uploaded CV."
          : `Requisition added as ${state.jobs.at(-1)?.jobId ?? "new job"}.`,
      );
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
    if (!message || isSending || !selectedJobId || !currentResume) {
      return;
    }

    setError(null);
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", content: message, sentAt: Date.now() },
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
      setLlmProvider(result.provider);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: result.answer,
          citations: result.citations,
          selectedJobId: result.selectedJobId,
          sentAt: Date.now(),
        },
      ]);
    } catch (sendError: unknown) {
      setError(
        sendError instanceof Error ? sendError.message : "Chat request failed.",
      );
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

  function onResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadFile("resume", file);
    }
    event.target.value = "";
  }

  function onJobUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadFile("job", file);
    }
    event.target.value = "";
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-brand">
          <strong>{DEMO_ORG}</strong>
          <span>Career Intelligence · Resume vs job RAG</span>
        </div>
        <div className="workspace-meta">
          {llmProvider ? (
            <span className="workspace-pill">Provider: {llmProvider}</span>
          ) : null}
          <span>Grounded answers with citations</span>
        </div>
      </header>

      <div className="messenger-app">
        <nav className="icon-rail" aria-label="Workspace navigation">
          <div className="rail-logo">CI</div>
          <button type="button" className="rail-btn active" aria-label="Jobs">
            <IconRoles />
          </button>
          <button type="button" className="rail-btn" aria-label="Resume">
            <IconResume />
          </button>
          <div className="rail-spacer" />
        </nav>

        <aside className="inbox-panel workflow-panel">
          <section className="workflow-section">
            <div className="workflow-section-header">
              <h2>Jobs</h2>
              <label className="upload-button compact">
                {isUploading ? "…" : "+ Add"}
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,application/pdf"
                  disabled={isUploading}
                  onChange={onJobUpload}
                />
              </label>
            </div>
            <label className="search-box">
              <span aria-hidden>🔍</span>
              <input
                type="search"
                placeholder="Search jobs"
                value={jobFilter}
                onChange={(event) => setJobFilter(event.target.value)}
              />
            </label>
            <div className="inbox-section compact">
              {filteredJobs.map((job) => {
                const isActive = job.jobId === selectedJobId;
                return (
                  <button
                    key={job.id}
                    type="button"
                    className={`conversation-item ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedJobId(job.jobId)}
                  >
                    <div className="avatar job">{job.jobId.replace("job-", "J")}</div>
                    <div className="conversation-body">
                      <div className="conversation-top">
                        <h3>{job.title}</h3>
                        <span className="conversation-time">
                          {job.jobId.replace("job-", "Job ")}
                        </span>
                      </div>
                      <p className="conversation-preview">{job.company}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="workflow-section">
            <div className="workflow-section-header">
              <h2>Resume</h2>
              <label className="upload-button compact">
                {isUploading ? "…" : "Replace"}
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,application/pdf"
                  disabled={isUploading}
                  onChange={onResumeUpload}
                />
              </label>
            </div>
            <button type="button" className="conversation-item active resume-card">
              <div className="avatar">{initials(currentResume.title)}</div>
              <div className="conversation-body">
                <div className="conversation-top">
                  <h3>{currentResume.title}</h3>
                  <span className="conversation-time">Active CV</span>
                </div>
                <p className="conversation-preview">{currentResume.fileName}</p>
              </div>
            </button>
            <div className="resume-snippet">{previewText(currentResume.text, 220)}</div>
          </section>
        </aside>

        <main className="chat-panel">
          <header className="chat-header">
            <div className="chat-header-left">
              <div className="header-avatars">
                <div className="avatar bot small">AI</div>
                <div className="avatar small">{initials(currentResume.title)}</div>
                {selectedJob ? (
                  <div className="avatar job small">{initials(selectedJob.company)}</div>
                ) : null}
              </div>
              <div className="chat-header-info">
                <h2>
                  {reviewReady
                    ? `${currentResume.title} · ${selectedJob!.title}`
                    : "Career chat"}
                </h2>
                <p>
                  {reviewReady
                    ? `${selectedJob!.company} · grounded in resume + ${selectedJob!.jobId} only`
                    : "Select a job to begin"}
                </p>
              </div>
            </div>
          </header>

          {llmProvider === "local" ? (
            <p className="banner notice">
              Offline mode — structured summaries from retrieved excerpts. Chat
              auto-uses Ollama when it is running locally, or set{" "}
              <code>LLM_PROVIDER=gemini</code>.
            </p>
          ) : null}
          {notice ? <p className="banner notice">{notice}</p> : null}
          {error ? <p className="banner error">{error}</p> : null}

          <div className="chat-body" aria-live="polite">
            {messages.length === 0 && !isSending ? (
              <div className="empty-chat">
                <div className="avatar bot" style={{ margin: "0 auto 16px" }}>
                  AI
                </div>
                <h3>Compare resume to selected job</h3>
                <p>
                  Job 2 is selected by default. Try a suggested prompt — every
                  answer cites resume and job chunks only.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div key={message.id} className={`bubble-row ${message.role}`}>
                {message.role === "assistant" ? (
                  <div className="avatar bot small">AI</div>
                ) : null}
                <div className="bubble">
                  <span className="bubble-sender">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <p>{message.content}</p>
                  <span className="bubble-time">{formatTime(message.sentAt)}</span>
                </div>
              </div>
            ))}

            {isSending ? (
              <div className="bubble-row assistant">
                <div className="avatar bot small">AI</div>
                <div className="bubble">
                  <div className="typing-indicator" aria-label="Typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <footer className="chat-footer">
            <div className="prompt-row">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className="prompt-chip"
                  type="button"
                  disabled={isSending || !reviewReady}
                  onClick={() => void sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <form className="composer" onSubmit={onSubmit}>
              <div className="composer-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask about your experience for the selected job…"
                  rows={1}
                  disabled={isSending || !reviewReady}
                />
              </div>
              <button
                className="send-button"
                type="submit"
                disabled={isSending || !reviewReady || draft.trim().length === 0}
                aria-label="Send"
              >
                <IconSend />
              </button>
            </form>
          </footer>
        </main>

        <aside className="info-panel">
          <div className="info-header">
            <div className="avatar job">
              {selectedJob ? initials(selectedJob.company) : "?"}
            </div>
            <h2>{selectedJob?.title ?? "No job selected"}</h2>
            <p>{selectedJob?.company ?? "Pick a job from the list"}</p>
          </div>

          <div className="info-stats">
            <div className="stat-card">
              <strong>{currentJobs.length}</strong>
              <span>Jobs loaded</span>
            </div>
            <div className="stat-card">
              <strong>{latestCitations.length}</strong>
              <span>Sources cited</span>
            </div>
          </div>

          <section className="info-section">
            <h3>Selected job</h3>
            <div className="info-card">
              {selectedJob ? (
                <>
                  <strong>{selectedJob.title}</strong>
                  {previewText(selectedJob.text, 160)}
                  <div className="tag-row">
                    <span className="tag">{selectedJob.jobId}</span>
                    <span className="tag">{selectedJob.fileName}</span>
                  </div>
                </>
              ) : (
                "Select a job to see details."
              )}
            </div>
          </section>

          <section className="info-section">
            <h3>Resume</h3>
            <div className="info-card">
              <strong>{currentResume.title}</strong>
              {previewText(currentResume.text, 140)}
              <div className="tag-row">
                <span className="tag">{currentResume.fileName}</span>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h3>Sources</h3>
            {latestCitations.length === 0 ? (
              <div className="info-card">
                Citations from the latest answer appear here for audit.
              </div>
            ) : (
              <div className="source-list">
                {latestCitations.map((citation) => (
                  <div key={citation.chunkId} className="source-item">
                    <span className="source-badge">
                      {citation.source === "resume"
                        ? "Resume"
                        : citation.jobId
                          ? citation.jobId.replace("job-", "Job ")
                          : "Job"}
                    </span>
                    <strong>{citation.title}</strong>
                    <p>{previewText(citation.quote, 120)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
