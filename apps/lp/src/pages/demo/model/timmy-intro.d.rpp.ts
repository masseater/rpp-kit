import type { Marker, Section, TempoPoint, Track } from "rpp-kit";
declare function assetExists(file: "このパスに素材のファイルがありません"): void;
declare const song: {
  readonly tempo: { readonly bpm: 120.0000000000; readonly numerator: 4; readonly denominator: 4 };
  readonly tempoMap: readonly TempoPoint[];
  readonly sampleRate: 44100;
  readonly length: number;
  readonly markers: {
    readonly "Gm9": Marker & { readonly time: 0 };
    readonly "Cm9": Marker & { readonly time: 16 };
    readonly "Bb2": Marker & { readonly time: 32 };
    readonly "Gm7": Marker & { readonly time: 36 };
    readonly "Ebm9": Marker & { readonly time: 40 };
    readonly "Ebm11": Marker & { readonly time: 44 };
    readonly "Fm9": Marker & { readonly time: 48 };
  };
  readonly sections: readonly Section[];
  readonly tracks: {
    readonly "Midi GM": Track;
    readonly "Bass    (BB)": Track;
    readonly "Drums   (BB)": Track;
    readonly "Piano   (BB)": Track;
    readonly "Strings (BB)": Track;
    readonly "Melody  (BB)": Track;
  };
  readonly trackOrder: readonly ["Midi GM", "Bass    (BB)", "Drums   (BB)", "Piano   (BB)", "Strings (BB)", "Melody  (BB)"];
};
export { song };
export default song;
