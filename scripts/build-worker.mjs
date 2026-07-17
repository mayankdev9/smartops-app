// Pre-bundle the upload Web Worker into a plain JS file in /public.
//
// Next's Turbopack build does NOT compile `new Worker(new URL('./x.ts', ...))`
// (it emits the raw .ts as a static asset, which the browser can't run), so the
// worker silently fails in production and the upload falls back to the main
// thread — freezing the tab. Bundling it ourselves with esbuild is
// bundler-independent and reliably produces a runnable classic worker.

import { build } from "esbuild";

// SheetJS references a few node builtins behind runtime guards; stub them empty
// for the browser worker (we only read from an ArrayBuffer, never the fs).
const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(b) {
    const filter = /^(fs|crypto|stream|path|os|child_process|events|util)$/;
    b.onResolve({ filter }, (args) => ({ path: args.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "module.exports = {};", loader: "js" }));
  },
};

await build({
  entryPoints: ["lib/upload.worker.ts"],
  bundle: true,
  outfile: "public/upload-worker.js",
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  plugins: [stubNodeBuiltins],
  logLevel: "info",
});

console.log("✓ built public/upload-worker.js");
