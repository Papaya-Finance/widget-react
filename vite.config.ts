import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: "./playground",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./playground/index.html"),
    },
  },
});
