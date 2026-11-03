# rpp-kit

REAPER のプロジェクトファイル（`.rpp`）を、MIDI へ書き出さずに TypeScript から直接読むためのキットである。
`import { song } from "./song.rpp"` と書くと、テンポ・マーカー・トラック・MIDI のノートがそのまま値として手に入る。

- `libs/rpp-kit` は `.rpp` のパーサーと、それを使う Vite プラグイン（`rpp-kit/vite`）と、
  TypeScript 7.1 の content mapper を持つ。
- content mapper を有効にすると、マーカー名やテンポがリテラル型になり、
  `song.markers.Chorus9` のような無いマーカーは型エラーになる。
  `.rpp` が参照する音声ファイルが無ければ、そのファイル名の行がエラーになる。
- `apps/lp` はデモのページである。ai-produced で作った曲の `.rpp` を読み込み、
  セクションとノートを並べて鳴らす。

content mapper は TypeScript 7.1 のベータ版の機能で、`tsc --runExternalCode` で使う。
oxlint の型検査はまだ対応していないので、`vp check` には `.d.rpp.ts` の型を渡している。

## 公開先

- デモ: デプロイ後に追記する

## 使い方

### 前提

- [Vite+](https://viteplus.dev/guide/) の `vp` コマンド
- `gh`、uv、Go、Python 3、jq。verify の一部がこれらで動く
- Workers Paid プランの Cloudflare アカウント
- OpenRouter の API キー。verify の lint の一部が使う

### 1. テンプレートからリポジトリを作る

```sh
gh repo create <owner>/<name> --template masseater/typescript-template \
  --private --clone
cd <name>
```

### 2. アプリ名を変える

`apps/web/app-name.ts` の `APP_NAME` を、リポジトリの名前に変える。
同じ Cloudflare アカウントにある別のリポジトリと名前が重なると、互いのリソースを置き換え合う。

### 3. 手元で動かす

```sh
vp env on
vp install
cp .env.example .env
vp exec --filter web alchemy profile edit --add Cloudflare
```

`vp env on` で、リポジトリが求める版の Node.js と pnpm を vp が用意する。
`.env` の `OPENROUTER_API_KEY` にキーを書く。
Cloudflare の認証情報は、最後のコマンドで作る Alchemy のプロファイルに入る。

```sh
vp run verify
cd apps/web && vp run dev
```

verify が通り、dev が表示した URL を開いてアプリが出れば準備はできている。

### 4. GitHub の設定をそろえる

Actions の secrets、Actions による PR 作成の許可、既定ブランチのルールセットは、テンプレートから引き継がれない。
[masseater/skills](https://github.com/masseater/skills) の `project-checklist` スキルの
setup の手順で設定する。

設定が済めば、main への push のたびに本番へデプロイされる。
手元からデプロイするときは `apps/web` で `vp run deploy` を実行する。

## テンプレートの更新を取り込む

作ったリポジトリで Claude Code のセッションを始めると、テンプレートの新しいリリースがあれば知らせが出る。
取り込むと答えれば、前のリリースとの差分を当てて verify を通すところまで進む。
