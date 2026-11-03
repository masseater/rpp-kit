const hero = {
  title: "REAPER のプロジェクトを、そのまま import する",
  lead: "このページは、REAPER のプロジェクトファイル intro.rpp をビルド時に読み込んで描いています。MIDI に書き出さずに、トラック、ノート、マーカー、テンポを取り出しました。TypeScript 7.1 の content mapper を使うと、マーカー名やテンポにも型が付きます。",
};

const credit = {
  before:
    "曲は、MS-DOS 向けのゲーム Timmy Time Adventure（Warrior / Warcom Soft.、GPLv3）のタイトル曲 ",
  title: "intro.rpp",
  href: "https://github.com/warrior-rockk/timmy-time-adventure/blob/99e50ba0d3062773f4e08b93a4c31cf7fcd3946f/dev/midi/game/intro/intro.rpp",
  after:
    " です。マーカーにはコード名が付いています。音は、ノートをブラウザのオシレーターで鳴らしているだけで、エフェクトは掛かりません。テンポの途中の変化は読んでいません。",
};

const transport = { play: "再生する", stop: "止める", bpm: "BPM" };

const lane = {
  notes: "ノート",
  empty: "空",
  emptyNote: "このトラックはノートを持たず、テンポや拍子のイベントだけを持っています",
};

const typing = {
  heading: "型も付く",
  usage: `import { song } from "./intro.rpp";

const bpm: 120 = song.tempo.bpm;       // 通る
const cm9: 16 = song.markers.Cm9.time; // 通る
song.markers.Gm8;                      // 型エラー`,
  output: `$ tsc --runExternalCode
src/main.ts(5,14): error TS2339: Property 'Gm8' does not exist on type '{ readonly Gm9: ... & { readonly time: 0; }; readonly Cm9: ... & { readonly time: 16; }; ... }'.`,
  note: ".rpp が参照する音声ファイルが無いときは、tsc がその .rpp の FILE の行をエラーにします。",
};

export { credit, hero, lane, transport, typing };
