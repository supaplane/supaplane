import { halfWidthAt, outline, type Pt } from "./geometry.js";

export type PropName = "none" | "case" | "plane" | "balloon" | "coffee" | "backpack" | "passport";
export type HatName = "none" | "cap" | "pilot" | "shades" | "beanie";
export type BodyShape = "tall" | "round" | "bean";

export interface PassengerParams {
  h: number;
  w: number;
  topN: number;
  botN: number;
  egg: number;
  legLen: number;
  legW: number;
  legGap: number;
  armK: number;
  armW: number;
  armTaper: number;
  shoulderY: number;
  eyeY: number;
  eyeGap: number;
  eyeR: number;
  mouthW: number;
  scale: number;
  prop: PropName;
  propSide: number;
  hat: HatName;
}

export interface RuntimeParams extends PassengerParams {
  _sh: [number, number];
  _armL: number;
}

export const BASE: PassengerParams = {
  h: 150,
  w: 118,
  topN: 2.2,
  botN: 3.2,
  egg: 0.08,
  legLen: 16,
  legW: 24,
  legGap: 36,
  armK: 0.47,
  armW: 18,
  armTaper: 1.35,
  shoulderY: 0.5,
  eyeY: 0.74,
  eyeGap: 13,
  eyeR: 3.6,
  mouthW: 8,
  scale: 1,
  prop: "none",
  propSide: -1,
  hat: "none",
};

export const PRESETS = {
  tall: {
    h: 186,
    w: 112,
    topN: 2.05,
    botN: 3.4,
    egg: 0.1,
    legLen: 20,
    legW: 25,
    legGap: 37,
    eyeY: 0.79,
    eyeGap: 13,
    armK: 0.38,
  },
  round: {
    h: 142,
    w: 136,
    topN: 2.35,
    botN: 2.7,
    egg: 0,
    legLen: 15,
    legW: 27,
    legGap: 42,
    eyeY: 0.7,
    eyeGap: 14,
    armK: 0.44,
  },
  bean: {
    h: 170,
    w: 122,
    topN: 2.2,
    botN: 3.1,
    egg: 0.13,
    legLen: 18,
    legW: 25,
    legGap: 38,
    eyeY: 0.76,
    armK: 0.4,
  },
  kid: {
    h: 118,
    w: 100,
    topN: 2.25,
    botN: 2.6,
    egg: 0.06,
    legLen: 13,
    legW: 24,
    legGap: 34,
    eyeY: 0.7,
    eyeGap: 11,
    eyeR: 4.4,
    mouthW: 7,
    armW: 15,
    armK: 0.4,
    scale: 0.6,
  },
} satisfies Record<string, Partial<PassengerParams>>;

export type PresetName = keyof typeof PRESETS;

export const PROPS: readonly PropName[] = [
  "none",
  "case",
  "plane",
  "balloon",
  "coffee",
  "backpack",
  "passport",
];
export const HATS: readonly HatName[] = ["none", "cap", "pilot", "shades", "beanie"];
export const NAMES = [
  "Pip",
  "Loaf",
  "Bun",
  "Mochi",
  "Tater",
  "Dot",
  "Pebble",
  "Noodle",
  "Biscuit",
  "Puff",
  "Scone",
  "Wren",
  "Tofu",
  "Gus",
  "Bea",
  "Olo",
  "Nib",
  "Pudding",
  "Juno",
  "Kip",
  "Momo",
  "Ferg",
  "Lulu",
  "Taro",
] as const;

export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomParams(r: Rng): PassengerParams {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)] as T;
  const h = 118 + r() * 78;
  const w = 94 + r() * 46;
  const legW = 21 + r() * 8;
  const prop = r() < 0.72 ? pick(PROPS.slice(1)) : "none";
  return {
    h,
    w,
    topN: 1.9 + r() * 0.8,
    botN: 2.4 + r() * 1.6,
    egg: -0.04 + r() * 0.2,
    legLen: 10 + r() * 14,
    legW,
    legGap: legW + 9 + r() * 16,
    armK: 0.28 + r() * 0.42,
    armW: w * (0.13 + r() * 0.04),
    armTaper: 1.2 + r() * 0.35,
    shoulderY: 0.46 + r() * 0.1,
    eyeY: 0.68 + r() * 0.12,
    eyeGap: 10 + r() * 7,
    eyeR: 3.1 + r() * 1.6,
    mouthW: 6 + r() * 4,
    prop,
    propSide: r() < 0.5 ? -1 : 1,
    hat: r() < 0.35 ? pick(HATS.slice(1)) : "none",
    scale: r() < 0.18 ? 0.55 + r() * 0.15 : 0.85 + r() * 0.25,
  };
}

export function describe(p: PassengerParams): string[] {
  const a = p.h / p.w;
  const shape: BodyShape = a > 1.5 ? "tall" : a < 1.12 ? "round" : "bean";
  return [
    p.scale < 0.72 ? "tot" : shape,
    p.prop !== "none" && p.prop,
    p.hat !== "none" && p.hat,
  ].filter(Boolean) as string[];
}

/** Shoulder anchors and arm length derived from the silhouette. */
export function withMetrics(p: PassengerParams): RuntimeParams {
  const rest = outline(p);
  const sy = -p.h * p.shoulderY;
  const hw = halfWidthAt(rest, sy);
  const shx = Math.max(hw * 0.5, hw - p.armW * p.armTaper * 0.3);
  return { ...p, _sh: [shx, sy] as [number, number], _armL: p.h * p.armK * 0.75 };
}

export const shoulderPoints = (p: RuntimeParams): [Pt, Pt] => {
  const [sx, sy] = p._sh;
  return [
    [-sx, sy],
    [sx, sy],
  ];
};
