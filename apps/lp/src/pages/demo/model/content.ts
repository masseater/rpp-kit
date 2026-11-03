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
  panes: {
    rpp: "intro.rpp",
    main: "main.ts",
    generated: "intro.rpp.ts",
    console: "コンソール",
  },
  output: {
    pending: "実行中",
    empty: "出力はありません",
    timeout: "3 秒で打ち切りました",
    broken: "実行結果を読めませんでした",
  },
  usage: `import { song } from "./intro.rpp";

const bpm: 120 = song.tempo.bpm;
console.log("BPM", bpm);

for (const [name, marker] of Object.entries(song.markers)) {
  console.log(name, marker.time);
}

const cm9: 16 = song.markers.Cm9.time;
console.log("Cm9", cm9);
`,
};

export { credit, hero, lane, playground, transport };
