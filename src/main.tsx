import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Aplica o tema antes do React pintar (evita flash)
(() => {
  const stored =
    localStorage.getItem("nexo:theme") ??
    localStorage.getItem("financeiro:theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme =
    stored === "dark" || stored === "light"
      ? stored
      : prefersDark
        ? "dark"
        : "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
