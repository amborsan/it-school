const { stripTypeScriptTypes } = require("node:module");

// The Prisma generator emits TypeScript; Jest's VM needs plain JavaScript.
module.exports = {
  process(source, filename) {
    return { code: stripTypeScriptTypes(source, { sourceUrl: filename }) };
  },
};
