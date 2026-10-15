import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/app";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "@/styles/theme.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
