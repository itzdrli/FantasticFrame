import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors Nuxt's path aliases so app/shared modules (`~~/shared/render`,
// `~/types`, ...) resolve the same way they do inside the Nuxt build.
export default defineConfig({
  resolve: {
    alias: {
      "~~": fileURLToPath(new URL(".", import.meta.url)),
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
