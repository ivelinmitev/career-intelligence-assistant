import type { ChatMessage, JobDocument, ResumeDocument } from "@/src/types";

export const sampleResume: ResumeDocument = {
  id: "resume-sample",
  source: "resume",
  title: "Alex Morgan Resume",
  fileName: "alex-morgan-resume.md",
  createdAt: "2026-08-18T09:00:00.000Z",
  text: [
    "Senior product-minded software engineer with 6+ years building internal tools, analytics dashboards, and customer-facing web applications.",
    "Strong experience with TypeScript, React, Next.js, Node.js, PostgreSQL, REST APIs, and data visualization.",
    "Led delivery of a reporting platform used by operations teams to track KPIs, automate workflows, and reduce manual spreadsheet work.",
    "Collaborated closely with product managers and designers, wrote technical specs, and mentored junior engineers.",
    "Built lightweight AI features using retrieval, prompt design, and evaluation loops for internal search and support workflows.",
  ].join("\n\n"),
};

export const sampleJobs: JobDocument[] = [
  {
    id: "job-1",
    jobId: "job-1",
    source: "job",
    title: "Frontend Engineer",
    company: "Northstar Health",
    fileName: "job-1-frontend-engineer.md",
    createdAt: "2026-08-18T09:00:00.000Z",
    text: [
      "Northstar Health is hiring a Frontend Engineer to build patient-facing experiences in React and TypeScript.",
      "Requirements include experience with design systems, accessibility, state management, testing, and collaborating with product and design.",
      "Nice to have: exposure to healthcare data, analytics dashboards, and Next.js.",
    ].join("\n\n"),
  },
  {
    id: "job-2",
    jobId: "job-2",
    source: "job",
    title: "AI Product Engineer",
    company: "SignalForge",
    fileName: "job-2-ai-product-engineer.md",
    createdAt: "2026-08-18T09:00:00.000Z",
    text: [
      "SignalForge is looking for an AI Product Engineer to build workflow tools that combine LLMs, retrieval pipelines, and backend APIs.",
      "Requirements include TypeScript or Python, prompt engineering, evaluation mindset, experiment design, and shipping product features end to end.",
      "Nice to have: Next.js, embeddings, vector search, observability, and experience working directly with customers or internal operators.",
    ].join("\n\n"),
  },
  {
    id: "job-3",
    jobId: "job-3",
    source: "job",
    title: "Data Platform Engineer",
    company: "Atlas Retail",
    fileName: "job-3-data-platform-engineer.md",
    createdAt: "2026-08-18T09:00:00.000Z",
    text: [
      "Atlas Retail needs a Data Platform Engineer focused on batch pipelines, warehouse modeling, and infrastructure-as-code.",
      "Requirements include Python, Airflow, dbt, cloud storage, CI/CD, and maintaining reliable data ingestion systems.",
      "Nice to have: stakeholder communication and dashboard performance tuning.",
    ].join("\n\n"),
  },
];

export const starterChat: ChatMessage[] = [
  {
    id: "message-1",
    role: "user",
    content: "How does my experience align with Job 2?",
    createdAt: "2026-08-18T09:02:00.000Z",
  },
  {
    id: "message-2",
    role: "assistant",
    content:
      "Once retrieval is wired up, I’ll answer from resume and Job 2 chunks only, then cite both sides of the comparison.",
    createdAt: "2026-08-18T09:02:10.000Z",
  },
];
