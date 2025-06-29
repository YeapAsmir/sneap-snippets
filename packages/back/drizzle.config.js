"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: './snippets.db'
    },
    verbose: true,
    strict: true,
};
//# sourceMappingURL=drizzle.config.js.map