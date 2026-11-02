import type { FigureSpec, figureScenes } from "./figure";

export type FigureSceneData = ReturnType<typeof figureScenes>[number];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Fixed-topology geometry lets the same paths bend between semantic scenes. */
export function figureTarget(spec: FigureSpec, local: number, frames: number, frame: number, fps: number) {
  const a = spec.action;
  const p = Math.max(0, Math.min(1, local / Math.max(1, frames - 1)));
  const walk = a === "前进" || a === "希望" || a === "重负";
  const x = a === "受阻" ? 710 + 270 * smooth(p * 2)
    : walk ? 650 + 430 * p : 910 + (a === "犹豫" ? Math.sin(frame / fps * 3) * 15 : 0);
  const branch = a === "选择", wall = a === "受阻", goal = a === "前进" || a === "希望";
  return {
    x, amp: walk ? (a === "重负" ? 0.45 : 0.8) : wall ? 0.8 * (1 - smooth(p * 2)) : 0,
    lean: a === "重负" ? 0.55 : a === "放弃" ? 0.65 : a === "犹豫" ? Math.sin(frame / fps * 3) * 0.12 : 0.06,
    kneel: a === "放弃" ? 1 : 0, jit: a === "犹豫" ? 1.5 : 0,
    question: a === "犹豫" ? 1 : 0,
    load: a === "重负" ? 1 : 0, pool: a === "放弃" ? 1 : 0,
    // Two quadratic strokes, retained even when collapsed into the ground.
    upper: branch ? [1030,690,1220,600,1480,485] : [1030,690,1250,690,1480,690],
    lower: branch ? [1030,690,1250,710,1480,775] : wall ? [1130,690,1130,575,1130,460] : [1030,690,1250,690,1480,690],
    upperOpacity: branch ? 1 : 0, lowerOpacity: branch || wall ? 1 : 0,
    strokeWidth: wall ? 9 : 4,
    dotX: wall ? 1130 : 1480, dotY: branch ? 775 : wall ? 460 : goal ? 550 : 690,
    dotR: branch ? 12 : goal ? 13 : 0, halo: goal ? 1 : 0,
  };
}
export type FigureMotion = ReturnType<typeof figureTarget>;
function blend(a: FigureMotion, b: FigureMotion, t: number): FigureMotion {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return Object.fromEntries(Object.keys(b).map(key => {
    const k = key as keyof FigureMotion, av = a[k], bv = b[k];
    return [k, Array.isArray(bv) ? bv.map((n, i) => mix((av as number[])[i], n, t)) : mix(av as number, bv, t)];
  })) as FigureMotion;
}

/** Pure absolute-frame sampling: seeking and out-of-order rendering are identical. */
export function figureMotion(scenes: FigureSceneData[], frame: number, fps: number) {
  if (!scenes.length || frame < scenes[0].from) return null;
  let previous: FigureMotion | undefined;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const end = scene.from + scene.frames - 1;
    const sample = Math.min(frame, end);
    const local = sample - scene.from;
    const t = previous ? smooth(local / Math.max(1, Math.min(fps * 0.9, scene.frames - 1))) : 1;
    const target = figureTarget(scene.spec, local, scene.frames, sample, fps);
    const state = previous ? blend(previous, target, t) : target;
    if (i === scenes.length - 1 || frame < scenes[i + 1].from) {
      return { state, scene, previousLabel: scenes[i - 1]?.spec.label, progress: t, frame: sample };
    }
    previous = state;
  }
  return null;
}
