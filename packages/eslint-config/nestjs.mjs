import tseslint from "typescript-eslint";
import globals from "globals";
import baseConfig from "./index.mjs";

export default tseslint.config(...baseConfig, {
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    "@typescript-eslint/no-extraneous-class": "off",
  },
});
