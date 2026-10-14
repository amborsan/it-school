import config from "./jest.config.js";

export default {
  ...config,
  testPathIgnorePatterns: ["/node_modules/"],
  testMatch: ["<rootDir>/test/supabase.test.js"],
  testTimeout: 30000,
  extensionsToTreatAsEsm: [".ts"],
  transform: { "^.+\\.ts$": "<rootDir>/test/strip-types.cjs" },
};
