import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Volta para a página em que o usuário estava antes. Se a página foi aberta direto
 * (link, nova aba, F5 sem histórico no app), vai para o destino padrão informado.
 */
export function useVoltar(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

/** Endereço do admin já aberto na aba indicada. */
export const adminAba = (aba: string) => `/admin?aba=${aba}`;
