import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOVABLE_TOKEN_PARAM = "__lovable_token";
const LOVABLE_TOKEN_SESSION_KEY = "mampflogger-lovable-preview-token";

function handleLovablePreviewToken(): void {
  const isPreviewHost = window.location.hostname.endsWith("lovableproject.com");
  if (!isPreviewHost) return;

  const params = new URLSearchParams(window.location.search);
  const currentToken = params.get(LOVABLE_TOKEN_PARAM);

  if (currentToken) {
    sessionStorage.setItem(LOVABLE_TOKEN_SESSION_KEY, currentToken);
    return;
  }

  const storedToken = sessionStorage.getItem(LOVABLE_TOKEN_SESSION_KEY);
  if (!storedToken) return;

  params.set(LOVABLE_TOKEN_PARAM, storedToken);
  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
}

handleLovablePreviewToken();

createRoot(document.getElementById("root")!).render(<App />);

