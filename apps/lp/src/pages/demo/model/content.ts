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
    generated: "intro.d.rpp.ts",
    console: "コンソール",
  },
  generatedNote: "自動生成",
  output: {
    pending: "実行中",

    timeout: "3 秒で打ち切りました",
    broken: "実行結果を読めませんでした",
  },
  usage: `import { song } from "./intro.rpp";

const bpm: 120 = song.tempo.bpm;
console.log("BPM", bpm);

const [, bass] = song.tracks;
for (const item of bass.items) {
  if (item.source.kind === "midi") {
    const [first] = item.source.notes;
    console.log(bass.name, "最初のノート", first?.start, "秒");
  }
}

for (const marker of song.markers) {
  console.log(marker.name, marker.time);
}

const [, cm9] = song.markers;
const time: 16 = cm9.time;
console.log(cm9.name, time);
`,
};

export { credit, hero, lane, playground, transport };
