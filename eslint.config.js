import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "public/**"] },
  js.configs.recommended,
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
];
