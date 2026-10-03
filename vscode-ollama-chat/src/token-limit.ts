const APPROX_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

export function limitMessageText(text: string, maxTokens: number): string {
  const maxCharacters = Math.max(0, Math.floor(maxTokens * APPROX_CHARS_PER_TOKEN));
  if (text.length <= maxCharacters) return text;
  return `${text.slice(0, maxCharacters)}\n\n[conteúdo truncado pelo limite de tokens]`;
}

export function limitConversation<T extends { content: string }>(messages: T[], maxInputTokens: number): T[] {
  const maxCharacters = Math.max(0, Math.floor(maxInputTokens * APPROX_CHARS_PER_TOKEN));
  const limited: T[] = [];
  let usedCharacters = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const remaining = maxCharacters - usedCharacters;
    if (remaining <= 0) break;
    const content = message.content.length <= remaining
      ? message.content
      : `${message.content.slice(0, remaining)}\n\n[conteúdo truncado pelo limite de tokens]`;
    limited.unshift({ ...message, content });
    usedCharacters += content.length;
  }

  return limited;
}
