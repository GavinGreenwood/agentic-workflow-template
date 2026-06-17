const base = require("./base.js");

/** @type {import('jest').Config} */
const config = {
  ...base,
  testEnvironment: "jsdom",
  testRegex: ".*\\.test\\.tsx?$",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: false,
        tsconfig: { strict: true, jsx: "react-jsx" },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(next-intl|use-intl)/)"],
};

module.exports = config;
