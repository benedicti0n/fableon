import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    settings: {
      next: {
        rootDir: "apps/web",
      },
    },
  },
  prettier,
  globalIgnores([
    "**/.next/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/dist/**",
    "**/out/**",
    "**/*.tsbuildinfo",
    "**/next-env.d.ts",
    "vendor/**",
  ]),
]);
