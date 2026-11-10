import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const config = {
  resolve: {
    alias: [
      { find: /^@fableon\/(.+)$/, replacement: path.join(root, "packages/$1/src/index.ts") },
      { find: /^@\//, replacement: `${path.join(root, "apps/web")}/` },
    ],
  },
  build: {
    outDir: "/private/var/folders/cr/8rgz9nyd2_j5gqhftt3_97gc0000gn/T/opencode/stage2c4/bundle",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: path.resolve(import.meta.dirname, "renderer-entry.ts"),
      formats: ["iife"],
      name: "FableonStage2C4Bundle",
      fileName: () => "renderer.js",
    },
  },
};
export default config;
