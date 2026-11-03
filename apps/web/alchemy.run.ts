import { D1, Website, Workers, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { Stack, makeRandom } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect, Hash } from "effect";
import { SECURITY_HEADERS, STATIC_PAGE_HEADERS, assetHeaders } from "security-headers";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";

const TRACE_SAMPLING_RATE = 0.1;

const COMPATIBILITY = { date: "2026-08-25" } as const;

const WEB_LIMITS = { cpuMs: 1000 } as const;

const API_RATE_LIMIT = Workers.RateLimit("API_RATE_LIMIT", {
  namespaceId: Math.abs(Hash.string(APP_NAME)),
  simple: { limit: 100, period: 60 },
});

const CF_BEACON_TOKEN = "47d660a773db4bb7a9b283aaf8f080ff";

const SITE_ZONE = "masseater.dev";

const SITE_BASE_PATH = "/rpp-kit";

const SITE_CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { migrations: "./drizzle" });
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  return yield* Website.Vite("Web", {
    compatibility: COMPATIBILITY,
    logpush: true,
    limits: WEB_LIMITS,
    env: { API_RATE_LIMIT, BETTER_AUTH_SECRET, CF_BEACON_TOKEN, DB },
    observability: {
      enabled: true,
      logs: {
        enabled: true,
        invocationLogs: true,
        persist: true,
      },
      traces: { enabled: true, headSamplingRate: TRACE_SAMPLING_RATE, persist: true },
    },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
    assets: { headers: assetHeaders({ page: SECURITY_HEADERS }) },
  });
});

const landingPage = Effect.gen(function* landingPage() {
  const site = yield* Build("LandingPageBuild", {
    cwd: "../lp",
    command: `vp build --base ${SITE_BASE_PATH}/`,
    env: { VITE_CF_BEACON_TOKEN: SITE_CF_BEACON_TOKEN },
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("LandingPage", {
    compatibility: COMPATIBILITY,
    logpush: true,
    routes: [{ pattern: `${SITE_ZONE}${SITE_BASE_PATH}*`, zoneName: SITE_ZONE }],
    assets: {
      directory: site.outdir,
      base: SITE_BASE_PATH,
      headers: assetHeaders({ page: STATIC_PAGE_HEADERS, base: SITE_BASE_PATH }),
    },
  });
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    const { url: landingPageUrl } = yield* landingPage;
    yield* requireAppPrefix;
    return { url, landingPageUrl };
  }),
);
