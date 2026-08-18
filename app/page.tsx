import { sampleJobs, sampleResume, starterChat } from "@/src/data";

const promptChips = [
  "What skills am I missing for this role?",
  "How does my experience align with this job?",
  "Give me interview preparation questions for Job 2",
];

export default function HomePage() {
  const activeJob = sampleJobs[1];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <h1>Career Intelligence Assistant</h1>
          <p>
            Compare one resume against multiple job descriptions with job-scoped
            retrieval, grounded answers, and citations. This first pass sets up
            the product shell, sample data, and typed boundaries for the later
            RAG flow.
          </p>
        </div>
        <div className="hero-badge">Option 4 • Next.js App Router</div>
      </section>

      <section className="pane-grid">
        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2>Resume</h2>
              <p className="panel-subtitle">
                Single candidate profile used across all job comparisons.
              </p>
            </div>
            <span className="status-pill">Sample loaded</span>
          </div>

          <div className="stack">
            <article className="card">
              <h3>{sampleResume.title}</h3>
              <p>
                Product-minded engineer with TypeScript, Next.js, Node.js,
                analytics, and light AI workflow experience.
              </p>
              <div className="meta-row">
                <span className="tag">Markdown sample</span>
                <span className="tag">Upload later</span>
              </div>
            </article>

            <article className="card">
              <h4>Planned upload flow</h4>
              <p>
                Replace the sample resume with a PDF, `.txt`, or `.md` file and
                re-run ingestion into resume-only chunks.
              </p>
            </article>
          </div>
        </aside>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Job Descriptions</h2>
              <p className="panel-subtitle">
                Select a role to scope retrieval and comparison.
              </p>
            </div>
            <span className="status-pill">3 jobs</span>
          </div>

          <div className="job-list">
            {sampleJobs.map((job) => (
              <article
                key={job.id}
                className={`job-card ${job.id === activeJob.id ? "active" : ""}`}
              >
                <header>
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.company}</p>
                  </div>
                  <span className="tag">{job.jobId}</span>
                </header>
                <p>{job.text.split("\n\n")[0]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Chat</h2>
              <p className="panel-subtitle">
                Right now this is a UI shell with suggested prompts and citation
                placeholders.
              </p>
            </div>
            <span className="status-pill">Job 2 selected</span>
          </div>

          <div className="chat-shell">
            <div className="prompt-row">
              {promptChips.map((chip) => (
                <button key={chip} className="prompt-chip" type="button">
                  {chip}
                </button>
              ))}
            </div>

            {starterChat.map((message) => (
              <article key={message.id} className="message">
                <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                <p>{message.content}</p>
              </article>
            ))}

            <div className="sources">
              <div className="source-item">
                Resume citation placeholder: relevant experience and skills will
                appear here once retrieval is connected.
              </div>
              <div className="source-item">
                Job citation placeholder: selected job requirements will appear
                here without mixing other job descriptions.
              </div>
            </div>
          </div>
        </section>
      </section>

      <p className="footer-note">
        Next steps from the brief: ingestion, chunking, embeddings, job-scoped
        retrieval, and grounded chat responses with citations.
      </p>
    </main>
  );
}
