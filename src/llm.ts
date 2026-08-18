import type { Llm, LlmProvider } from "@/src/types";

export class OllamaLlm implements Llm {
  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error("Ollama embeddings are not implemented yet.");
  }

  async complete(_prompt: string): Promise<string> {
    throw new Error("Ollama completion is not implemented yet.");
  }
}

export class GeminiLlm implements Llm {
  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error("Gemini embeddings are not implemented yet.");
  }

  async complete(_prompt: string): Promise<string> {
    throw new Error("Gemini completion is not implemented yet.");
  }
}

export function createLlm(provider: LlmProvider): Llm {
  if (provider === "gemini") {
    return new GeminiLlm();
  }

  return new OllamaLlm();
}
