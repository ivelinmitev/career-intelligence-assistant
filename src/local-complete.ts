interface ParsedContext {
  resumeText: string;
  jobText: string;
  selectedJobId: string;
  question: string;
}

type QuestionKind = "fit" | "gaps" | "align" | "interview" | "general";

const CONCEPT_ALIASES: Array<{ pattern: RegExp; terms: string[] }> = [
  {
    pattern: /accessibility|a11y|wcag/i,
    terms: ["accessibility", "a11y", "wcag", "aria", "screen reader"],
  },
  {
    pattern: /state management/i,
    terms: [
      "state management",
      "redux",
      "zustand",
      "mobx",
      "context api",
      "react state",
      "ngrx",
    ],
  },
  {
    pattern: /frontend testing/i,
    terms: [
      "frontend testing",
      "jest",
      "vitest",
      "cypress",
      "playwright",
      "unit test",
      "e2e",
      "test coverage",
    ],
  },
  {
    pattern: /(?<!frontend )testing(?! engineer)/i,
    terms: [
      "testing",
      "jest",
      "vitest",
      "cypress",
      "playwright",
      "unit test",
      "e2e",
      "test coverage",
    ],
  },
  {
    pattern: /design system/i,
    terms: [
      "design system",
      "design systems",
      "component library",
      "storybook",
      "ui kit",
    ],
  },
  {
    pattern: /react/i,
    terms: ["react", "react.js", "reactjs"],
  },
  {
    pattern: /typescript/i,
    terms: ["typescript", "ts"],
  },
  {
    pattern: /angular/i,
    terms: ["angular"],
  },
  {
    pattern: /next\.?js/i,
    terms: ["next.js", "nextjs"],
  },
  {
    pattern: /prompt engineering/i,
    terms: ["prompt engineering", "prompt design", "prompting"],
  },
  {
    pattern: /evaluation mindset|evaluation/i,
    terms: ["evaluation mindset", "evaluation", "evaluation loop", "eval"],
  },
  {
    pattern: /retrieval|vector search|embeddings/i,
    terms: ["retrieval", "vector search", "embeddings", "rag"],
  },
  {
    pattern: /collaboration|product and design/i,
    terms: [
      "collaboration",
      "product manager",
      "designer",
      "stakeholder",
      "cross-functional",
    ],
  },
];

const TECH_SKILL_PATTERN =
  /\b(type\s*script|javascript|react|angular|vue|next\.?js|node\.?js|html|css|sass|webpack|jest|vitest|cypress|playwright|redux|graphql|rest|postgresql|python|java|docker|kubernetes|aws|azure|git)\b/gi;

function parseGroundedPrompt(prompt: string): ParsedContext | null {
  const contextMatch = prompt.match(
    /Selected job: (.+)\nSelected candidate: .+\n\nRetrieved context:\n([\s\S]*?)\n\nQuestion:\n([\s\S]*)$/,
  );
  if (!contextMatch) {
    return null;
  }

  const [, selectedJobId, contextBlock, question] = contextMatch;
  const resumeChunks: string[] = [];
  const jobChunks: string[] = [];

  for (const block of contextBlock.split(/\n\n(?=\[)/)) {
    const headerMatch = block.match(/^\[(resume|job)[^\]]*\]\n([\s\S]*)$/);
    if (!headerMatch) {
      continue;
    }
    const [, source, text] = headerMatch;
    if (source === "resume") {
      resumeChunks.push(text.trim());
    } else {
      jobChunks.push(text.trim());
    }
  }

  if (resumeChunks.length === 0 || jobChunks.length === 0) {
    return null;
  }

  return {
    resumeText: resumeChunks.join("\n\n"),
    jobText: jobChunks.join("\n\n"),
    selectedJobId: selectedJobId.trim(),
    question: question.trim(),
  };
}

function extractBulletItems(text: string): string[] {
  const items = new Set<string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch?.[1]) {
      items.add(bulletMatch[1].trim());
    }
  }

  return [...items];
}

function extractSummaryRequirements(jobText: string): string[] {
  const summaryMatch = jobText.match(
    /## Summary[^\n]*\n([\s\S]*?)(?:\n## |\n# |$)/i,
  );
  if (!summaryMatch?.[1]) {
    return [];
  }

  const summary = summaryMatch[1];
  const items = new Set<string>();

  for (const match of summary.match(TECH_SKILL_PATTERN) ?? []) {
    items.add(match.trim());
  }

  for (const phrase of [
    "design systems",
    "accessibility",
    "state management",
    "frontend testing",
    "testing",
  ]) {
    if (summary.toLowerCase().includes(phrase)) {
      items.add(phrase);
    }
  }

  return [...items];
}

function extractRequirements(jobText: string): string[] {
  const sections = ["Requirements", "Nice to Have", "Core Skills"];
  const items = new Set<string>();

  for (const item of extractSummaryRequirements(jobText)) {
    items.add(item);
  }

  for (const section of sections) {
    const sectionMatch = jobText.match(
      new RegExp(`## ${section}[^\\n]*\\n([\\s\\S]*?)(?:\\n## |\\n# |$)`, "i"),
    );
    if (sectionMatch?.[1]) {
      for (const item of extractBulletItems(sectionMatch[1])) {
        items.add(item);
      }
    }
  }

  if (items.size > 0) {
    return [...items];
  }

  return extractBulletItems(jobText);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function searchTermsForRequirement(requirement: string): string[] {
  const terms = new Set<string>();
  const normalizedRequirement = normalize(requirement);
  terms.add(normalizedRequirement);

  for (const alias of CONCEPT_ALIASES) {
    if (alias.pattern.test(requirement)) {
      for (const term of alias.terms) {
        terms.add(normalize(term));
      }
    }
  }

  return [...terms];
}

function extractSkillTokens(text: string): string[] {
  const skills = new Set<string>();

  for (const item of extractBulletItems(text)) {
    skills.add(normalize(item));
  }

  const matches = text.match(TECH_SKILL_PATTERN) ?? [];
  for (const match of matches) {
    skills.add(normalize(match.replace(/\s+/g, "")));
  }

  return [...skills];
}

function resumeCoversRequirement(resumeText: string, requirement: string): boolean {
  const resume = normalize(resumeText);
  const req = normalize(requirement);

  if (req.length >= 4 && resume.includes(req)) {
    return true;
  }

  if (
    /collaboration.*product.*design|product and design/.test(req) &&
    (/product collaboration|product manager|designer|cross-functional|stakeholder/.test(
      resume,
    ) ||
      /partnered closely with product/.test(resume))
  ) {
    return true;
  }

  if (/design system/.test(req) && /design system|component library|storybook|ui kit/.test(resume)) {
    return true;
  }

  const terms = searchTermsForRequirement(requirement).filter(
    (term) => term !== req && term.length >= 4,
  );
  const hits = terms.filter((term) => resume.includes(term)).length;

  return hits >= 1;
}

function overlappingRoleSkills(resumeText: string, jobText: string): string[] {
  const resumeSkills = extractSkillTokens(resumeText);
  const jobNormalized = normalize(jobText);
  const overlaps: string[] = [];

  for (const skill of resumeSkills) {
    if (skill.length < 2) {
      continue;
    }
    if (jobNormalized.includes(skill)) {
      overlaps.push(skill);
    }
  }

  return [...new Set(overlaps)].slice(0, 10);
}

function classifyQuestion(question: string): QuestionKind {
  const q = normalize(question);

  if (
    /(okay|ok for|good fit|qualified|right for|suitable|hire|candidate)/.test(q)
  ) {
    return "fit";
  }
  if (/(missing|gap|lack|need to learn|don't have|do not have)/.test(q)) {
    return "gaps";
  }
  if (/(align|match|compare|experience fit|how does my)/.test(q)) {
    return "align";
  }
  if (/(interview|prepare|prep question)/.test(q)) {
    return "interview";
  }

  return "general";
}

function compareRequirements(resumeText: string, jobText: string) {
  const requirements = extractRequirements(jobText);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const requirement of requirements) {
    if (resumeCoversRequirement(resumeText, requirement)) {
      matched.push(requirement);
    } else {
      missing.push(requirement);
    }
  }

  const roleSkills = overlappingRoleSkills(resumeText, jobText);

  return { requirements, matched, missing, roleSkills };
}

function fitVerdict(
  matched: number,
  total: number,
  roleSkillCount: number,
  missing: string[],
): string {
  if (total === 0 && roleSkillCount === 0) {
    return "There is not enough structured requirement detail in the retrieved excerpts to score fit precisely.";
  }

  const ratio = total > 0 ? matched / total : 0;
  const coreMissing = missing.filter(
    (item) => !/nice to have|healthcare|analytics dashboard/i.test(item),
  ).length;

  if (ratio >= 0.75 && coreMissing <= 1) {
    return "Overall: strong fit — the CV excerpts align well with this job.";
  }
  if (ratio >= 0.45 || (roleSkillCount >= 3 && coreMissing <= 3)) {
    return "Overall: solid fit — overlapping skills are present; some listed requirements are not explicitly named in the retrieved CV excerpts.";
  }
  if (ratio >= 0.25 || roleSkillCount >= 2) {
    return "Overall: partial fit — relevant stack experience appears in the CV, but several requirement bullets are not clearly evidenced in the retrieved excerpts.";
  }
  return "Overall: weak fit against the explicit requirements in the retrieved excerpts.";
}

function buildFitAnswer(context: ParsedContext): string {
  const { matched, missing, requirements, roleSkills } = compareRequirements(
    context.resumeText,
    context.jobText,
  );

  const lines = [
    `${context.selectedJobId.replace("job-", "Job ")} · fit (from retrieved resume + job excerpts):`,
    "",
    fitVerdict(matched.length, requirements.length, roleSkills.length, missing),
  ];

  if (roleSkills.length > 0) {
    lines.push("", "Resume highlights that match this job:");
    for (const skill of roleSkills) {
      lines.push(`- ${skill}`);
    }
  }

  if (matched.length > 0) {
    lines.push("", "Requirement bullets supported in the CV excerpts:");
    for (const item of matched.slice(0, 8)) {
      lines.push(`- ${item}`);
    }
  }

  if (missing.length > 0) {
    lines.push("", "Not clearly evidenced in the retrieved CV excerpts (may still exist elsewhere in the full CV):");
    for (const item of missing.slice(0, 8)) {
      lines.push(`- ${item}`);
    }
  }

  lines.push(
    "",
    "Offline mode analyzes retrieved chunks only. For fluent narrative answers, install Ollama or set LLM_PROVIDER=gemini.",
  );

  return lines.join("\n");
}

function buildGapsAnswer(context: ParsedContext): string {
  const { missing, requirements, roleSkills } = compareRequirements(
    context.resumeText,
    context.jobText,
  );

  if (requirements.length === 0) {
    return "The retrieved job excerpts do not list explicit requirement bullets, so I cannot name skill gaps from requirements alone.";
  }

  if (missing.length === 0) {
    return "Based on the retrieved excerpts, every explicit requirement bullet is supported. Relevant CV skills: " +
      (roleSkills.join(", ") || "none identified in retrieved text.");
  }

  return [
    `Likely gaps for ${context.selectedJobId.replace("job-", "Job ")} (not clearly found in retrieved CV excerpts):`,
    "",
    ...missing.map((item) => `- ${item}`),
    "",
    roleSkills.length > 0
      ? `Relevant skills still present in the CV excerpts: ${roleSkills.join(", ")}.`
      : "",
    "",
    "Gaps are based on retrieved excerpts only — upload or select the full CV if chunks look incomplete.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAlignAnswer(context: ParsedContext): string {
  const { matched, missing, roleSkills } = compareRequirements(
    context.resumeText,
    context.jobText,
  );

  const lines = [
    `Alignment summary for ${context.selectedJobId.replace("job-", "Job ")}:`,
    "",
  ];

  if (roleSkills.length > 0) {
    lines.push("Shared stack / themes between CV and requisition:");
    for (const skill of roleSkills) {
      lines.push(`- ${skill}`);
    }
    lines.push("");
  }

  if (matched.length > 0) {
    lines.push("Requirement bullets supported in the CV excerpts:");
    for (const item of matched.slice(0, 8)) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (missing.length > 0) {
    lines.push("Requirement bullets not clearly supported in retrieved CV excerpts:");
    for (const item of missing.slice(0, 8)) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push(
    "Comparison uses retrieved passages only — no skills or requirements were invented.",
  );

  return lines.join("\n");
}

function buildInterviewAnswer(context: ParsedContext): string {
  const { missing, matched } = compareRequirements(
    context.resumeText,
    context.jobText,
  );

  const prompts =
    missing.length > 0
      ? missing.slice(0, 5)
      : matched.slice(0, 5).map(
          (item) => `Tell me about your experience with ${item.toLowerCase()}.`,
        );

  if (prompts.length === 0) {
    return "The retrieved job excerpts do not contain enough requirement detail to suggest interview questions.";
  }

  return [
    `Interview preparation questions grounded in ${context.selectedJobId.replace("job-", "Job ")}:`,
    "",
    ...prompts.map(
      (item, index) =>
        `${index + 1}. ${item.endsWith("?") ? item : `How would you demonstrate experience with: ${item}?`}`,
    ),
    "",
    "Questions are derived from requirement bullets in the retrieved job text only.",
  ].join("\n");
}

function buildGeneralAnswer(context: ParsedContext): string {
  const { matched, missing, requirements, roleSkills } = compareRequirements(
    context.resumeText,
    context.jobText,
  );

  return [
    `Grounded summary for ${context.selectedJobId.replace("job-", "Job ")}:`,
    "",
    fitVerdict(matched.length, requirements.length, roleSkills.length, missing),
    "",
    roleSkills.length > 0 ? `CV skills relevant to this role: ${roleSkills.join(", ")}.` : "",
    matched.length > 0
      ? `Requirement bullets supported: ${matched.length} of ${requirements.length}.`
      : "No requirement bullets matched in retrieved excerpts.",
    missing.length > 0
      ? `Unclear in retrieved excerpts: ${missing.slice(0, 4).join("; ")}.`
      : "",
    "",
    "Ask about fit, skill gaps, alignment, or interview prep for a more focused answer.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function completeFromRetrievedContext(prompt: string): string {
  const parsed = parseGroundedPrompt(prompt);
  if (!parsed) {
    return "The answer is not in the uploaded or provided documents.";
  }

  switch (classifyQuestion(parsed.question)) {
    case "fit":
      return buildFitAnswer(parsed);
    case "gaps":
      return buildGapsAnswer(parsed);
    case "align":
      return buildAlignAnswer(parsed);
    case "interview":
      return buildInterviewAnswer(parsed);
    default:
      return buildGeneralAnswer(parsed);
  }
}
