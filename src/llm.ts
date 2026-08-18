import { localEmbedTexts } from "@/src/embeddings";
import { completeFromRetrievedContext } from "@/src/local-complete";
import type { Llm, LlmProvider } from "@/src/types";

const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_OLLAMA_EMBED_MODEL = "nomic-embed-text";
const DEFAULT_OLLAMA_CHAT_MODEL = "llama3.2";
const DEFAULT_GEMINI_EMBED_MODEL = "text-embedding-004";
const DEFAULT_GEMINI_CHAT_MODEL = "gemini-2.0-flash";

export class LocalLlm implements Llm {
  readonly provider: LlmProvider = "local";

  async embed(texts: string[]): Promise<number[][]> {
    return localEmbedTexts(texts);
  }

  async complete(prompt: string): Promise<string> {
    return completeFromRetrievedContext(prompt);
  }
}

export class OllamaLlm implements Llm {
  readonly provider: LlmProvider = "ollama";

  constructor(
    private readonly host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    private readonly embedModel =
      process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_OLLAMA_EMBED_MODEL,
    private readonly chatModel =
      process.env.OLLAMA_CHAT_MODEL ?? DEFAULT_OLLAMA_CHAT_MODEL,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.host}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.embedModel,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama embed failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as { embeddings?: number[][] };
    if (!payload.embeddings) {
      throw new Error("Ollama embed response did not include embeddings.");
    }

    return payload.embeddings;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.chatModel,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama complete failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as { response?: string };
    if (!payload.response) {
      throw new Error("Ollama complete response did not include text.");
    }

    return payload.response.trim();
  }
}

export class GeminiLlm implements Llm {
  readonly provider: LlmProvider = "gemini";

  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly embedModel =
      process.env.GEMINI_EMBED_MODEL ?? DEFAULT_GEMINI_EMBED_MODEL,
    private readonly chatModel =
      process.env.GEMINI_CHAT_MODEL ?? DEFAULT_GEMINI_CHAT_MODEL,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is required for Gemini embeddings.");
    }

    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.embedModel}:embedContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini embed failed (${response.status}): ${body}`);
      }

      const payload = (await response.json()) as {
        embedding?: { values?: number[] };
      };

      if (!payload.embedding?.values) {
        throw new Error("Gemini embed response did not include embedding values.");
      }

      embeddings.push(payload.embedding.values);
    }

    return embeddings;
  }

  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is required for Gemini completion.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.chatModel}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini complete failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini complete response did not include text.");
    }

    return text;
  }
}

export function createLlm(provider: LlmProvider = "local"): Llm {
  if (provider === "gemini") {
    return new GeminiLlm();
  }

  if (provider === "ollama") {
    return new OllamaLlm();
  }

  return new LocalLlm();
}

export function getLlmProviderFromEnv(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "local";
  if (provider === "gemini" || provider === "ollama" || provider === "local") {
    return provider;
  }

  return "local";
}

export async function isOllamaAvailable(
  host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
): Promise<boolean> {
  try {
    const response = await fetch(`${host}/api/tags`, {
      signal: AbortSignal.timeout(400),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * `LLM_PROVIDER=auto` (or unset in the chat path) uses Ollama when it is
 * reachable, otherwise the offline local completer. Explicit local/ollama/gemini
 * always wins. Tests that pass an Llm never hit this probe.
 */
export async function resolveLlmProvider(): Promise<LlmProvider> {
  const requested = process.env.LLM_PROVIDER ?? "auto";
  if (requested === "gemini" || requested === "ollama" || requested === "local") {
    return requested;
  }

  if (requested === "auto" && (await isOllamaAvailable())) {
    return "ollama";
  }

  return "local";
}

export function createLlmFromEnv(): Llm {
  return createLlm(getLlmProviderFromEnv());
}
