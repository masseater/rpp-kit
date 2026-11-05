作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## 構成

- `apps/lp` はデモの静的ページで、同じディレクトリの `alchemy.run.ts` が静的アセットだけの Worker として Cloudflare にデプロイする。`apps/lp/app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
