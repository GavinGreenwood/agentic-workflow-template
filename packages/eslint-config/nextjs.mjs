import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";
import baseConfig from "./index.mjs";

export default tseslint.config(...baseConfig, {
  plugins: {
    react: reactPlugin,
    "react-hooks": reactHooksPlugin,
    "jsx-a11y": jsxA11yPlugin,
    "@next/next": nextPlugin,
  },
  settings: {
    react: { version: "detect" },
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    ...jsxA11yPlugin.configs.recommended.rules,
    ...nextPlugin.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
  },
});
