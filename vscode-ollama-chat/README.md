# Ollama Chat para VS Code

Extensão local que conversa com a API HTTP do [Ollama](https://ollama.com/) sem enviar o código para um serviço externo.

## Requisitos

1. Instale o Ollama.
2. Baixe o modelo configurado (padrão: `qwen2.5-coder`):

   ```sh
   ollama run qwen2.5-coder
   ```

3. Inicie o Ollama com `ollama serve` ou abra o aplicativo. No Windows, o serviço da bandeja pode já estar iniciado.

> Se o comando **Ollama Chat: Open Chat** não aparecer na paleta, a extensão ainda não está instalada nesta janela. Abra `vscode-ollama-chat` no VS Code, execute `npm install` e `npm run compile`, pressione `F5` e faça o reload da janela de desenvolvimento; para uso normal, gere o `.vsix` com `npm run package` e instale-o por **Extensions: Install from VSIX...**.

## Desenvolvimento

```sh
npm install
npm run compile
```

Pressione `F5` no VS Code para iniciar uma janela de desenvolvimento da extensão, ou use `npm run package` para gerar o `.vsix`.

Abra a paleta com `Ctrl+Shift+P` (Windows/Linux) ou `Cmd+Shift+P` (macOS) e execute **Ollama Chat: Open Chat**.

## Contexto

- **Add Selection to Chat** adiciona a seleção do editor à próxima mensagem.
- **Add Active File to Chat** adiciona o arquivo aberto, respeitando `ollamaChat.contextCharacters`.
- O botão de anexo no painel permite escolher um arquivo de texto/código. PDFs e áudio são detectados e rejeitados com uma mensagem clara: PDF precisa de extração de texto e áudio precisa de transcrição antes de ser enviado ao Ollama.

## Configuração

As opções ficam em **Settings > Ollama Chat**. O limite de entrada é aproximado porque a contagem de tokens depende do modelo; a extensão limita o contexto e solicita um número conservador de tokens de saída.

## Build

Não é necessário Webpack. A extensão usa `tsc` para gerar `out/extension.js`; o VS Code executa o JavaScript resultante. O `@vscode/vsce` empacota o resultado em um `.vsix`.
