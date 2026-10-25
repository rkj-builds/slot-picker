import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/app";
import { installCookieStoreShim } from "@/app/cookie-store-shim";
import "@/styles/fonts.css";
import "@/styles/theme.css";

installCookieStoreShim();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
