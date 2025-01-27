import svgr from "@svgr/rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import strip from "@rollup/plugin-strip";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

export default {
  input: "src/index.ts",
  output: [
    {
      dir: "dist",
      format: "cjs",
      sourcemap: true,
    },
    {
      dir: "dist",
      format: "esm",
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
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    postcss({
      extract: true,
      modules: true,
      sourcemap: true,
    }),
    svgr({
      svgo: true,
      svgoConfig: {
        plugins: [
          {
            name: "removeViewBox",
            active: false,
          },
          {
            name: "removeDimensions",
            active: true,
          },
        ],
      },
      titleProp: true,
      ref: true,
    }),
    json(),
    strip({
      include: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
      labels: ["client"],
    }),
  ],
  external: ["react", "react-dom"],
};
