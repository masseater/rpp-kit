const hero = {
  title: "REAPER のプロジェクトを、そのまま import する",
  lead: "このページは、REAPER のプロジェクトファイル mou-ikkai.rpp をビルド時に読み込んで描いています。MIDI に書き出さずに、トラック、ノート、マーカー、テンポを取り出しました。TypeScript 7.1 の content mapper を使うと、マーカー名やテンポにも型が付きます。",
};

const credit = {
  before: "曲は ",
  title: "もういっかい",
  href: "https://github.com/masseater/ai-produced/tree/main/songs/001-mou-ikkai",
  after:
    " です。音は、ノートをブラウザのオシレーターで鳴らしているだけで、エフェクトは掛かりません。テンポの途中の変化は読んでいません。",
};

const transport = { play: "再生する", stop: "止める", bpm: "BPM" };

const lane = {
  notes: "ノート",
  empty: "空",
  emptyNote: "歌声の WAV はリポジトリに無いので、このデモでは外しています",
};

const typing = {
  heading: "型も付く",
  usage: `import song from "./mou-ikkai.rpp";

song.tempo.bpm;            // 型は 160
song.markers.Chorus1.time; // 型は 48
song.markers.Chorus9;      // 型エラー`,
  output: `$ tsc --runExternalCode
src/main.ts(5,14): error TS2551: Property 'Chorus9' does not exist on type '{ ... }'. Did you mean 'Chorus1'?
mou-ikkai.rpp(25,14): error TS2345: Argument of type '"../03-vocal/render/mou-ikkai_Vocal.wav"' is not assignable to parameter of type '"このパスに素材のファイルがありません"'.`,
  note: "2 つ目のエラーは .rpp の中を指しています。元の mou-ikkai.rpp でボーカルのトラックが参照している WAV がリポジトリに無いことを、tsc が見つけました。",
};

export { credit, hero, lane, transport, typing };
