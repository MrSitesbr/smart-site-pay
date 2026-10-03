import * as vscode from "vscode";
import { OllamaClient, OllamaError, OllamaMessage } from "./ollama";

type ChatViewState = {
  messages: OllamaMessage[];
  selection?: string;
  attachedFile?: {
    name: string;
    content: string;
  };
  pendingContext: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  model: string;
};

let view: ChatView | undefined;

export function activate(context: vscode.ExtensionContext) {
  view = new ChatView(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("ollamaChat.open", () => view?.open()),
    vscode.commands.registerCommand("ollamaChat.addSelection", () => view?.addSelection()),
    vscode.commands.registerCommand("ollamaChat.addFile", () => view?.addActiveFile())
  );
}

export function deactivate() {
  view?.dispose();
}

class ChatView {
  private panel?: vscode.WebviewPanel;
  private messages: OllamaMessage[] = [];
  private selection?: string;
  private attachedFile?: ChatViewState["attachedFile"];
  private pendingContext = false;
  private busy = false;
  private readonly ollama: OllamaClient;

  constructor(private readonly extensionContext: vscode.ExtensionContext) {
    this.ollama = new OllamaClient();
  }

  open() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "ollamaChat",
      "Ollama Chat",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri(this.extensionContext), "media")]
      }
    );
    this.panel = panel;
    this.panel.webview.html = this.getHtml(this.panel.webview);
    const messageDisposable = this.panel.webview.onDidReceiveMessage(
      (message) => void this.handleWebviewMessage(message)
    );
    this.extensionContext.subscriptions.push(messageDisposable);
    this.panel.onDidDispose(() => {
      messageDisposable.dispose();
      this.panel = undefined;
    });
  }

  addSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage("Abra um arquivo e selecione o trecho que deseja enviar ao chat.");
      return;
    }
    if (editor.selection.isEmpty) {
      void vscode.window.showErrorMessage("Selecione um trecho do editor antes de usar Add Selection to Chat.");
      return;
    }

    this.selection = editor.document.getText(editor.selection);
    this.pendingContext = true;
    this.open();
    this.postMessage({ type: "contextAdded", name: "Seleção", content: this.selection });
    this.panel?.webview.postMessage({ type: "state", state: this.getState() });
  }

  addActiveFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage("Abra um arquivo para adicioná-lo ao chat.");
      return;
    }
    this.addDocument(editor.document);
  }

  private addDocument(document: vscode.TextDocument) {
    const name = vscode.workspace.asRelativePath(document.uri);
    const content = document.getText();
    if (!content) {
      void vscode.window.showErrorMessage("O arquivo selecionado está vazio.");
      return;
    }
    this.attachedFile = { name, content };
    this.pendingContext = true;
    this.open();
    this.postMessage({ type: "contextAdded", name, content });
    this.panel?.webview.postMessage({ type: "state", state: this.getState() });
  }

  private async handleWebviewMessage(message: unknown) {
    if (!message || typeof message !== "object") return;
    const payload = message as { type?: string; text?: string; name?: string; content?: string };
    if (payload.type === "ready") return;
    if (payload.type === "clear") {
      this.messages = [];
      this.selection = undefined;
      this.attachedFile = undefined;
      this.pendingContext = false;
      this.postMessage({ type: "state", state: this.getState() });
      return;
    }
    if (payload.type === "upload") {
      if (typeof payload.name === "string" && typeof payload.content === "string") {
        this.handleFileUpload(payload.content, payload.name);
      }
      return;
    }
    if (payload.type !== "send") return;
    if (!payload.text?.trim() || this.busy) return;
    this.busy = true;
    this.postMessage({ type: "busy", value: true });

    const config = this.getConfig();
    const userContent = this.buildUserContent(payload.text.trim(), config);
    const userMessage: OllamaMessage = { role: "user", content: userContent };
    this.messages.push(userMessage);
    this.selection = undefined;
    this.attachedFile = undefined;
    this.pendingContext = false;
    this.postMessage({ type: "userMessage", message: userMessage });
    this.panel?.webview.postMessage({ type: "state", state: this.getState() });

    try {
      const response = await this.ollama.chat(this.messages, config);
      this.messages.push(response);
      this.postMessage({ type: "assistantMessage", message: response });
    } catch (error) {
      this.postMessage({ type: "error", error: this.formatError(error) });
    } finally {
      this.busy = false;
      this.postMessage({ type: "busy", value: false });
    }
  }

  private buildUserContent(text: string, config: ReturnType<ChatView["getConfig"]>): string {
    const pieces: string[] = [];
    if (this.selection) {
      pieces.push(`Contexto: seleção do editor\n<selection>\n${this.selection}\n</selection>`);
    }
    if (this.attachedFile) {
      const content = this.attachedFile.content.slice(0, config.contextCharacters);
      const suffix = this.attachedFile.content.length > config.contextCharacters ? "\n\n[conteúdo truncado pelo limite de caracteres]" : "";
      pieces.push(`Contexto: arquivo ${this.attachedFile.name}\n<file path="${this.attachedFile.name}">\n${content}${suffix}\n</file>`);
    }
    pieces.push(`Mensagem do usuário:\n${text}`);
    return pieces.join("\n\n");
  }

  private getConfig() {
    const config = vscode.workspace.getConfiguration("ollamaChat");
    return {
      host: config.get<string>("host", "http://127.0.0.1:11434").replace(/\/$/, ""),
      model: config.get<string>("model", "qwen2.5-coder").trim(),
      maxInputTokens: config.get<number>("maxInputTokens", 12000),
      maxOutputTokens: config.get<number>("maxOutputTokens", 2048),
      contextCharacters: config.get<number>("contextCharacters", 50000)
    };
  }

  private getState(): ChatViewState {
    const config = this.getConfig();
    return {
      messages: this.messages,
      selection: this.selection,
      attachedFile: this.attachedFile,
      pendingContext: this.pendingContext,
      maxInputTokens: config.maxInputTokens,
      maxOutputTokens: config.maxOutputTokens,
      model: config.model
    };
  }

  private handleFileUpload(content: string, name: string) {
    const maxBytes = 20 * 1024 * 1024;
    const decoded = this.decodeUpload(content);
    if (decoded.length > maxBytes) {
      this.postMessage({ type: "error", error: `O arquivo ${name} excede 20 MB.` });
      return;
    }
    const extension = name.split(".").pop()?.toLowerCase();
    if (extension === "pdf" || extension === "wav" || extension === "mp3" || extension === "m4a") {
      this.postMessage({ type: "error", error: `${name} é binário. PDF requer extração de texto e áudio requer transcrição antes de ser enviado ao Ollama.` });
      return;
    }
    this.attachedFile = { name, content: decoded };
    this.pendingContext = true;
    this.postMessage({ type: "contextAdded", name, content: decoded });
    this.panel?.webview.postMessage({ type: "state", state: this.getState() });
  }

  private decodeUpload(content: string): string {
    return new TextDecoder().decode(Uint8Array.from(atob(content), (char) => char.charCodeAt(0)));
  }

  private postMessage(message: unknown) {
    void this.panel?.webview.postMessage(message);
  }

  private formatError(error: unknown): string {
    if (error instanceof OllamaError) {
      if (error.code === "connection") {
        return "Não foi possível conectar ao Ollama. Inicie-o com `ollama serve` ou abra o aplicativo Ollama.";
      }
      if (error.code === "model") {
        return `O modelo "${error.model}" não está instalado. Execute: \`ollama pull ${error.model}\` (ou \`ollama run ${error.model}\`).`;
      }
      if (error.code === "generate") {
        return `O Ollama rejeitou a solicitação: ${error.message}`;
      }
    }
    return error instanceof Error ? error.message : "Erro inesperado ao falar com o Ollama.";
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri(this.extensionContext), "media", "chat.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri(this.extensionContext), "media", "chat.css"));
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Ollama Chat</title>
</head>
<body>
  <header>
    <div>
      <h1>Ollama Chat</h1>
      <p>Conversa local com o modelo <strong id="model-name"></strong></p>
    </div>
    <button id="clear" type="button" title="Limpar conversa">Limpar</button>
  </header>
  <div id="messages" role="log" aria-live="polite"></div>
  <div id="status" class="status"></div>
  <section id="composer" aria-label="Mensagem para o Ollama">
    <div id="context" class="context"></div>
    <textarea id="prompt" rows="3" placeholder="Pergunte sobre o código... Use Ctrl+Enter para enviar."></textarea>
    <div class="composer-actions">
      <label class="attach-button" for="file">Anexar arquivo</label>
      <input id="file" type="file" accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.yaml,.yml,.pdf,.wav,.mp3,.m4a" />
      <span id="limits" class="limits"></span>
      <button id="send" type="button">Enviar</button>
    </div>
  </section>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose() {
    this.panel?.dispose();
    this.panel = undefined;
  }
}

function extensionUri(context: vscode.ExtensionContext): vscode.Uri {
  return context.extensionUri;
}
