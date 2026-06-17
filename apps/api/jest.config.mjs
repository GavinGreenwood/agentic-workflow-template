import base from "@template/jest-config/nestjs";

/** @type {import('jest').Config} */
const config = {
  ...base,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/main.ts",
    "!src/**/*.module.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
  },
};

export default config;
