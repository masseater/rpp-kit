import { Array as Arr, Number as Num, Option, pipe } from "effect";

import type { Chunk, Line, Node, Param } from "./parse.ts";

type Query = Readonly<{ chunk: Chunk; token: string }>;

type ParamQuery = Readonly<{ chunk: Chunk; token: string; index: number }>;

const PARAM_INDEX = { first: 0, second: 1, third: 2, fourth: 3 } as const;

const ZERO = 0;

const linesOf = ({ chunk, token }: Query): readonly Line[] =>
  pipe(
    chunk.children,
    Arr.filter((node: Node): node is Line => node.kind === "line" && node.token === token),
  );

const chunksOf = ({ chunk, token }: Query): readonly Chunk[] =>
  pipe(
    chunk.children,
    Arr.filter((node: Node): node is Chunk => node.kind === "chunk" && node.token === token),
  );

const paramOf = ({ chunk, token, index }: ParamQuery): Option.Option<Param> =>
  pipe(
    Arr.head(linesOf({ chunk, token })),
    Option.flatMap((line) => Arr.get(line.params, index)),
  );

const numberOr =
  (fallback: number) =>
  (param: Option.Option<Param>): number =>
    pipe(
      param,
      Option.flatMap((found) => Num.parse(found.text)),
      Option.getOrElse(() => fallback),
    );

const textOf = (param: Option.Option<Param>): string =>
  Option.match(param, { onNone: () => "", onSome: (found) => found.text });

export { PARAM_INDEX, ZERO, chunksOf, linesOf, numberOr, paramOf, textOf };
export type { ParamQuery, Query };
