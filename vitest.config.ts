import { defineConfig } from "vitest/config";
import path from "node:path";

const testUrl = process.env.TEST_DATABASE_URL ?? "postgresql://borrowly:borrowly@127.0.0.1:5433/borrowly_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next's server-only guard throws outside the React Server runtime; it is a no-op in tests.
      "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    // Integration files share one test database, so run files sequentially.
    fileParallelism: false,
    env: { DATABASE_URL: testUrl, DIRECT_URL: testUrl, NODE_ENV: "test" },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
