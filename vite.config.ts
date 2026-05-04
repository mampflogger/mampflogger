import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const BUILD_VERSION = Date.now().toString();

function versionFilePlugin() {
  return {
    name: "mampflogger-version-file",
    apply: "build" as const,
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, "dist");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
          path.join(outDir, "version.json"),
          JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() }),
        );
      } catch (err) {
        console.warn("[version-file] failed to write", err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionFilePlugin(),
  ].filter(Boolean),
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
