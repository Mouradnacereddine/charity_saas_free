/// <reference types="node" />
/**
 * Vercel Serverless Function entry.
 *
 * Le root package.json n'a plus "type": "module", donc tous les .js sont
 * CommonJS. On peut utiliser require() directement sur le backend compile.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require('./server-dist/index.js').default || require('./server-dist/index.js');

export default app;