export function friendlyError(error: unknown, fallback = "Não foi possível concluir a operação. Tente novamente.") {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("permission denied") || normalized.includes("row-level security") || normalized.includes("42501")) return "Sua sessão não permite realizar esta alteração. Entre novamente.";
  if (normalized.includes("contract_requests_status_check")) return "Não foi possível mover o contato para esta etapa.";
  if (normalized.includes("duplicate") || normalized.includes("unique")) return "Já existe um registro com essas informações.";
  if (normalized.includes("function") || normalized.includes("non-2xx") || normalized.includes("failed to fetch")) return "Não foi possível concluir a operação agora. Tente novamente em alguns instantes.";
  return fallback;
}