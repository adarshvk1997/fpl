import { defineConfig } from "vitest/config";
import path from "path";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      // "server-only" unconditionally throws when imported — Next.js relies
      // on its own bundler to keep it out of client bundles, not a runtime
      // environment check, so it has no idea it's "fine" under Vitest/Node.
      // Swap it for a no-op just for the test run; the real app build still
      // gets the real package and its actual server/client enforcement.
      "server-only": path.resolve(root, "./src/lib/testing/server-only-stub.ts"),
    },
  },
});
