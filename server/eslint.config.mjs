// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "error",
    },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: {
      // CLI migration/seed scripts print progress to stdout by design; SEC-040's
      // structured-logger requirement targets the running application, not one-off ops tooling.
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "coverage/**", "drizzle/**", "eslint.config.mjs"],
  },
);
