export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

import { limitConversation } from "./token-limit";

export class OllamaError extends Error {
  constructor(
    public readonly code: "connection" | "model" | "generate",
    message: string,
    public readonly model = ""
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export class OllamaClient {
  private lastRequestBody = "";

  async chat(messages: OllamaMessage[], options: { host: string; model: string; maxInputTokens: number; maxOutputTokens: number }): Promise<OllamaMessage> {
    await this.ensureModel(options.host, options.model);
    const body = {
      model: options.model,
      messages: limitConversation(messages, options.maxInputTokens),
      stream: false,
      options: {
        num_predict: options.maxOutputTokens
      }
    };
    this.lastRequestBody = JSON.stringify(body);

    let response: Response;
    try {
      response = await fetch(options.host + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: this.lastRequestBody
      });
    } catch (error) {
      throw new OllamaError("connection", error instanceof Error ? error.message : "Falha de conexão");
    }

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 404 || /model.*not found|model not found|try pulling/i.test(detail)) {
        throw new OllamaError("model", detail || "Modelo não encontrado", options.model);
      }
      throw new OllamaError("generate", detail || `HTTP ${response.status}`);
    }

    const data = await response.json() as { message?: { role?: string; content?: string }; error?: string };
    if (data.error) {
      if (/model.*not found|model not found|try pulling/i.test(data.error)) {
        throw new OllamaError("model", data.error, options.model);
      }
      throw new OllamaError("generate", data.error);
    }
    if (!data.message?.content) {
      throw new OllamaError("generate", "Resposta do Ollama sem conteúdo");
    }
    return { role: "assistant", content: data.message.content };
  }

  async ensureModel(host: string, model: string): Promise<void> {
    if (!model) throw new OllamaError("model", "Nenhum modelo configurado");
    let response: Response;
    try {
      response = await fetch(host + "/api/tags");
    } catch (error) {
      throw new OllamaError("connection", error instanceof Error ? error.message : "Falha de conexão");
    }
    if (!response.ok) {
      throw new OllamaError("connection", `Ollama respondeu HTTP ${response.status} em /api/tags`);
    }
    const data = await response.json() as { models?: Array<{ name?: string; model?: string }> };
    const available = new Set((data.models ?? []).flatMap((entry) => [entry.name, entry.model]).filter(Boolean));
    if (!available.has(model) && ![...available].some((name) => name.startsWith(`${model}:`))) {
      throw new OllamaError("model", `O modelo ${model} não está disponível`, model);
    }
  }
}
