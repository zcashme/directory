import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

const typeScriptRules = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "@typescript-eslint/no-non-null-assertion": "warn",
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/prefer-readonly": "warn",
  "@typescript-eslint/prefer-nullish-coalescing": "warn",
  "react/jsx-uses-react": "off",
  "react/react-in-jsx-scope": "off",
  "react/prop-types": "off",
  "react/jsx-key": "error",
  "react/no-direct-mutation-state": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/no-unescaped-entities": "off",
  "react/jsx-no-target-blank": "error",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  eqeqeq: "error",
  "no-var": "error",
  "prefer-const": "error",
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "no-unused-expressions": "warn",
};

const tsFileGlobs = ["**/*.{ts,tsx,cts,mts}"];
const withTsFiles = (config) =>
  config.files
    ? config
    : {
        ...config,
        files: tsFileGlobs,
      };

export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "public/**"] },
  ...tseslint.configs["flat/recommended"].map(withTsFiles),
  ...tseslint.configs["flat/recommended-type-checked"].map(withTsFiles),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsparser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    rules: typeScriptRules,
  },
];
