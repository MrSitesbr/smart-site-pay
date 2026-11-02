import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { instalarCapturaDeErros } from "./lib/errorReport";
import "./index.css";

instalarCapturaDeErros();

// Tradutor do navegador e algumas extensões trocam o texto da página por baixo do React,
// o que fazia a tela quebrar ("removeChild"/"insertBefore") ao atualizar a agenda.
// Em vez de quebrar, ignora o nó que já não está onde o React esperava.
if (typeof Node === "function" && Node.prototype) {
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, novo: T, referencia: Node | null): T {
    if (referencia && referencia.parentNode !== this) return insertBefore.call(this, novo, null) as T;
    return insertBefore.call(this, novo, referencia) as T;
  };
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);

// Avisa o index.html que o app abriu (desliga o aviso de "página não carregou").
(window as unknown as { __appIniciado?: boolean }).__appIniciado = true;
