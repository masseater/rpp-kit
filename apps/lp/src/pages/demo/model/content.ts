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

const playground = {
  heading: "書き換えて試す",
  panes: {
    rpp: "intro.rpp",
    main: "main.ts",
    generated: "TypeScript から見た intro.rpp",
  },
  usage: `import { song } from "./intro.rpp";

const bpm: 120 = song.tempo.bpm;       // 通る
const cm9: 16 = song.markers.Cm9.time; // 通る
song.markers.Gm8;                      // 型エラー
`,
};

export { credit, hero, lane, playground, transport };
