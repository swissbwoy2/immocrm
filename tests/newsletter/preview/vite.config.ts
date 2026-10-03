import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["tests/newsletter/preview/index.html"] },
  resolve: {
    alias: [
      {
        find: "@/features/newsletter/api",
        replacement: path.resolve("tests/newsletter/preview/mock-api.ts"),
      },
      { find: "@", replacement: path.resolve("src") },
    ],
  },
  server: { host: "127.0.0.1", port: 4178, strictPort: true },
});
