
import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@timur00kh/whisper.wasm"]
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
});
