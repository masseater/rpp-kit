import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { rpp } from "rpp-kit/vite";
import { defineConfig } from "vite-plus";

import { externalizeInlineScripts } from "./inline-scripts.ts";

export default defineConfig({
  run: {
    tasks: {
      typecheck: "tsc --runExternalCode",
      deploy: { command: "alchemy deploy", cache: false },
      destroy: { command: "alchemy destroy", cache: false },
    },
  },
  resolve: { tsconfigPaths: true },
  test: { include: ["*.test.ts"] },
  plugins: [
    rpp(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/app",
      prerender: { enabled: true, crawlLinks: true, failOnError: true },
    }),
    viteReact(),
    externalizeInlineScripts(),
  ],
});
