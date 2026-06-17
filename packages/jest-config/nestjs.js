const base = require("./base.js");

/** @type {import('jest').Config} */
const config = {
  ...base,
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
};

module.exports = config;
