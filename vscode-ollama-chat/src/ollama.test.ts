import { describe, expect, it } from "vitest";
import { limitConversation, limitMessageText } from "./token-limit";

describe("token limit", () => {
  it("preserva o final mais recente da conversa", () => {
    const messages = [
      { role: "system", content: "a".repeat(40) },
      { role: "user", content: "b".repeat(40) },
      { role: "assistant", content: "c".repeat(40) }
    ] as const;

    const limited = limitConversation(messages, 12);

    expect(limited.at(-1)?.content).toContain("c");
    expect(limited).toHaveLength(1);
  });

  it("trunca mensagens de entrada e identifica o corte", () => {
    const result = limitMessageText("x".repeat(100), 5);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toContain("[conteúdo truncado pelo limite de tokens]");
  });
});
