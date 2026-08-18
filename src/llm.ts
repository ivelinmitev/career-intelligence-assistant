import { localEmbedTexts } from "@/src/embeddings";
import type { Llm, LlmProvider } from "@/src/types";

const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_OLLAMA_EMBED_MODEL = "nomic-embed-text";
const DEFAULT_GEMINI_EMBED_MODEL = "text-embedding-004";

export class LocalLlm implements Llm {
  async embed(texts: string[]): Promise<number[][]> {
    return localEmbedTexts(texts);
  }

  async complete(_prompt: string): Promise<string> {
    throw new Error("LocalLlm completion is not implemented yet.");
  }
}

export class OllamaLlm implements Llm {
  constructor(
    private readonly host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    private readonly embedModel =
      process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_OLLAMA_EMBED_MODEL,
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

  async complete(_prompt: string): Promise<string> {
    throw new Error("Ollama completion is not implemented yet.");
  }
}

export class GeminiLlm implements Llm {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly embedModel =
      process.env.GEMINI_EMBED_MODEL ?? DEFAULT_GEMINI_EMBED_MODEL,
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

  async complete(_prompt: string): Promise<string> {
    throw new Error("Gemini completion is not implemented yet.");
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

export function createLlmFromEnv(): Llm {
  const provider = (process.env.LLM_PROVIDER ?? "local") as LlmProvider;
  return createLlm(provider);
}
