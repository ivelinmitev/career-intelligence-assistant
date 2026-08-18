export function normalizeJobId(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (/^job-\d+$/.test(trimmed)) {
    return trimmed;
  }

  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch) {
    return `job-${numericMatch[1]}`;
  }

  return trimmed;
}

export function extractJobIdFromMessage(message: string): string | undefined {
  const patterns = [
    /\bjob\s*#?\s*(\d+)\b/i,
    /\brole\s*#?\s*(\d+)\b/i,
    /\bposition\s*#?\s*(\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return normalizeJobId(match[1]);
    }
  }

  return undefined;
}

export function resolveTargetJobId(
  message: string,
  selectedJobId?: string,
  availableJobIds: string[] = [],
): string | undefined {
  const mentionedJobId = extractJobIdFromMessage(message);
  const normalizedSelectedJobId = selectedJobId
    ? normalizeJobId(selectedJobId)
    : undefined;

  const candidates = [mentionedJobId, normalizedSelectedJobId].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    if (availableJobIds.length === 0 || availableJobIds.includes(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
