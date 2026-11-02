import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { EPISODES } from "./episodes";
import { Sheet, sheetFrames, sheetSize } from "./Sheet";
import { FPS } from "./script/parse";
import { buildTimeline } from "./script/timeline";
import { LAYOUT } from "./style/theme";

export const Root: React.FC = () => (
  <>
    {EPISODES.map((e) => (
      <React.Fragment key={e.id}>
      <Composition
        id={e.id}
        component={Episode}
        durationInFrames={buildTimeline(e.script).total}
        fps={FPS}
        width={LAYOUT.width}
        height={LAYOUT.height}
        defaultProps={{ dir: e.dir }}
      />
      {/* 联络表：时长与正片相同（否则 <Freeze> 到后面的帧会被裁掉），只渲第 0 帧 */}
      <Composition
        id={`${e.id}-sheet`}
        component={Sheet}
        durationInFrames={buildTimeline(e.script).total}
        fps={FPS}
        {...sheetSize(sheetFrames(e.dir).length)}
        defaultProps={{ dir: e.dir }}
      />
      </React.Fragment>
    ))}
  </>
);
