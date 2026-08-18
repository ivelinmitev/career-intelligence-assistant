import { afterEach, describe, expect, it } from "vitest";

import { getLlmProviderFromEnv, resolveLlmProvider } from "@/src/llm";

const originalProvider = process.env.LLM_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) {
    delete process.env.LLM_PROVIDER;
  } else {
    process.env.LLM_PROVIDER = originalProvider;
  }
});

describe("LLM provider selection", () => {
  it("keeps an explicit local provider", async () => {
    process.env.LLM_PROVIDER = "local";
    expect(getLlmProviderFromEnv()).toBe("local");
    expect(await resolveLlmProvider()).toBe("local");
  });

  it("falls back to local when auto cannot reach Ollama", async () => {
    process.env.LLM_PROVIDER = "auto";
    process.env.OLLAMA_HOST = "http://127.0.0.1:9";
    expect(await resolveLlmProvider()).toBe("local");
  });
});
