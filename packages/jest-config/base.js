/** @type {import('jest').Config} */
const config = {
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false, tsconfig: { strict: true } }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@template/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
  coverageReporters: ["lcov", "html", "text-summary"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
};

module.exports = config;
