import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { instalarCapturaDeErros } from "./lib/errorReport";
import "./index.css";

instalarCapturaDeErros();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);

// Avisa o index.html que o app abriu (desliga o aviso de "página não carregou").
(window as unknown as { __appIniciado?: boolean }).__appIniciado = true;
