import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 纯离线应用：base 使用相对路径，产物不引用任何外部地址
export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
  },
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
