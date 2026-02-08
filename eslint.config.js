import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "public/**"] },
  js.configs.recommended,
  // JavaScript/JSX configuration
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      // React (JSX transform — no import needed)
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-key": "error",
      "react/no-direct-mutation-state": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/no-unescaped-entities": "off",
      "react/jsx-no-target-blank": "error",

      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Errors
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",

      // Warnings
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-expressions": "warn",
    },
  },
  // TypeScript/TSX configuration
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2020,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    rules: {
      // TypeScript recommended rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React (JSX transform — no import needed)
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-key": "error",
      "react/no-direct-mutation-state": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/no-unescaped-entities": "off",
      "react/jsx-no-target-blank": "error",

      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Errors
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",

      // Warnings
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
