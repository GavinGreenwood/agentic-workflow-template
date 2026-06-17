import base from '@template/jest-config/nextjs';

/** @type {import('jest').Config} */
const config = {
  ...base,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
