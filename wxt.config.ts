import { defineConfig } from 'wxt';
export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifest: {
    permissions: ["storage", "sidePanel"],
    host_permissions: ["https://chatgpt.com/*"]
  }
});
