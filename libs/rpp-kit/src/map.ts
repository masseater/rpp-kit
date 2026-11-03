import { parseRpp } from "./parse.ts";
import type { ParseError } from "./parse.ts";
import { outlineSong } from "./song.ts";
import { renderSegments, segmentsOf } from "./virtual.ts";

type Mapped =
  | Readonly<{ status: "ok"; code: string }>
  | Readonly<{ status: "error"; error: ParseError }>;

const mapRpp = (content: string): Mapped => {
  const parsed = parseRpp(content);
  if (parsed.status === "error") {
    return { status: "error", error: parsed.error };
  }
  const segments = segmentsOf({ outline: outlineSong(parsed.root), missing: [] });
  return { status: "ok", code: renderSegments({ content, segments }) };
};

export { mapRpp };
export type { Mapped };
