import { Workers, providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";
import { STATIC_PAGE_HEADERS, assetHeaders } from "security-headers";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";

const COMPATIBILITY = { date: "2026-08-25" } as const;

const SITE_ZONE = "masseater.dev";

const SITE_BASE_PATH = "/rpp-kit";

const SITE_CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const landingPage = Effect.gen(function* landingPage() {
  const site = yield* Build("LandingPageBuild", {
    cwd: ".",
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

export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url: landingPageUrl } = yield* landingPage;
    yield* requireAppPrefix;
    return { landingPageUrl };
  }),
);
