export default {
  '*.{ts,tsx,js,jsx,json,md,css,yml,yaml,html}': ['prettier --write'],
  '*.{ts,tsx,js,jsx}': ['eslint --fix'],
  '**': ['secretlint'],
};
