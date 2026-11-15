import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    ".next-leak/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // Test helpers preloaded into Node with --require must be CommonJS.
    files: ["e2e/support/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
