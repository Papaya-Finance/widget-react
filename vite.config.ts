import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: "./playground", // Set the playground folder as the root
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"), // Alias for your src folder
    },
  },
});
