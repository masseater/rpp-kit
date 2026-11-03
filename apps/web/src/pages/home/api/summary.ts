import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { todo } from "#/pages/home/model/todo.table";
import { db } from "#/shared/db/index.server";

import { runRequest } from "./runtime.server";

const countByStatus = (status: (typeof todo.$inferSelect)["status"]): Effect.Effect<number> =>
  Effect.promise(() => db.$count(todo, eq(todo.status, status)));

const getTodoSummary = createServerFn({ method: "GET" }).handler(() =>
  runRequest(
    Effect.all(
      { open: countByStatus("open"), done: countByStatus("done") },
      { concurrency: "unbounded" },
    ).pipe(Effect.withSpan("todo.summary")),
  ),
);

const todoSummaryQuery = queryOptions({
  queryKey: ["todo-summary"],
  queryFn: () => getTodoSummary(),
});

export { todoSummaryQuery };
