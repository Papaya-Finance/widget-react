import svgr from "@svgr/rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
import json from "@rollup/plugin-json";
import postcss from "rollup-plugin-postcss";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs", // CommonJS format
      sourcemap: true,
      exports: "named",
    },
    {
      file: "dist/index.esm.js",
      format: "esm", // ES Modules format
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    postcss(),
    svgr({
      svgo: true, // Optimize SVGs
      titleProp: true,
      ref: true,
    }),
    url({
      include: ["**/*.svg"], // Apply to all SVGs
      limit: Infinity, // Set limit to 0 to always emit URLs (no inlining)
      emitFiles: true,
      fileName: "assets/[name][hash][extname]", // Custom path for output
    }),
    json(),
  ],
  external: ["react", "react-dom"],
};
