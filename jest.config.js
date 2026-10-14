export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/test/supabase.test.js"],
  setupFiles: ["<rootDir>/test/security-env.cjs"],
  transform: {},
};
