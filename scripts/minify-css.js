#!/usr/bin/env node
// Simple CSS minifier using esbuild
// Usage: node scripts/minify-css.js style.css style.min.css
const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function main() {
  const [,, inFile = 'style.css', outFile = 'style.min.css'] = process.argv;
  const absIn = path.resolve(inFile);
  const absOut = path.resolve(outFile);
  if (!fs.existsSync(absIn)) {
    console.error(`Input not found: ${absIn}`);
    process.exit(1);
  }
  await build({
    entryPoints: [absIn],
    outfile: absOut,
    bundle: true,
    minify: true,
    loader: { '.css': 'css' },
    logLevel: 'silent',
  });
  console.log(`Minified -> ${absOut}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
