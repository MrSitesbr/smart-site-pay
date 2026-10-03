(() => {
  const vscode = acquireVsCodeApi();
  const messages = document.getElementById("messages");
  const prompt = document.getElementById("prompt");
  const send = document.getElementById("send");
  const clear = document.getElementById("clear");
  const status = document.getElementById("status");
  const context = document.getElementById("context");
  const file = document.getElementById("file");
  const limits = document.getElementById("limits");
  const modelName = document.getElementById("model-name");
  let state = { model: "qwen2.5-coder", maxInputTokens: 12000, maxOutputTokens: 2048 };

  const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));

  function renderMessage(role, content) {
    const article = document.createElement("article");
    article.className = `message ${role}`;
    const label = document.createElement("strong");
    label.textContent = role === "user" ? "Você" : role === "assistant" ? "Ollama" : "Sistema";
    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = content;
    article.append(label, body);
    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderState(next) {
    state = { ...state, ...next };
    modelName.textContent = state.model;
    limits.textContent = `Entrada máx. ~${state.maxInputTokens.toLocaleString()} tokens · resposta ${state.maxOutputTokens.toLocaleString()} tokens`;
    context.replaceChildren();
    const pending = [];
    if (next.selection) pending.push("Seleção anexada");
    if (next.attachedFile) pending.push(`${next.attachedFile.name} anexado`);
    if (pending.length) {
      const badge = document.createElement("span");
      badge.className = "context-badge";
      badge.textContent = pending.join(" · ");
      context.appendChild(badge);
    }
  }

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
    status.hidden = !message;
  }

  send.addEventListener("click", () => {
    const text = prompt.value.trim();
    if (!text) return;
    prompt.value = "";
    vscode.postMessage({ type: "send", text });
  });
  prompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      send.click();
    }
  });
  clear.addEventListener("click", () => vscode.postMessage({ type: "clear" }));
  file.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (extension === "pdf" || extension === "wav" || extension === "mp3" || extension === "m4a") {
      setStatus(`${selected.name}: PDF/áudio precisa de um extrator ou transcriber externo; o conteúdo binário não foi enviado.`, true);
      file.value = "";
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setStatus(`${selected.name} excede 20 MB.`, true);
      file.value = "";
      return;
    }
    const bytes = new Uint8Array(await selected.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    vscode.postMessage({ type: "upload", name: selected.name, content: btoa(binary) });
    file.value = "";
  });
  window.addEventListener("message", (event) => {
    const payload = event.data;
    if (payload.type === "ready") return;
    if (payload.type === "busy") {
      send.disabled = payload.value;
      prompt.disabled = payload.value;
      if (payload.value) setStatus("Ollama está pensando...");
      else setStatus("");
      return;
    }
    if (payload.type === "state") {
      renderState(payload.state);
      if (payload.state.messages) {
        messages.replaceChildren();
        payload.state.messages.forEach((message) => renderMessage(message.role, message.content));
      }
    }
    if (payload.type === "userMessage") renderMessage(payload.message.role, payload.message.content);
    if (payload.type === "assistantMessage") {
      renderMessage(payload.message.role, payload.message.content);
      setStatus("");
    }
    if (payload.type === "contextAdded") {
      renderState({ selection: payload.name === "Seleção" ? "selected" : undefined, attachedFile: payload.name === "Seleção" ? undefined : { name: payload.name, content: payload.content } });
    }
    if (payload.type === "error") {
      setStatus(payload.error, true);
    }
  });
  vscode.postMessage({ type: "ready" });
})();
