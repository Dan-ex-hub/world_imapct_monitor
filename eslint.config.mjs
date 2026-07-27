import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Several routes deal with untyped external boundaries (LLM JSON
      // responses, RSS/XML items, Supabase rows before mapping). `any` is a
      // deliberate escape hatch there rather than oversight — keep it visible
      // as a warning instead of failing CI on it.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone CommonJS dev script, run directly with `node` — not part of
    // the Next.js app, so require() is correct here rather than a violation.
    "clear-and-refetch.js",
  ]),
]);

export default eslintConfig;
