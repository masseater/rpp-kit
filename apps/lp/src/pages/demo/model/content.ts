const hero = {
  title: "REAPER のプロジェクトを、そのまま import する",
  source: "GitHub で見る",
  href: "https://github.com/masseater/rpp-kit",
};

const credit = {
  mark: "♪",
  title: "Timmy Time Adventure / intro.rpp",
  href: "https://github.com/warrior-rockk/timmy-time-adventure/blob/99e50ba0d3062773f4e08b93a4c31cf7fcd3946f/dev/midi/game/intro/intro.rpp",
  author: "Warrior / Warcom Soft.",
  license: "GPLv3",
};

const transport = { play: "再生", stop: "停止", bpm: "BPM" };

const lane = { notes: "ノート" };

const typing = {
  heading: "型も付く",
  usage: `import { song } from "./intro.rpp";

const bpm: 120 = song.tempo.bpm;       // 通る
const cm9: 16 = song.markers.Cm9.time; // 通る
song.markers.Gm8;                      // 型エラー`,
  output: `$ tsc --runExternalCode
src/main.ts(5,14): error TS2339: Property 'Gm8' does not exist on type '{ readonly Gm9: ... & { readonly time: 0; }; readonly Cm9: ... & { readonly time: 16; }; ... }'.`,
};

export { credit, hero, lane, transport, typing };
