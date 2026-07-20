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
    // Pin the React version explicitly. ESLint 10 removed the deprecated
    // `context.getFilename()` API that eslint-plugin-react@7.37.5 relies on for
    // "detect" auto-detection, which crashes rule loading. Pinning skips that
    // code path. Revert to "detect" once eslint-plugin-react supports ESLint 10.
    react: { version: "19" },
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    ...jsxA11yPlugin.configs.recommended.rules,
    ...nextPlugin.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
  },
});
