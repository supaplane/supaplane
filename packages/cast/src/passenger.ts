import {
  armShape,
  clamp,
  crease,
  eyePath,
  fmt,
  halfWidthAt,
  ik,
  mix,
  mouthPath,
  outline,
  PLANE,
  PLANE_CREASE,
  ptStr,
  smoothClosed,
  ss,
  type Deform,
} from "./geometry.js";
import {
  ACTIONS,
  restHands,
  type Action,
  type ActionHost,
  type ActionName,
  type FaceState,
} from "./actions.js";
import {
  BASE,
  rng,
  shoulderPoints,
  withMetrics,
  type PassengerParams,
  type RuntimeParams,
} from "./params.js";
import { CHANNELS, zeroChannels, type ChannelName, type Targets } from "./springs.js";

const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

export interface PassengerOpts {
  name?: string;
  x?: number;
  ground?: number;
  dir?: number;
  phase?: number;
  seed?: number;
  action?: ActionName;
}

export interface Burst {
  type: string;
  x: number;
  y: number;
}

export interface ArmChain {
  S: [number, number];
  E: [number, number];
  H: [number, number];
  reach: number;
}

export interface Pose {
  D: Deform;
  shoulders: Array<[number, number]>;
  hands: Array<[number, number]>;
  links?: Array<[number, number]>;
}

type Pt = [number, number];

interface ArmEls {
  fill: SVGPathElement;
  crease: SVGPathElement;
}

interface PassengerEls {
  balloon: SVGGElement;
  string: SVGPathElement;
  ball: SVGPathElement;
  knot: SVGPathElement;
  goo: SVGGElement;
  body: SVGPathElement;
  legL: SVGPathElement;
  legR: SVGPathElement;
  goo2: SVGGElement;
  body2: SVGPathElement;
  arms: ArmEls[];
  straps: SVGPathElement;
  hat: SVGGElement;
  hatBand: SVGPathElement;
  hatBrim: SVGPathElement;
  hatMark: SVGPathElement;
  blushL: SVGEllipseElement;
  blushR: SVGEllipseElement;
  eyeL: SVGPathElement;
  eyeR: SVGPathElement;
  brows: SVGPathElement;
  mouth: SVGPathElement;
  shades: SVGPathElement;
  prop: SVGGElement;
  case: SVGGElement;
  handleO: SVGPathElement;
  handle: SVGPathElement;
  caseBody: SVGRectElement;
  caseLine: SVGPathElement;
  wheels: SVGPathElement;
  held: SVGGElement;
  plane: SVGGElement;
  cup: SVGGElement;
  cupBody: SVGPathElement;
  steam: SVGPathElement;
  pass: SVGGElement;
  orbit: SVGGElement;
  rig: SVGGElement;
}

let UID = 0;

export class Passenger implements ActionHost {
  readonly id: number;
  name: string;
  p: RuntimeParams;
  X: number;
  G: number;
  dir: number;
  phase: number;
  propSide: number;
  waveSide: number;
  pace = 0;
  flight = 0;
  orbit = 0;
  inPlace = false;
  action: ActionName = "idle";
  act: Action = ACTIONS.idle;
  lt = 0;
  then: ActionName | null = null;
  speed = 0;
  lookAt: Pt | null = null;
  bursts: Burst[] = [];
  el: SVGGElement;
  rest: Pt[] = [];
  sh: [Pt, Pt] = [
    [0, 0],
    [0, 0],
  ];
  armL = 0;
  handsW: Pt[] = [];
  rand: () => number;
  private els: PassengerEls;
  private v = zeroChannels();
  private vel = zeroChannels();
  private face: FaceState = { eyes: "dot", mouth: "smile" };
  private open = 1;
  private blinkAt = 1;
  private blinkEnd = 0;
  private glanceAt = 2;
  private glance: [number, number] = [0, 0];
  private caseTilt = 0;
  private bInit = false;
  private planeW: Pt | null = null;
  private now = 0;

  constructor(params: Partial<PassengerParams> = {}, opts: PassengerOpts = {}) {
    this.id = ++UID;
    this.name = opts.name ?? "Passenger";
    this.p = withMetrics({ ...BASE, ...params });
    this.X = opts.x ?? 0;
    this.G = opts.ground ?? 0;
    this.dir = opts.dir ?? 1;
    this.phase = opts.phase ?? Math.random() * 6;
    this.rand = opts.seed != null ? rng(opts.seed) : rng(this.id * 977);
    this.propSide = this.p.propSide;
    this.waveSide = this.p.propSide === 1 ? -1 : 1;
    this.el = document.createElementNS(NS, "g");
    this.el.classList.add("passenger");
    this.els = this.build();
    this.setParams(this.p);
    this.play(opts.action ?? "idle");
    const rh = restHands(this.p);
    this.v.lhx = rh["lhx"] ?? 0;
    this.v.lhy = rh["lhy"] ?? 0;
    this.v.rhx = rh["rhx"] ?? 0;
    this.v.rhy = rh["rhy"] ?? 0;
    this.blinkAt = 1 + this.rand() * 3;
    this.glanceAt = 2 + this.rand() * 4;
  }

  burst(type: string, n: number, at: Pt, spread: number): void {
    for (let i = 0; i < n; i++) {
      this.bursts.push({
        type,
        x: at[0] + (this.rand() - 0.5) * spread,
        y: at[1] + (this.rand() - 0.5) * spread * 0.4,
      });
    }
  }

  setParams(p: Partial<PassengerParams>): void {
    this.p = withMetrics({ ...this.p, ...p });
    this.rest = outline(this.p);
    this.waveSide = this.p.propSide === 1 ? -1 : 1;
    this.propSide = this.p.propSide;
    this.sh = shoulderPoints(this.p);
    this.armL = this.p._armL;
    this.els.prop.setAttribute("class", `prop prop-${this.p.prop}`);
    this.el.dataset["prop"] = this.p.prop;
    this.el.dataset["hat"] = this.p.hat;
  }

  play(name: ActionName, opts: { then?: ActionName | null; dir?: number } = {}): this {
    let a: Action = ACTIONS[name] ?? ACTIONS.idle;
    let n: ActionName = name;
    if (a.needs && this.p.prop !== a.needs) {
      n = "wave";
      a = ACTIONS.wave;
    }
    this.action = n;
    this.act = a;
    this.lt = 0;
    this.then = opts.then !== undefined ? opts.then : a.loop ? null : "idle";
    this.orbit = 0;
    if (opts.dir) this.dir = opts.dir;
    if (n !== "throw") this.flight = 0;
    return this;
  }

  step(dt: number, t: number): void {
    const p = this.p;
    this.now = t;
    this.lt += dt;
    if (!this.act.loop && this.act.dur && this.lt > this.act.dur) this.play(this.then ?? "idle");
    const r = this.act.fn({ p, t, lt: this.lt, dt, c: this });
    const T: Targets = { ...r.T };
    this.face = r.F;
    this.speed = r.speed ?? 0;
    for (const k of ["mouth", "blush", "brow"] as const) {
      const rv = r[k];
      if (rv != null && T[k] == null) T[k] = rv;
    }
    // idle life: blink + glances
    if (t > this.blinkAt) {
      this.blinkAt = t + 2 + this.rand() * 3.5;
      this.blinkEnd = t + 0.13;
    }
    this.open = t < this.blinkEnd ? 0.12 : 1;
    if (t > this.glanceAt) {
      this.glanceAt = t + 1.5 + this.rand() * 3.5;
      this.glance =
        this.rand() < 0.45 ? [0, 0] : [(this.rand() - 0.5) * 6, (this.rand() - 0.5) * 3];
    }
    if (T["lx"] == null) {
      T["lx"] = this.glance[0];
      T["ly"] = this.glance[1];
    }
    if (this.lookAt && ["idle", "wave", "cheer", "love", "laugh"].includes(this.action)) {
      const [wx, wy] = this.lookAt;
      const ex = this.X;
      const ey = this.G - p.h * p.eyeY * p.scale;
      T["lx"] = clamp((wx - ex) / (80 * p.scale), -1, 1) * 3.2;
      T["ly"] = clamp((wy - ey) / (80 * p.scale), -1, 1) * 2.4;
    }
    if (this.flight > 0 && this.flight < 1 && this.planeW) {
      T["lx"] = clamp(this.planeW[0] / 60, -1, 1) * 3.4;
      T["ly"] = clamp((this.planeW[1] + p.h * p.eyeY) / 60, -1, 1) * 3;
    }
    // springs (substepped)
    const n = Math.ceil(dt / (1 / 120));
    const h = dt / n;
    const rh = restHands(p);
    for (let i = 0; i < n; i++) {
      for (const k of Object.keys(CHANNELS) as ChannelName[]) {
        const [K, D] = CHANNELS[k];
        const tgt = T[k] ?? (k in rh ? (rh[k] ?? 0) : k === "bx" || k === "by" ? this.v[k] : 0);
        this.vel[k] += (K * (tgt - this.v[k]) - D * this.vel[k]) * h;
        this.v[k] += this.vel[k] * h;
      }
    }
    if (this.act.travel && !this.inPlace) this.X += this.dir * this.speed * dt;
  }

  deform(): Deform {
    const p = this.p;
    const P = this.v;
    const sy = 1 + P.stretch;
    const sx = 1 - P.stretch * 0.55;
    return (x: number, y: number): Pt => {
      const u = clamp(-y / p.h, 0, 1.3);
      return [
        x * sx * (1 + P.bulge * (1 - u)) + P.lean * p.h * u * u + P.x,
        y * sy + P.y + P.bob - p.legLen,
      ];
    };
  }

  pose(): Pose {
    const P = this.v;
    const D = this.deform();
    const shoulders = this.sh.map((s) => D(s[0], s[1]));
    const hands: Pt[] = [D(P.lhx, P.lhy), D(P.rhx, P.rhy)];
    return { D, shoulders, hands };
  }

  render(pose: Pose, rigOn: boolean): void {
    const p = this.p;
    const P = this.v;
    const e = this.els;
    const { D } = pose;
    this.el.setAttribute("transform", `translate(${fmt(this.X)} ${fmt(this.G)}) scale(${p.scale})`);
    const bodyD = smoothClosed(this.rest.map((q) => D(q[0], q[1])));
    e.body.setAttribute("d", bodyD);
    e.body2.setAttribute("d", bodyD);
    // legs
    const legs: Array<[Pt, Pt]> = (
      [
        [-1, P.lfx, P.llift],
        [1, P.rfx, P.rlift],
      ] as Array<[number, number, number]>
    ).map(([s, fx, lift]) => {
      const hip = D((s * p.legGap) / 2, -p.legW * 0.7);
      const foot: Pt = [(s * p.legGap) / 2 + fx + P.x, P.y - p.legW / 2 - lift];
      hip[1] = Math.min(hip[1], foot[1] - 3);
      return [hip, foot];
    });
    [e.legL, e.legR].forEach((el, i) => {
      const leg = legs[i] ?? [
        [0, 0],
        [0, 0],
      ];
      el.setAttribute("d", `M${ptStr(leg[0])}L${ptStr(leg[1])}`);
      el.style.strokeWidth = String(p.legW);
    });
    // arms (IK)
    const gap = Math.max(2.6, p.armW * 0.27);
    const arms: ArmChain[] = pose.shoulders.map((S, i) => {
      const side = i ? 1 : -1;
      const linked = pose.links?.[i];
      const H: Pt = linked ?? pose.hands[i] ?? [0, 0];
      const L = this.armL * (linked ? 1.3 : p.prop === "case" && side === p.propSide ? 1.25 : 1);
      return { S, ...ik(S, H, L * 0.5, L * 0.5, side) };
    });
    this.handsW = arms.map((a) => a.H);
    arms.forEach((a, i) => {
      const C: Pt = [2 * a.E[0] - (a.S[0] + a.H[0]) / 2, 2 * a.E[1] - (a.S[1] + a.H[1]) / 2];
      const A = e.arms[i];
      if (!A) return;
      A.fill.setAttribute("d", armShape(p, a.S, C, a.H));
      A.crease.setAttribute("d", crease(p, a.S, C, a.H, gap, i ? 1 : -1));
      A.crease.style.strokeWidth = String(gap);
    });
    // face
    const eyeY = -p.h * p.eyeY;
    const lk = [P.lx, P.ly] as const;
    const eyes: Pt[] = [-1, 1].map((s) => {
      const q = D(s * p.eyeGap, eyeY);
      return [q[0] + lk[0], q[1] + lk[1]];
    });
    const m = D(0, eyeY + p.eyeR * 1.7);
    m[0] += lk[0] * 0.9;
    m[1] += lk[1] * 0.9;
    const eyeType = p.hat === "shades" ? "dot" : this.face.eyes;
    [e.eyeL, e.eyeR].forEach((el, i) => {
      const eye = eyes[i] ?? [0, 0];
      const ep = eyePath(
        eyeType,
        eye[0],
        eye[1],
        p.eyeR,
        eyeType === "dot" || eyeType === "wide" ? this.open : 1,
        this.now,
      );
      el.setAttribute("d", ep.d);
      el.classList.toggle("stroke", !!ep.stroke);
      el.style.strokeWidth = String(p.eyeR * 0.72);
      el.style.display = p.hat === "shades" ? "none" : "";
    });
    const mp = mouthPath(this.face.mouth, m[0], m[1], p.mouthW, clamp(P.mouth, 0, 1.2));
    e.mouth.setAttribute("d", mp.d);
    e.mouth.classList.toggle("stroke", !!mp.stroke);
    e.mouth.style.strokeWidth = String(p.eyeR * 0.6);
    const bw = P.brow;
    e.brows.setAttribute(
      "d",
      Math.abs(bw) < 0.06
        ? ""
        : eyes
            .map(([x, y], i) => {
              const s = i ? 1 : -1;
              const r = p.eyeR;
              const by = y - r * 2.5;
              return `M${fmt(x + s * r * 1.5)} ${fmt(by + Math.max(0, bw) * r * 0.4)}L${fmt(x - s * r * 0.4)} ${fmt(
                by - bw * r * 1.1,
              )}`;
            })
            .join(""),
    );
    e.brows.style.strokeWidth = String(p.eyeR * 0.6);
    [e.blushL, e.blushR].forEach((el, i) => {
      const eye = eyes[i] ?? [0, 0];
      el.setAttribute("cx", String(fmt(eye[0] + (i ? 1 : -1) * p.eyeR * 1.4)));
      el.setAttribute("cy", String(fmt(eye[1] + p.eyeR * 2.1)));
      el.setAttribute("rx", String(fmt(p.eyeR * 1.6)));
      el.setAttribute("ry", String(fmt(p.eyeR * 0.8)));
      el.style.opacity = String(clamp(P.blush, 0, 1) * 0.22);
    });
    // hats + shades
    if (p.hat !== "shades") e.shades.setAttribute("d", "");
    else {
      const a = eyes[0] ?? [0, 0];
      const b = eyes[1] ?? [0, 0];
      const r = p.eyeR * 2.1;
      e.shades.setAttribute(
        "d",
        `M${fmt(a[0] - r)} ${fmt(a[1] - r * 0.6)}h${fmt(r * 2)}v${fmt(r * 0.7)}q0 ${fmt(r * 0.7)} ${fmt(-r)} ${fmt(
          r * 0.7,
        )}q${fmt(-r)} 0 ${fmt(-r)} ${fmt(-r * 0.7)}Z` +
          `M${fmt(b[0] - r)} ${fmt(b[1] - r * 0.6)}h${fmt(r * 2)}v${fmt(r * 0.7)}q0 ${fmt(r * 0.7)} ${fmt(-r)} ${fmt(
            r * 0.7,
          )}q${fmt(-r)} 0 ${fmt(-r)} ${fmt(-r * 0.7)}Z` +
          `M${fmt(a[0] + r)} ${fmt(a[1] - r * 0.4)}L${fmt(b[0] - r)} ${fmt(b[1] - r * 0.4)}`,
      );
    }
    this.renderHat(D);
    e.straps.setAttribute(
      "d",
      p.prop !== "backpack"
        ? ""
        : [-1, 1]
            .map((s) => {
              const a = D(s * p.w * 0.27, -p.h * 0.66);
              const b = D(s * p.w * 0.38, -p.h * 0.5);
              const c = D(s * p.w * 0.33, -p.h * 0.3);
              return `M${ptStr(a)}Q${ptStr(b)} ${ptStr(c)}`;
            })
            .join(""),
    );
    e.straps.style.strokeWidth = String(p.armW * 0.45);
    this.renderProps(arms);
    e.orbit.style.display = this.orbit ? "" : "none";
    if (this.orbit) {
      const top = D(0, -p.h * 1.06);
      const tt = this.now;
      [...e.orbit.children].forEach((s, i) => {
        const a = tt * 3 + (i * TAU) / 3;
        s.setAttribute(
          "transform",
          `translate(${fmt(top[0] + Math.cos(a) * p.w * 0.42)} ${fmt(top[1] + Math.sin(a) * 9)}) scale(.9)`,
        );
      });
    }
    this.renderRig(rigOn, arms, legs, D);
  }

  private renderHat(D: Deform): void {
    const p = this.p;
    const e = this.els;
    const hat = p.hat;
    e.hat.style.display = hat === "none" || hat === "shades" ? "none" : "";
    if (e.hat.style.display) return;
    // filled crown in the face ink: the top of the body outline down to a gently curved band
    const yb = -p.h * (hat === "beanie" ? 0.83 : hat === "pilot" ? 0.85 : 0.87);
    const cy = -p.h * 0.93;
    const grow = 1.03;
    const crown = this.rest
      .filter((q) => q[1] < yb)
      .map(([x, y]) => D(x * grow, cy + (y - cy) * grow));
    const hw = halfWidthAt(this.rest, yb) * grow;
    const band: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      band.push(D(-hw + 2 * hw * u, yb + Math.sin(u * Math.PI) * p.h * 0.03));
    }
    e.hatBand.setAttribute("d", `M${[...crown, ...band].map(ptStr).join("L")}Z`);
    e.hatBand.setAttribute("class", "hatfill");
    const s = this.dir || 1;
    if (hat === "cap") {
      const a = D(s * hw * 0.15, yb + p.h * 0.02);
      const b = D(s * (hw + p.w * 0.3), yb + p.h * 0.045);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Pt;
      e.hatBrim.setAttribute(
        "d",
        `M${ptStr(a)}Q${fmt(m[0])} ${fmt(m[1] - 7)} ${ptStr(b)}Q${fmt(b[0] + s * 2)} ${fmt(b[1] + 4)} ${fmt(
          b[0] - s * 4,
        )} ${fmt(b[1] + 4)}Q${fmt(m[0])} ${fmt(m[1] + 3)} ${fmt(a[0] - s * 8)} ${fmt(a[1] + 5)}Z`,
      );
      e.hatBrim.setAttribute("class", "hatfill");
    } else if (hat === "pilot") {
      const a = D(-hw * 0.75, yb + 4);
      const b = D(hw * 0.75, yb + 4);
      e.hatBrim.setAttribute(
        "d",
        `M${ptStr(a)}Q${fmt((a[0] + b[0]) / 2)} ${fmt(a[1] + 11)} ${ptStr(b)}`,
      );
      e.hatBrim.setAttribute("class", "gapline thick");
    } else {
      const a = D(-hw * 0.92, yb - p.h * 0.035);
      const b = D(hw * 0.92, yb - p.h * 0.035);
      e.hatBrim.setAttribute(
        "d",
        `M${ptStr(a)}Q${fmt((a[0] + b[0]) / 2)} ${fmt(a[1] + p.h * 0.06)} ${ptStr(b)}`,
      );
      e.hatBrim.setAttribute("class", "bodyline");
    }
    const c = D(0, yb - p.h * 0.055);
    const t = D(0, -p.h * 1.01);
    e.hatMark.setAttribute(
      "d",
      hat === "pilot"
        ? `M${fmt(c[0] + 8)} ${fmt(c[1] - 1)}L${fmt(c[0] - 6)} ${fmt(c[1] - 5)}L${fmt(c[0] - 2)} ${fmt(c[1] - 1)}L${fmt(
            c[0] - 6,
          )} ${fmt(c[1] + 3)}Z`
        : hat === "beanie"
          ? `M${fmt(t[0] - 6)} ${fmt(t[1])}a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z`
          : "",
    );
    e.hatMark.setAttribute("class", hat === "beanie" ? "hatfill" : "b");
  }

  private renderProps(arms: ArmChain[]): void {
    const p = this.p;
    const e = this.els;
    const prop = p.prop;
    const hi = p.propSide < 0 ? 0 : 1;
    const H: Pt = arms[hi]?.H ?? [0, 0];
    const walking = !!this.act.travel;
    e.case.style.display = prop === "case" ? "" : "none";
    e.balloon.style.display = prop === "balloon" ? "" : "none";
    e.plane.style.display = prop === "plane" ? "" : "none";
    e.cup.style.display = prop === "coffee" ? "" : "none";
    e.pass.style.display = prop === "passport" ? "" : "none";
    if (prop === "case") {
      const cw = p.w * 0.32;
      const ch = p.h * 0.34;
      const wr = 4.5;
      const hmin = 6;
      const hmax = p.h * 0.3;
      const hx = cw * 0.23;
      const tilt = walking ? this.dir * 0.3 : 0;
      this.caseTilt = mix(this.caseTilt || 0, tilt, 0.08);
      let th = this.caseTilt;
      const top = ch + 2 * wr;
      let L = -H[1] / Math.cos(th) - top;
      let B: Pt;
      if (L < hmin) {
        L = hmin;
        th *= 0.3;
        B = [H[0] - Math.sin(th) * (top + L), H[1] + Math.cos(th) * (top + L)];
      } else {
        if (L > hmax) L = hmax;
        B = [H[0] - Math.sin(th) * (top + L), H[1] + Math.cos(th) * (top + L)];
      }
      if (B[1] > 0) B[1] = 0; // never sink below the floor
      e.case.setAttribute("transform", `translate(${ptStr(B)}) rotate(${fmt(th * 57.3)})`);
      const hd = `M${-hx} ${-top + 2}V${fmt(-top - L)}H${hx}V${-top + 2}`;
      e.handleO.setAttribute("d", hd);
      e.handle.setAttribute("d", hd);
      e.handleO.style.strokeWidth = "7";
      e.handle.style.strokeWidth = "3.4";
      e.caseBody.setAttribute("x", String(-cw / 2));
      e.caseBody.setAttribute("y", String(-top));
      e.caseBody.setAttribute("width", String(cw));
      e.caseBody.setAttribute("height", String(ch));
      e.caseBody.setAttribute("rx", "7");
      e.caseLine.setAttribute("d", "");
      e.wheels.setAttribute(
        "d",
        `M${-cw * 0.3 - wr} ${-wr}a${wr} ${wr} 0 1 0 ${2 * wr} 0a${wr} ${wr} 0 1 0 ${-2 * wr} 0ZM${
          cw * 0.3 - wr
        } ${-wr}a${wr} ${wr} 0 1 0 ${2 * wr} 0a${wr} ${wr} 0 1 0 ${-2 * wr} 0Z`,
      );
    }
    if (prop === "balloon") {
      // pendulum-ish balloon on a spring, lagging the hand
      const tx = H[0] + p.propSide * 14 + Math.sin(this.now * 1.1 + this.phase) * 6;
      const ty = H[1] - 78;
      if (!this.bInit) {
        this.v.bx = tx;
        this.v.by = ty;
        this.bInit = true;
      }
      this.v.bx = mix(this.v.bx, tx, 0.05);
      this.v.by = mix(this.v.by, ty, 0.07);
      const bx = this.v.bx;
      const by = this.v.by;
      const r = 17;
      e.string.setAttribute(
        "d",
        `M${ptStr(H)}Q${fmt((H[0] + bx) / 2 + 8)} ${fmt((H[1] + by) / 2)} ${fmt(bx)} ${fmt(by + r * 1.15)}`,
      );
      e.ball.setAttribute(
        "d",
        `M${fmt(bx)} ${fmt(by + r * 1.18)}C${fmt(bx - r * 1.35)} ${fmt(by + r * 0.6)} ${fmt(bx - r * 1.1)} ${fmt(
          by - r * 1.1,
        )} ${fmt(bx)} ${fmt(by - r * 1.1)}C${fmt(bx + r * 1.1)} ${fmt(by - r * 1.1)} ${fmt(bx + r * 1.35)} ${fmt(
          by + r * 0.6,
        )} ${fmt(bx)} ${fmt(by + r * 1.18)}Z`,
      );
      e.knot.setAttribute(
        "d",
        `M${fmt(bx - 3)} ${fmt(by + r * 1.35)}L${fmt(bx + 3)} ${fmt(by + r * 1.35)}L${fmt(bx)} ${fmt(by + r * 1.1)}Z`,
      );
    }
    if (prop === "plane") {
      let x = H[0] + p.propSide * 6;
      let y = H[1] - 8;
      let rot = p.propSide < 0 ? 180 + 20 : -20;
      if (this.flight > 0 && this.flight < 1) {
        const fl = this.flight;
        const pos = (q: number): Pt => {
          const a = q * TAU;
          const O: Pt = [(p.propSide * p.w) / 5, -p.h * 1.55];
          return [O[0] + Math.sin(a) * p.w * 1.3, O[1] + Math.sin(a * 2) * p.h * 0.28];
        };
        const blend = ss(0, 0.12, fl) * (1 - ss(0.88, 1, fl));
        const a = pos(fl);
        const b = pos(fl + 0.01);
        x = mix(x, a[0], blend);
        y = mix(y, a[1], blend);
        rot = mix(rot, Math.atan2(b[1] - a[1], b[0] - a[0]) * 57.3, blend);
        this.planeW = [x, y];
        if (this.rand() < 0.25) this.bursts.push({ type: "trail", x, y });
      } else this.planeW = null;
      e.plane.setAttribute(
        "transform",
        `translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(rot)}) scale(${this.flight > 0 && this.flight < 1 ? 1.25 : 1})`,
      );
    }
    if (prop === "coffee") {
      const x = H[0] + p.propSide * 3;
      const y = H[1] - 4;
      const t = this.now;
      e.cupBody.setAttribute(
        "d",
        `M${fmt(x - 7)} ${fmt(y - 9)}H${fmt(x + 7)}L${fmt(x + 5.5)} ${fmt(y + 9)}H${fmt(x - 5.5)}ZM${fmt(x - 8)} ${fmt(
          y - 12,
        )}H${fmt(x + 8)}V${fmt(y - 9)}H${fmt(x - 8)}Z`,
      );
      e.steam.setAttribute(
        "d",
        [0, 1]
          .map((i) => {
            const sx = x - 2.5 + i * 5;
            const o = Math.sin(t * 3 + i * 2) * 2.5;
            return `M${fmt(sx)} ${fmt(y - 15)}q${fmt(o)} -5 0 -9t0 -9`;
          })
          .join(""),
      );
    }
    if (prop === "passport") {
      e.pass.setAttribute(
        "transform",
        `translate(${fmt(H[0] + p.propSide * 4)} ${fmt(H[1] - 6)}) rotate(${p.propSide * 12})`,
      );
    }
  }

  private renderRig(on: boolean, arms: ArmChain[], legs: Array<[Pt, Pt]>, D: Deform): void {
    const e = this.els.rig;
    e.style.display = on ? "" : "none";
    if (!on) return;
    const p = this.p;
    const bits: string[] = [];
    for (const a of arms) {
      bits.push(`<path d="M${ptStr(a.S)}L${ptStr(a.E)}L${ptStr(a.H)}"/>`);
      for (const q of [a.S, a.E, a.H])
        bits.push(`<circle cx="${fmt(q[0])}" cy="${fmt(q[1])}" r="2.6"/>`);
    }
    for (const [h, ft] of legs) {
      bits.push(`<path d="M${ptStr(h)}L${ptStr(ft)}"/>`);
      bits.push(`<circle cx="${fmt(h[0])}" cy="${fmt(h[1])}" r="2.6"/>`);
      bits.push(`<circle cx="${fmt(ft[0])}" cy="${fmt(ft[1])}" r="2.6"/>`);
    }
    const spine: Pt[] = [0, 0.25, 0.5, 0.75, 1].map((u) => D(0, -p.h * u));
    bits.push(`<path class="spine" d="M${spine.map(ptStr).join("L")}"/>`);
    for (const q of spine)
      bits.push(`<rect x="${fmt(q[0] - 2.5)}" y="${fmt(q[1] - 2.5)}" width="5" height="5"/>`);
    this.rest.forEach((q, i) => {
      if (i % 4 === 0) {
        const r = D(q[0], q[1]);
        bits.push(`<circle class="cp" cx="${fmt(r[0])}" cy="${fmt(r[1])}" r="1.5"/>`);
      }
    });
    e.innerHTML = bits.join("");
  }

  private build(): PassengerEls {
    const parent = this.el;
    const mk = <K extends keyof SVGElementTagNameMap>(
      tag: K,
      cls: string,
      into: SVGElement = parent,
    ): SVGElementTagNameMap[K] => {
      const el = document.createElementNS(NS, tag);
      if (cls) el.setAttribute("class", cls);
      into.appendChild(el);
      return el;
    };
    const balloon = mk("g", "balloon");
    const string = mk("path", "string", balloon);
    const ball = mk("path", "b", balloon);
    const knot = mk("path", "b", balloon);
    const goo = mk("g", "goo");
    const body = mk("path", "b", goo);
    const legL = mk("path", "leg", goo);
    const legR = mk("path", "leg", goo);
    // arms fuse through a softer second goo pass with a body copy, which rounds the shoulders
    const goo2 = mk("g", "goo2");
    const body2 = mk("path", "b", goo2);
    const arms: ArmEls[] = [0, 1].map(() => {
      const fill = mk("path", "b", goo2);
      const creaseEl = mk("path", "crease");
      return { fill, crease: creaseEl };
    });
    const straps = mk("path", "strap");
    const hat = mk("g", "hat");
    const hatBand = mk("path", "gapline", hat);
    const hatBrim = mk("path", "brim", hat);
    const hatMark = mk("path", "ink", hat);
    const blushL = mk("ellipse", "blush");
    const blushR = mk("ellipse", "blush");
    const eyeL = mk("path", "eye");
    const eyeR = mk("path", "eye");
    const brows = mk("path", "brow");
    const mouth = mk("path", "mouth");
    const shades = mk("path", "shades");
    const prop = mk("g", "prop");
    const caseEl = mk("g", "case", prop);
    const handleO = mk("path", "limb-o", caseEl);
    const handle = mk("path", "limb-f", caseEl);
    const caseBody = mk("rect", "b", caseEl);
    const caseLine = mk("path", "gapline", caseEl);
    const wheels = mk("path", "b", caseEl);
    const held = mk("g", "held");
    const plane = mk("g", "plane", held);
    mk("path", "b", plane).setAttribute("d", PLANE);
    mk("path", "gapline thin", plane).setAttribute("d", PLANE_CREASE);
    const cup = mk("g", "cup", held);
    const cupBody = mk("path", "b outlined", cup);
    const steam = mk("path", "steam", cup);
    const pass = mk("g", "passport", held);
    const passRect = mk("rect", "b outlined", pass);
    passRect.setAttribute("x", "-7");
    passRect.setAttribute("y", "-10");
    passRect.setAttribute("width", "14");
    passRect.setAttribute("height", "19");
    passRect.setAttribute("rx", "2");
    mk("path", "ink", pass).setAttribute("d", "M4.5 -1.5L-3.5 -4.5L-1.5 -1.5L-3.5 1.5Z");
    const orbit = mk("g", "orbit");
    for (let i = 0; i < 3; i++) mk("path", "fxs", orbit).setAttribute("d", FX_SPARK);
    const rig = mk("g", "rigview");
    return {
      balloon,
      string,
      ball,
      knot,
      goo,
      body,
      legL,
      legR,
      goo2,
      body2,
      arms,
      straps,
      hat,
      hatBand,
      hatBrim,
      hatMark,
      blushL,
      blushR,
      eyeL,
      eyeR,
      brows,
      mouth,
      shades,
      prop,
      case: caseEl,
      handleO,
      handle,
      caseBody,
      caseLine,
      wheels,
      held,
      plane,
      cup,
      cupBody,
      steam,
      pass,
      orbit,
      rig,
    };
  }
}

const FX_SPARK = "M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z";
