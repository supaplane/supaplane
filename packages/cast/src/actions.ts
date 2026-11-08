import { clamp, mix, ss, type EyeType, type MouthType, type Pt } from "./geometry.js";
import type { PropName, RuntimeParams } from "./params.js";
import type { Targets } from "./springs.js";

export interface FaceState {
  eyes: EyeType;
  mouth: MouthType;
}

export interface ActionHost {
  waveSide: number;
  propSide: number;
  dir: number;
  phase: number;
  pace: number;
  flight: number;
  orbit: number;
  burst(type: string, n: number, at: Pt, spread: number): void;
  rand(): number;
}

export interface ActionContext {
  p: RuntimeParams;
  t: number;
  lt: number;
  dt: number;
  c: ActionHost;
}

export interface ActionResult {
  T: Targets;
  F: FaceState;
  mouth?: number;
  blush?: number;
  brow?: number;
  speed?: number;
}

export interface Action {
  label: string;
  loop?: boolean;
  dur?: number;
  travel?: number;
  needs?: PropName;
  fn(o: ActionContext): ActionResult;
}

const face = (eyes: FaceState["eyes"], mouth: FaceState["mouth"]): FaceState => ({ eyes, mouth });

/** Resting hand targets in body-rest units (origin body bottom centre, -y up). */
export function restHands(p: RuntimeParams): Targets {
  const [sx, sy] = p._sh;
  const L = p._armL * 0.96;
  const a = 0.5;
  const r: Targets = {
    lhx: -sx - Math.sin(a) * L,
    lhy: sy + Math.cos(a) * L,
    rhx: sx + Math.sin(a) * L,
    rhy: sy + Math.cos(a) * L,
  };
  // a suitcase hand reaches out and down to the handle, like the source art
  if (p.prop === "case") {
    const k = p.propSide < 0 ? "l" : "r";
    r[k + "hx"] = p.propSide * p.w * 0.74;
    r[k + "hy"] = -p.h * 0.38;
  }
  return r;
}

function gait(o: ActionContext, rate: number, amp: number): ActionResult {
  const { p, lt, c } = o;
  const stride = p.legGap * 0.42 * amp;
  if (c.pace) rate = clamp(c.pace / (stride * Math.PI * 2 * 0.64 * p.scale), 0.8, 5);
  const ph = lt * rate * Math.PI * 2;
  const s = Math.sin(ph);
  const cs = Math.cos(ph);
  const rh = restHands(p);
  const sw = p.prop === "case" ? 0.3 : 1;
  return {
    T: {
      ...rh,
      lfx: s * stride * c.dir,
      llift: Math.max(0, cs) * 8 * amp,
      rfx: -s * stride * c.dir,
      rlift: Math.max(0, -cs) * 8 * amp,
      bob: -Math.abs(cs) * 3 * amp,
      lean: c.dir * 0.03,
      stretch: Math.abs(s) * 0.02,
      lhx: (rh["lhx"] ?? 0) - s * p.w * 0.12 * amp * c.dir * (p.propSide < 0 ? sw : 1),
      rhx: (rh["rhx"] ?? 0) + s * p.w * 0.12 * amp * c.dir * (p.propSide > 0 ? sw : 1),
      lhy: (rh["lhy"] ?? 0) - Math.max(0, -s) * 5,
      rhy: (rh["rhy"] ?? 0) - Math.max(0, s) * 5,
      lx: c.dir * 2.5,
    },
    F: face("dot", "smile"),
    speed: stride * rate * Math.PI * 2 * 0.64 * p.scale,
  };
}

export type ActionName =
  | "idle"
  | "walk"
  | "run"
  | "hop"
  | "wave"
  | "cheer"
  | "jump"
  | "dance"
  | "love"
  | "shy"
  | "think"
  | "sad"
  | "surprised"
  | "scared"
  | "grumpy"
  | "sleepy"
  | "laugh"
  | "dizzy"
  | "throw";

export const ACTIONS: Record<ActionName, Action> = {
  idle: {
    label: "Idle",
    loop: true,
    fn(o) {
      const { p, t, c } = o;
      const b = Math.sin(t * 1.7 + c.phase);
      return {
        T: {
          ...restHands(p),
          stretch: b * 0.018,
          lean: Math.sin(t * 0.6 + c.phase) * 0.012,
          rhy: -p.h * 0.2 + b * 2,
          lhy: -p.h * 0.2 - b * 2,
        },
        F: face("dot", "smile"),
      };
    },
  },
  walk: { label: "Walk", loop: true, travel: 1, fn: (o) => gait(o, 1.7, 1) },
  run: {
    label: "Run",
    loop: true,
    travel: 1,
    fn(o) {
      const r = gait(o, 3.1, 1.5);
      r.T["lean"] = o.c.dir * 0.07;
      r.F = face("happy", "grin");
      return r;
    },
  },
  hop: {
    label: "Hop",
    loop: true,
    travel: 0.8,
    fn(o) {
      const { p, lt, c } = o;
      const ph = (lt * 1.6) % 1;
      const air = Math.sin(clamp((ph - 0.18) / 0.64, 0, 1) * Math.PI);
      const land = ph < 0.18 ? 1 - ph / 0.18 : ph > 0.82 ? (ph - 0.82) / 0.18 : 0;
      return {
        T: {
          ...restHands(p),
          y: -air * p.h * 0.22,
          stretch: air * 0.08 - land * 0.14,
          lean: c.dir * 0.04,
          llift: air * 6,
          rlift: air * 6,
          lhy: -p.h * (0.2 + air * 0.25),
          rhy: -p.h * (0.2 + air * 0.25),
          lhx: -p.w * (0.55 + air * 0.15),
          rhx: p.w * (0.55 + air * 0.15),
        },
        F: face("happy", "grin"),
        mouth: air,
      };
    },
  },
  wave: {
    label: "Wave",
    dur: 2.6,
    fn(o) {
      const { p, lt, c } = o;
      const s = c.waveSide;
      const up = ss(0, 0.25, lt) * (1 - ss(2.3, 2.6, lt));
      const w = Math.sin(lt * 13) * p.w * 0.16 * up;
      const T: Targets = { ...restHands(p), lean: s * 0.03 * up, stretch: 0.03 * up };
      T[s < 0 ? "lhx" : "rhx"] = s * p.w * mix(0.55, 0.7, up) + w;
      T[s < 0 ? "lhy" : "rhy"] = mix(-p.h * 0.2, -p.h * 1.08, up);
      return { T, F: face("happy", "grin"), mouth: 0.4 * up, blush: 0.5 };
    },
  },
  cheer: {
    label: "Cheer",
    dur: 2.8,
    fn(o) {
      const { p, lt } = o;
      const up = ss(0, 0.2, lt) * (1 - ss(2.5, 2.8, lt));
      const hop = Math.abs(Math.sin(lt * 7)) * up;
      if (Math.floor((lt * 7) / Math.PI) !== Math.floor(((lt - o.dt) * 7) / Math.PI))
        o.c.burst("spark", 3, [0, -p.h * 1.05], 60);
      return {
        T: {
          lhx: -p.w * 0.62,
          rhx: p.w * 0.62,
          lhy: mix(-p.h * 0.2, -p.h * 1.12, up) + hop * 8,
          rhy: mix(-p.h * 0.2, -p.h * 1.12, up) + hop * 8,
          y: -hop * p.h * 0.12,
          stretch: hop * 0.06 - (1 - hop) * 0.04 * up,
          llift: hop * 4,
          rlift: hop * 4,
        },
        F: face("happy", "grin"),
        mouth: 0.7 + hop * 0.3,
        blush: 0.6,
      };
    },
  },
  jump: {
    label: "Jump",
    dur: 1.5,
    fn(o) {
      const { p, lt } = o;
      const crouch = ss(0, 0.22, lt) * (1 - ss(0.22, 0.3, lt));
      const airT = clamp((lt - 0.28) / 0.6, 0, 1);
      const air = Math.sin(airT * Math.PI);
      const land = ss(0.86, 0.92, lt) * (1 - ss(0.95, 1.35, lt));
      if (lt >= 0.88 && lt - o.dt < 0.88) o.c.burst("puff", 4, [0, 0], 40);
      const armsUp = air > 0 ? air : 0;
      return {
        T: {
          lhx: -p.w * mix(0.6, 0.7, armsUp),
          rhx: p.w * mix(0.6, 0.7, armsUp),
          lhy: mix(-p.h * 0.12 * (1 + crouch), -p.h * 1.1, armsUp),
          rhy: mix(-p.h * 0.12 * (1 + crouch), -p.h * 1.1, armsUp),
          y: -air * p.h * 0.6,
          stretch: -crouch * 0.2 + air * 0.12 * (1 - airT) - land * 0.2,
          bob: crouch * 6,
          llift: air * 8,
          rlift: air * 8,
        },
        F: face(air > 0.1 ? "wide" : "happy", air > 0.1 ? "o" : "grin"),
        mouth: air,
      };
    },
  },
  dance: {
    label: "Dance",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const beat = lt * 2.2 * Math.PI;
      const s = Math.sin(beat);
      const b = Math.abs(Math.cos(beat));
      if (Math.floor(lt * 1.1) !== Math.floor((lt - o.dt) * 1.1))
        o.c.burst("note", 1, [s * p.w * 0.6, -p.h * 1.05], 30);
      return {
        T: {
          lean: s * 0.1,
          y: -b * 10,
          stretch: b * 0.05 - 0.02,
          lhx: -p.w * 0.62,
          rhx: p.w * 0.62,
          lhy: -p.h * (s > 0 ? 1.0 : 0.25),
          rhy: -p.h * (s > 0 ? 0.25 : 1.0),
          llift: Math.max(0, s) * 9,
          rlift: Math.max(0, -s) * 9,
        },
        F: face("happy", "grin"),
        mouth: 0.5 + b * 0.4,
        blush: 0.4,
      };
    },
  },
  love: {
    label: "Love",
    loop: true,
    fn(o) {
      const { p, lt, t } = o;
      const beat = Math.pow(Math.max(0, Math.sin(t * 7.5)), 8);
      if (Math.floor(lt * 1.4) !== Math.floor((lt - o.dt) * 1.4))
        o.c.burst("heart", 1, [(o.c.rand() - 0.5) * p.w * 0.6, -p.h * 1.02], 40);
      return {
        T: {
          lhx: -p.w * 0.2,
          rhx: p.w * 0.2,
          lhy: -p.h * 0.3,
          rhy: -p.h * 0.3,
          lean: Math.sin(lt * 2) * 0.06,
          stretch: beat * 0.05,
          bulge: beat * 0.04,
        },
        F: face("heart", "smile"),
        blush: 1,
      };
    },
  },
  shy: {
    label: "Shy",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const sw = Math.sin(lt * 1.6);
      return {
        T: {
          lhx: -p.w * 0.1,
          rhx: p.w * 0.1,
          lhy: -p.h * 0.14,
          rhy: -p.h * 0.14,
          lean: 0.05 + sw * 0.03,
          stretch: -0.03,
          lx: 3,
          ly: 2.5,
        },
        F: face("dot", "wavy"),
        blush: 1,
      };
    },
  },
  think: {
    label: "Think",
    loop: true,
    fn(o) {
      const { p, lt, c } = o;
      const s = c.waveSide;
      if (Math.floor(lt * 0.9) !== Math.floor((lt - o.dt) * 0.9))
        o.c.burst("dot", 1, [s * p.w * 0.35, -p.h * 1.08], 0);
      const T: Targets = { ...restHands(p), lean: s * 0.05, lx: s * 3, ly: -3 };
      T[s < 0 ? "lhx" : "rhx"] = s * p.w * 0.22;
      T[s < 0 ? "lhy" : "rhy"] = -p.h * (p.eyeY - 0.13) + Math.sin(lt * 5) * 1.5;
      return { T, F: face("dot", "flat"), brow: 0.3 };
    },
  },
  sad: {
    label: "Sad",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const sigh = Math.pow(Math.max(0, Math.sin(lt * 1.2)), 6);
      if (Math.floor(lt * 0.7) !== Math.floor((lt - o.dt) * 0.7))
        o.c.burst("tear", 1, [-p.eyeGap * 1.1, -p.h * p.eyeY + p.eyeR], 0);
      return {
        T: {
          lhx: -p.w * 0.44,
          rhx: p.w * 0.44,
          lhy: -p.h * 0.06,
          rhy: -p.h * 0.06,
          stretch: -0.07 - sigh * 0.05,
          bulge: 0.05,
          lean: 0.01,
          ly: 3,
        },
        F: face("dot", "frown"),
        brow: 1,
      };
    },
  },
  surprised: {
    label: "Surprised",
    dur: 1.8,
    fn(o) {
      const { p, lt } = o;
      const pop = ss(0, 0.12, lt) * (1 - ss(1.5, 1.8, lt));
      const hop = Math.sin(clamp(lt / 0.45, 0, 1) * Math.PI);
      if (lt < o.dt * 1.5) o.c.burst("bang", 1, [p.w * 0.45, -p.h * 1.08], 0);
      return {
        T: {
          lhx: -p.w * mix(0.55, 0.85, pop),
          rhx: p.w * mix(0.55, 0.85, pop),
          lhy: mix(-p.h * 0.2, -p.h * 0.72, pop),
          rhy: mix(-p.h * 0.2, -p.h * 0.72, pop),
          y: -hop * 18,
          stretch: pop * 0.12,
          ly: -2,
        },
        F: face("wide", "o"),
        mouth: 0.7 * pop,
        brow: 0.4 * pop,
      };
    },
  },
  scared: {
    label: "Scared",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const sh = Math.sin(lt * 55) * 1.6;
      if (Math.floor(lt * 0.8) !== Math.floor((lt - o.dt) * 0.8))
        o.c.burst("sweat", 1, [p.w * 0.32, -p.h * 0.9], 0);
      return {
        T: {
          lhx: -p.w * 0.2 + sh,
          rhx: p.w * 0.2 + sh,
          lhy: -p.h * 0.62,
          rhy: -p.h * 0.62,
          stretch: -0.1,
          bulge: 0.05,
          x: sh * 0.6,
          lx: Math.sin(lt * 3) * 3,
        },
        F: face("wide", "wavy"),
        brow: 1,
      };
    },
  },
  grumpy: {
    label: "Grumpy",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const huff = Math.pow(Math.max(0, Math.sin(lt * 2)), 10);
      if (huff > 0.9 && Math.floor((lt * 2) / Math.PI) !== Math.floor(((lt - o.dt) * 2) / Math.PI))
        o.c.burst("puff", 2, [0, -p.h * 1.02], 25);
      return {
        T: {
          lhx: -p.w * 0.47,
          rhx: p.w * 0.47,
          lhy: -p.h * 0.32,
          rhy: -p.h * 0.32,
          stretch: -0.06 + huff * 0.05,
          x: Math.sin(lt * 40) * huff * 1.2,
        },
        F: face("dot", "frown"),
        brow: -1,
      };
    },
  },
  sleepy: {
    label: "Sleepy",
    loop: true,
    fn(o) {
      const { p, lt } = o;
      const br = Math.sin(lt * 1.3);
      if (Math.floor(lt * 0.6) !== Math.floor((lt - o.dt) * 0.6))
        o.c.burst("z", 1, [p.w * 0.3, -p.h * 1.02], 0);
      return {
        T: {
          lhx: -p.w * 0.5,
          rhx: p.w * 0.5,
          lhy: -p.h * 0.08,
          rhy: -p.h * 0.08,
          stretch: br * 0.035 - 0.03,
          lean: Math.sin(lt * 0.7) * 0.05,
          ly: 1,
        },
        F: face("closed", "o"),
        mouth: 0.15 + br * 0.1,
      };
    },
  },
  laugh: {
    label: "Laugh",
    dur: 2.4,
    fn(o) {
      const { p, lt } = o;
      const sh = Math.abs(Math.sin(lt * 17)) * (1 - ss(2, 2.4, lt));
      return {
        T: {
          lhx: -p.w * 0.3,
          rhx: p.w * 0.3,
          lhy: -p.h * 0.3,
          rhy: -p.h * 0.3,
          stretch: sh * 0.07 - 0.03,
          lean: -0.05,
          y: -sh * 5,
          ly: -2,
        },
        F: face("happy", "grin"),
        mouth: 0.4 + sh * 0.6,
        blush: 0.8,
      };
    },
  },
  dizzy: {
    label: "Dizzy",
    loop: true,
    fn(o) {
      const { p, lt, c } = o;
      const a = lt * 3.4;
      c.orbit = 1;
      return {
        T: {
          ...restHands(p),
          lean: Math.sin(a) * 0.08,
          x: Math.cos(a) * 5,
          lhy: -p.h * 0.3 + Math.sin(a) * 8,
          rhy: -p.h * 0.3 - Math.sin(a) * 8,
        },
        F: face("spiral", "wavy"),
      };
    },
  },
  throw: {
    label: "Throw plane",
    dur: 3.6,
    needs: "plane",
    fn(o) {
      const { p, lt, c } = o;
      const s = c.propSide;
      const wind = ss(0, 0.35, lt) * (1 - ss(0.35, 0.45, lt));
      const fling = ss(0.4, 0.55, lt) * (1 - ss(1, 1.5, lt));
      const T: Targets = { ...restHands(p), lean: -s * 0.04 * wind + s * 0.05 * fling };
      T[s < 0 ? "lhx" : "rhx"] = s * p.w * mix(0.5, 0.8, fling) - s * wind * p.w * 0.1;
      T[s < 0 ? "lhy" : "rhy"] = mix(-p.h * 0.2, -p.h * 1.0, Math.max(wind, fling));
      c.flight = clamp((lt - 0.5) / 2.9, 0, 1);
      return {
        T,
        F: face(c.flight > 0 && c.flight < 1 ? "wide" : "happy", c.flight > 0.85 ? "grin" : "o"),
        mouth: 0.4,
      };
    },
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];

export const isLoop = (name: ActionName): boolean => ACTIONS[name].loop === true;
