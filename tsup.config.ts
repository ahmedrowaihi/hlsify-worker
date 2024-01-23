import { defineConfig } from "tsup";

export default defineConfig({
  entryPoints: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
  bundle: true,
});
