/**
 * Vercel Serverless Function entry.
 *
 * The backend (server/dist/index.js) compiles in CommonJS ("module": "commonjs"
 * in server/tsconfig.json), while the root package.json declares
 * "type": "module" (ESM). We use createRequire() to load the CJS module
 * from within an ESM context.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _app = require('./server-dist/index.js');
export default _app.default || _app;