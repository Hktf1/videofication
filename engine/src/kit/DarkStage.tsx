// 暗调样片背景：暖黑聚光 + 光斑 + 浮尘 + 暗角 + 胶片颗粒。
// 只渲染一次，贯穿全片，让换屏像同一个空间里的镜头运动。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DARK } from "../style/dark";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 失焦光斑：位置/大小/透明度固定，缓慢漂移
const BOKEH = [
  { x: 8, y: 16, s: 300, o: 0.20, ax: 34, ay: 22, sp: 170, ph: 0.2 },
  { x: 21, y: 68, s: 190, o: 0.14, ax: 26, ay: 30, sp: 210, ph: 1.1 },
  { x: 37, y: 12, s: 150, o: 0.10, ax: 18, ay: 16, sp: 190, ph: 2.3 },
  { x: 62, y: 22, s: 250, o: 0.16, ax: 30, ay: 20, sp: 160, ph: 0.8 },
  { x: 79, y: 58, s: 340, o: 0.22, ax: 40, ay: 26, sp: 230, ph: 1.7 },
  { x: 92, y: 30, s: 170, o: 0.12, ax: 22, ay: 28, sp: 200, ph: 2.9 },
  { x: 52, y: 78, s: 220, o: 0.13, ax: 28, ay: 18, sp: 240, ph: 3.4 },
];

const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 137.5 + 13) % 100,
  y: (i * 61 + 7) % 100,
  r: 1.2 + (i % 3) * 0.9,
  o: 0.10 + (i % 4) * 0.045,
  sp: 0.9 + (i % 5) * 0.35,
  ph: i * 0.73,
}));

// 颗粒：静态噪点图，整片轻微移动，避免均匀的数码感
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='0.55'/></svg>")`;

export const DarkStage: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const push = interpolate(f, [0, durationInFrames], [1, 1.035], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.bg0, overflow: "hidden" }}>
      {/* 聚光底 */}
      <AbsoluteFill
        style={{
          transform: `scale(${push})`,
          background: `radial-gradient(ellipse 68% 58% at 50% 42%, ${DARK.glow} 0%, ${DARK.bg1} 46%, ${DARK.bg0} 82%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 46% 26% at 50% 84%, rgba(126,92,52,0.16) 0%, transparent 70%)`,
        }}
      />
      {/* 失焦光斑 */}
      {BOKEH.map((b, i) => {
        const t = f / b.sp + b.ph;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.s,
              height: b.s,
              marginLeft: -b.s / 2,
              marginTop: -b.s / 2,
              borderRadius: "50%",
              opacity: b.o,
              background: "radial-gradient(circle at 42% 40%, rgba(230,196,138,0.55) 0%, rgba(150,108,58,0.18) 46%, transparent 70%)",
              filter: "blur(26px)",
              transform: `translate(${Math.sin(t) * b.ax}px, ${Math.cos(t * 0.8) * b.ay}px) scale(${push})`,
            }}
          />
        );
      })}
      {/* 浮尘 */}
      {DUST.map((d, i) => {
        const drift = (d.y - (f * d.sp) / 22 + 100) % 100;
        const tw = 0.55 + 0.45 * Math.sin(f / 18 + d.ph);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: `${drift}%`,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: "50%",
              background: "rgba(226,204,160,0.8)",
              opacity: d.o * tw,
              filter: "blur(0.6px)",
            }}
          />
        );
      })}
      {/* 暗角 + 底部压暗 */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 62% 54% at 50% 43%, transparent 32%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.9) 100%)",
        }}
      />
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 18%, transparent 76%, rgba(0,0,0,0.42) 100%)" }}
      />
      {/* 胶片颗粒 */}
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundPosition: `${(f * 0.4) % 220}px ${(f * 0.27) % 220}px`,
          opacity: 0.055,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
