/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Same-origin by design: in development the browser talks to Vite, and Vite
// forwards /api, /health and /robots.txt to the Tornova API. The API address is
// configuration (TORNOVA_API_ORIGIN), never a literal in application code, and the
// built site is served by the API itself - so production needs no CORS at all.
// The Content-Security-Policy is added to the BUILT page only: the Vite dev server
// needs inline scripts and a websocket for hot reload, production needs neither.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'";
const cspAtBuild = (): Plugin => ({
  name: "tornova-csp",
  apply: "build",
  transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "TORNOVA_");
  const api = env.TORNOVA_API_ORIGIN || "http://localhost:5234";
  return {
    plugins: [react(), cspAtBuild()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: api, changeOrigin: false, secure: false },
        "/health": { target: api, changeOrigin: false, secure: false },
        "/robots.txt": { target: api, changeOrigin: false, secure: false },
      },
    },
    build: { outDir: "dist", sourcemap: false, target: "es2022" },
    test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"], css: false },
  };
});
