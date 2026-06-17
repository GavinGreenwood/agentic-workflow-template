export default {
  "*.{ts,tsx,js,jsx,mjs,cjs,json,md,css,yml,yaml,html}": ["prettier --write"],
  "*.{ts,tsx,js,jsx}": ["eslint --fix"],
  "**": ["secretlint"],
};
