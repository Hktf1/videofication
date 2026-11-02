// 02-1 小人样片的硬编码实现（临时保留，后续会改成配置驱动）
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { INK } from "../style/ink";
import { FIGURE_FROM, type FigureSlot } from "../experiment/figure02";
import { type Pt, prog, smooth, lin, mix, mixPt, add, bump, smoothPath } from "./InkUtils";
import { Stroke, Blot, body, Figure } from "./InkElements";

// 路面高度
const gy = (x: number) => 690 + 7 * Math.sin(x / 160) + 3 * Math.sin(x / 47);
const PATH_X0 = 170, PATH_X1 = 1750;
const pathPts = (x0: number, x1: number, n = 24): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const x = mix(x0, x1, i / (n - 1));
    return [x, gy(x)] as Pt;
  });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const FigureCanvas: React.FC<{ slots: FigureSlot[] }> = ({ slots }) => {
  const f = useCurrentFrame();
  const slot = (i: number) => slots[i - FIGURE_FROM];
  const at = (i: number) => slot(i)?.from ?? 0;
  const ch = (i: number, k: number) => at(i) + (slot(i)?.chars[k] ?? 0);
  const end = (i: number) => at(i) + (slot(i)?.frames ?? 0);

  /* 小人的位置与姿态 */
  const noHope = ch(16, 5); // 「没有」
  const stopAt = ch(17, 4); // 「做不下去」
  const walkIn = interpolate(f, [0, noHope, stopAt], [260, 600, 640], { ...clamp, easing: Easing.out(Easing.quad) });
  const hesT = lin(f, at(23), end(23));
  const hesitate = 26 * Math.sin(Math.PI * hesT);
  const swayEnv = prog(f, at(22), 8) * (1 - prog(f, at(23), 8));
  const sway = Math.sin((f - at(22)) * 0.32) * swayEnv;
  const stepAts = [1, 4, 7, 9].map((k) => ch(25, k)); // 继 / 前 / 走 / 步
  const steps = stepAts.reduce((a, t) => a + 38 * smooth(f, t - 6, 12), 0);
  const trudge = 110 * lin(f, at(26), at(32));
  const x = walkIn + hesitate + steps + trudge + 9 * sway;

  const burdenP = ch(29, 6), burden2 = ch(31, 6), kneelAt = ch(34, 6);
  const kneel = smooth(f, kneelAt - 4, 22);
  const lean = 0.14 * prog(f, stopAt, 20) + 0.1 * sway
    + 0.3 * prog(f, burdenP, 16) + 0.2 * prog(f, burden2, 16) + 0.12 * prog(f, at(33), 40)
    + 0.15 * kneel;
  const jit = 9 * prog(f, ch(24, 4) - 6, 10) * (1 - 0.75 * prog(f, at(25), 30)) * (1 - kneel);
  const fig = body({ x, phase: x / 20, amp: (1 - 0.4 * prog(f, burdenP, 20)) * (1 - kneel), lean, kneel, jit, f, gy });

  /* 朱砂：远处的希望 */
  const SPARK: Pt = [1600, gy(1600) - 135];
  const outAt = ch(35, 1) - 6;
  const dim = prog(f, noHope, 12);
  const flicker = f > kneelAt ? 0.55 + 0.45 * Math.sin(f * 1.4) * Math.sin(f * 0.37) : 1;
  const sparkOp = prog(f, 0, 14) * mix(1, 0.32, dim) * flicker * (1 - prog(f, outAt, 8));
  const sparkR = mix(15, 8, dim) * (1 - 0.5 * prog(f, kneelAt, 30));
  const smoke = prog(f, outAt, 26) * (1 - prog(f, outAt + 18, 18));

  /* 负面信息：一滴墨 → 裂纹 */
  const DROP_X = 1010;
  const land = ch(18, 4); // 「一点」
  const dropY = interpolate(f, [land - 12, land], [-40, gy(DROP_X)], { ...clamp, easing: Easing.in(Easing.quad) });
  const crackAt = ch(19, 4); // 「失败」
  const g0 = gy(DROP_X);
  const crackL: Pt[] = [[DROP_X, g0], [988, g0 + 6], [968, g0 - 4], [944, g0 + 5], [916, g0 + 1]];
  const crackR: Pt[] = [[DROP_X, g0], [1030, g0 - 5], [1052, g0 + 4], [1078, g0 - 2]];

  /* 三团墨：焦虑 / 内耗 / 怀疑 → 涌上来 → 收成头顶的怀疑云 */
  const segs = [ch(20, 0), ch(20, 3), ch(20, 6)];
  const surge = smooth(f, ch(21, 4) - 6, 26); // 「涌」
  const merge = smooth(f, at(26), 30);
  const cloudC: Pt = add(fig.head, [0, -105 - 10 * lean]);
  const cloudGrow = 1 + 0.18 * bump(f, ch(27, 2), 10) + 0.35 * prog(f, ch(30, 5) + 4, 16) + 0.35 * prog(f, at(32), 60);
  const blots = [
    { home: [DROP_X, g0 - 4] as Pt, r: 24 * prog(f, land, 10) + 50 * prog(f, segs[0], 22), off: [-30, 4] as Pt, cr: 30 },
    { home: [735, 410] as Pt, r: 62 * prog(f, segs[1], 22), off: [26, -10] as Pt, cr: 25 },
    { home: [455, 545] as Pt, r: 56 * prog(f, segs[2], 22), off: [4, 16] as Pt, cr: 27 },
  ].map((b, i) => {
    const toward = mixPt(b.home, fig.head, 0.38 * surge);
    const c = mixPt(toward, add(cloudC, b.off), merge);
    const r = mix(b.r * (1 + 0.25 * surge), b.cr * cloudGrow, merge);
    const op = mix(0.85 * (1 - 0.3 * prog(f, at(22), 14)) * (1 - 0.55 * prog(f, at(25), 14)), 0.92, merge);
    return { c, r, op, seed: i * 2.3 + 1 };
  });
  const cloudBottom: Pt = add(cloudC, [0, 30 * cloudGrow]);

  /* 每走一步留下的墨脚印，一步比一步重 */
  const prints = stepAts.map((t, i) => ({
    x: 640 + 38 * (i + 1) + 6, r: 6 + 2.6 * i, p: prog(f, t + 4, 8),
  }));
  const printsOp = 1 - 0.6 * prog(f, at(28), 20);

  /* 前进本身：前方的路被描深 */
  const aheadX = 640 + 38 * 4 + 20;
  const ahead = prog(f, ch(28, 2), 24) * (1 - prog(f, at(29) + 10, 20));

  /* 痛苦：云滴到背上，成了一团重负 */
  const burdenR = 28 * prog(f, burdenP, 14) + 12 * prog(f, burden2, 14) + 14 * prog(f, at(33), 40);
  const burdenC = fig.back(burdenR);
  const drip = (t: number) => {
    const p = lin(f, t - 10, t);
    return p > 0 && p < 1 ? mixPt(cloudBottom, burdenC, Easing.in(Easing.quad)(p)) : null;
  };
  const drips = [drip(burdenP), drip(burden2)];
  const threadP = prog(f, ch(30, 5) - 8, 14) * (1 - prog(f, ch(32, 2), 12));
  const threadD = smoothPath([add(burdenC, [0, -burdenR]), add(mixPt(burdenC, cloudBottom, 0.5), [-26, 0]), cloudBottom]);

  /* 互相强化：把云和重负圈在一起的转圈 */
  const loopP = prog(f, ch(32, 2), 20);
  const loopW = 3 + 6 * prog(f, at(33), 50);
  const lc = mixPt(cloudC, burdenC, 0.5);
  const ry = Math.abs(cloudC[1] - burdenC[1]) / 2 + 58;
  const rx = 82 + 20 * prog(f, at(33), 50);
  const loopPts = Array.from({ length: 14 }, (_, i) => {
    const t = (i / 14) * Math.PI * 2;
    return [lc[0] + rx * Math.cos(t) * (1 + 0.05 * Math.sin(3 * t)), lc[1] + ry * Math.sin(t)] as Pt;
  });

  /* 镜头：强化开始后慢慢推近小人 */
  const zoom = 1 + 0.2 * smooth(f, at(32), end(34) - at(32));
  const cam = `translate(${fig.hip[0]} ${fig.hip[1]}) scale(${zoom}) translate(${-fig.hip[0]} ${-fig.hip[1]})`;

  /* 墨池：从小人脚下漫开；最后一屏吞掉整个画面 */
  const poolR = 320 * smooth(f, at(33), end(34) - at(33));
  const flood = interpolate(f, [at(35) - 10, at(35) + 14], [0, 0.94], clamp);

  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="fig-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.06" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="fig-bleed" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.4" />
        </filter>
        <radialGradient id="spark-glow">
          <stop offset="0%" stopColor={INK.accent} stopOpacity={0.45} />
          <stop offset="100%" stopColor={INK.accent} stopOpacity={0} />
        </radialGradient>
      </defs>

      <g transform={cam}>
        {/* 路 */}
        <Stroke d={smoothPath(pathPts(PATH_X0, PATH_X1))} progress={prog(f, 0, 26)} width={3} color={INK.dim} />
        <Stroke d={smoothPath(pathPts(aheadX, 1560, 12))} progress={ahead} width={5.5} opacity={ahead ? 0.9 : 0} />

        {/* 墨池在小人下面，让小人还看得见 */}
        <Blot c={[fig.hip[0], gy(fig.hip[0]) - 20]} r={poolR} seed={9} opacity={0.5} f={f} />

        {/* 朱砂 */}
        <circle cx={SPARK[0]} cy={SPARK[1]} r={sparkR * 4.5} fill="url(#spark-glow)" opacity={sparkOp} />
        <circle cx={SPARK[0]} cy={SPARK[1]} r={sparkR} fill={INK.accent} opacity={sparkOp} />
        <Stroke d={smoothPath([SPARK, [SPARK[0] - 10, SPARK[1] - 30], [SPARK[0] + 8, SPARK[1] - 58], [SPARK[0] - 4, SPARK[1] - 84]])}
          progress={prog(f, outAt, 24)} width={2} color={INK.wash} opacity={smoke} />

        {/* 落下的墨滴与裂纹 */}
        {f >= land - 12 && f < land && <circle cx={DROP_X} cy={dropY} r={9} fill={INK.ink} />}
        <Stroke d={smoothPath(crackL)} progress={prog(f, crackAt, 14)} width={2.4} />
        <Stroke d={smoothPath(crackR)} progress={prog(f, crackAt + 3, 14)} width={2.4} />

        {/* 脚印 */}
        {prints.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={gy(p.x) + 2} rx={p.r * 1.6 * p.p} ry={p.r * 0.55 * p.p}
            fill={INK.ink} opacity={0.75 * printsOp} filter="url(#fig-bleed)" />
        ))}

        {/* 怀疑云 → 痛苦 → 互相强化 */}
        <Stroke d={smoothPath(loopPts, true)} progress={loopP} width={loopW} color={INK.ink} opacity={0.85}
          dash={loopP > 0.999 ? "46 20" : undefined} offset={-(f - ch(32, 2)) * 3.2} />
        <Stroke d={threadD} progress={threadP} width={2.2} opacity={threadP > 0 ? 0.8 : 0} />
        {blots.map((b, i) => <Blot key={i} c={b.c} r={b.r} seed={b.seed} opacity={b.op} f={f} />)}
        {drips.map((d, i) => d && <circle key={i} cx={d[0]} cy={d[1]} r={7} fill={INK.ink} />)}
        <Blot c={burdenC} r={burdenR} seed={5.5} opacity={0.92} f={f} />

        <Figure b={fig} />
      </g>

      {/* 彻底放弃：墨吞掉一切 */}
      <rect x={0} y={0} width={1920} height={1080} fill="#16120E" opacity={flood} />
    </svg>
  );
};
