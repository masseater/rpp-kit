import type { Marker, Region, Section, TempoPoint, Track } from "rpp-kit";
declare function assetExists(file: "このパスに素材のファイルがありません"): void;
declare const song: {
  readonly tempo: { readonly bpm: 120.0000000000; readonly numerator: 4; readonly denominator: 4 };
  readonly tempoMap: readonly TempoPoint[];
  readonly sampleRate: 44100;
  readonly length: number;
  readonly markers: readonly [
    Marker & { readonly name: "Gm9"; readonly time: 0 },
    Marker & { readonly name: "Cm9"; readonly time: 16 },
    Marker & { readonly name: "Gm9"; readonly time: 24 },
    Marker & { readonly name: "Bb2"; readonly time: 32 },
    Marker & { readonly name: "Gm7"; readonly time: 36 },
    Marker & { readonly name: "Ebm9"; readonly time: 40 },
    Marker & { readonly name: "Ebm11"; readonly time: 44 },
    Marker & { readonly name: "Fm9"; readonly time: 48 },
    Marker & { readonly name: "Gm9"; readonly time: 56 },
    Marker & { readonly name: "Cm9"; readonly time: 64 },
    Marker & { readonly name: "Gm9"; readonly time: 72 },
    Marker & { readonly name: "Bb2"; readonly time: 80 },
    Marker & { readonly name: "Gm7"; readonly time: 84 },
    Marker & { readonly name: "Ebm9"; readonly time: 88 },
    Marker & { readonly name: "Ebm11"; readonly time: 92 },
    Marker & { readonly name: "Fm9"; readonly time: 96 },
    Marker & { readonly name: "Gm9"; readonly time: 104 },
    Marker & { readonly name: "Cm9"; readonly time: 112 },
    Marker & { readonly name: "Gm9"; readonly time: 120 },
    Marker & { readonly name: "Bb2"; readonly time: 128 },
    Marker & { readonly name: "Gm7"; readonly time: 132 },
    Marker & { readonly name: "Ebm9"; readonly time: 136 },
    Marker & { readonly name: "Ebm11"; readonly time: 140 },
    Marker & { readonly name: "Fm9"; readonly time: 144 },
    Marker & { readonly name: "Gm9"; readonly time: 152 },
  ];
  readonly regions: readonly Region[];
  readonly sections: readonly Section[];
  readonly tracks: readonly [
    Track & { readonly index: 0; readonly name: "Midi GM" },
    Track & { readonly index: 1; readonly name: "Bass    (BB)" },
    Track & { readonly index: 2; readonly name: "Drums   (BB)" },
    Track & { readonly index: 3; readonly name: "Piano   (BB)" },
    Track & { readonly index: 4; readonly name: "Strings (BB)" },
    Track & { readonly index: 5; readonly name: "Melody  (BB)" },
  ];
};
export { song };
export default song;
