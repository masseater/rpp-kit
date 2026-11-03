import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

type Param = Readonly<{ text: string; start: number; end: number }>;

type Line = Readonly<{
  kind: "line";
  token: string;
  params: readonly Param[];
  start: number;
  end: number;
}>;

type Chunk = Readonly<{
  kind: "chunk";
  token: string;
  params: readonly Param[];
  children: readonly Node[];
  start: number;
  end: number;
}>;

type Node = Chunk | Line;

type ParseError = Readonly<{ message: string; start: number; end: number }>;

type ParseResult =
  | Readonly<{ status: "ok"; root: Chunk }>
  | Readonly<{ status: "error"; error: ParseError }>;

type Frame = Readonly<{
  token: string;
  params: readonly Param[];
  children: readonly Node[];
  start: number;
}>;

type State = Readonly<{
  stack: readonly Frame[];
  root: Option.Option<Chunk>;
  error: Option.Option<ParseError>;
}>;

type Span = Readonly<{ text: string; start: number; end: number }>;

const PATTERNS = {
  line: { regex: /^[\t ]*(?<body>\S(?:.*\S)?)[\t ]*$/dgmu, groups: ["body"] },
  param: {
    regex: /"(?<double>[^"]*)"|'(?<single>[^']*)'|`(?<back>[^`]*)`|(?<bare>[^\s"'`]\S*)/dgu,
    groups: ["double", "single", "back", "bare"],
  },
} as const;

const START = 0;

const OPEN = "<";

const CLOSE = ">";

const LAST = 1;

const EMPTY_STATE: State = { stack: [], root: Option.none(), error: Option.none() };

const spans = (text: string, kind: keyof typeof PATTERNS, offset: number): readonly Span[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(PATTERNS[kind].regex)(text)),
    Arr.flatMap((match) =>
      Arr.fromOption(
        Arr.findFirst(PATTERNS[kind].groups, (group: string) =>
          pipe(
            Option.fromNullishOr(match.indices),
            Option.flatMapNullishOr((indices) => indices.groups),
            Option.flatMapNullishOr((byGroup) => byGroup[group]),
            Option.map(([start, end]) => ({
              text: Str.slice(start, end)(text),
              start: offset + start,
              end: offset + end,
            })),
          ),
        ),
      ),
    ),
  );

const head = (params: readonly Param[]): Readonly<{ token: string; rest: readonly Param[] }> =>
  Arr.matchLeft(params, {
    onEmpty: () => ({ token: "", rest: Arr.empty<Param>() }),
    onNonEmpty: (first, rest) => ({ token: first.text, rest }),
  });

const withTop = (state: State, node: Node): State =>
  Option.match(Arr.last(state.stack), {
    onNone: () => state,
    onSome: (top) => ({
      ...state,
      stack: Arr.append(Arr.dropRight(state.stack, LAST), {
        ...top,
        children: Arr.append(top.children, node),
      }),
    }),
  });

const openChunk = (state: State, line: Span): State => {
  const { token, rest } = head(
    spans(Str.slice(OPEN.length)(line.text), "param", line.start + OPEN.length),
  );
  return {
    ...state,
    stack: Arr.append(state.stack, { token, params: rest, children: [], start: line.start }),
  };
};

const closeChunk = (state: State, line: Span): State =>
  Option.match(Arr.last(state.stack), {
    onNone: () => ({
      ...state,
      error: Option.some({ message: "対応する < の無い > です", start: line.start, end: line.end }),
    }),
    onSome: (frame) => {
      const chunk: Chunk = { kind: "chunk", ...frame, end: line.end };
      const rest = { ...state, stack: Arr.dropRight(state.stack, LAST) };
      return Option.match(Arr.last(rest.stack), {
        onNone: () => ({ ...rest, root: Option.some(chunk) }),
        onSome: () => withTop(rest, chunk),
      });
    },
  });

const addLine = (state: State, line: Span): State => {
  const { token, rest } = head(spans(line.text, "param", line.start));
  return withTop(state, { kind: "line", token, params: rest, start: line.start, end: line.end });
};

const step = (state: State, line: Span): State =>
  Match.value(line.text).pipe(
    Match.when(
      () => Option.isSome(state.error),
      () => state,
    ),
    Match.when(CLOSE, () => closeChunk(state, line)),
    Match.when(Str.startsWith(OPEN), () => openChunk(state, line)),
    Match.orElse(() => addLine(state, line)),
  );

const unclosed = (state: State): Option.Option<ParseError> =>
  Option.map(Arr.head(state.stack), (frame) => ({
    message: `<${frame.token} が閉じていません`,
    start: frame.start,
    end: frame.start + OPEN.length,
  }));

const MISSING_ROOT: ParseError = {
  message: "<REAPER_PROJECT が見つかりません",
  start: START,
  end: START,
};

const finish = (state: State): ParseResult =>
  Option.match(
    Option.orElse(state.error, () => unclosed(state)),
    {
      onSome: (error): ParseResult => ({ status: "error", error }),
      onNone: () =>
        Option.match(state.root, {
          onNone: (): ParseResult => ({ status: "error", error: MISSING_ROOT }),
          onSome: (root): ParseResult => ({ status: "ok", root }),
        }),
    },
  );

const parseRpp = (source: string): ParseResult =>
  finish(Arr.reduce(spans(source, "line", START), EMPTY_STATE, step));

export { parseRpp };
export type { Chunk, Line, Node, Param, ParseError, ParseResult };
