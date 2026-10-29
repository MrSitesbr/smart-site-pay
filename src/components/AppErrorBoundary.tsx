import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { reportarErro } from "@/lib/errorReport";

type State = { erro: Error | null };

/** Em vez de tela branca, mostra um aviso com opção de recarregar e registra o erro para a equipe. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    reportarErro("react", erro, info.componentStack || undefined);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="font-heading text-xl font-black">Não foi possível abrir esta página</h1>
          <p className="text-sm text-muted-foreground">
            Tente recarregar. Se continuar, atualize o navegador do celular ou abra pelo Google Chrome. A equipe já foi avisada do problema.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Recarregar
            </button>
            <a href="/" className="text-sm text-muted-foreground underline">Voltar ao início</a>
          </div>
        </div>
      </div>
    );
  }
}
