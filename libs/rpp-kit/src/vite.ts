import type { Plugin } from "vite-plus";

import { readSong } from "./read.ts";

const rpp = (): Plugin => ({
  name: "rpp-kit",
  transform: {
    filter: { id: /\.rpp$/iu },
    handler: (code) => ({
      code: `export const song = ${JSON.stringify(readSong(code))};\nexport default song;\n`,
    }),
  },
});

export { rpp };
