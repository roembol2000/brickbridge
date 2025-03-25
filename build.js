// BrickBridge - Copyright (c) 2025 Roemer Peters - MIT License

import esbuild from "esbuild";

const sharedOptions = {
  entryPoints: ["src/index.js"],
  bundle: true,
  sourcemap: true,
  target: ["es2018"],
};

// esm build
esbuild
  .build({
    ...sharedOptions,
    format: "esm",
    outfile: "dist/brickbridge.js",
    minify: false,
  })
  .then(() => {
    console.log("ESM build complete.");
  });

// umd build
esbuild
  .build({
    ...sharedOptions,
    format: "iife",
    globalName: "BrickBridge",
    outfile: "dist/brickbridge.umd.js",
    minify: true,
  })
  .then(() => {
    console.log("UMD build complete.");
  });

esbuild
  .build({
    ...sharedOptions,
    format: "iife",
    globalName: "BrickBridge",
    outfile: "dist/brickbridge.umd.dev.js",
    minify: false,
  })
  .then(() => {
    console.log("UMD dev build complete.");
  });
