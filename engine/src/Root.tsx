import React from "react";
import { Composition, Folder, getRemotionEnvironment } from "remotion";
import { Episode } from "./Episode";
import { EPISODES, SAMPLE, STUDIO_EPISODES, type EpisodeEntry } from "./episodes";
import { Sheet, sheetFrames, sheetSize, SIZE_SAMPLES, SizeSheet } from "./Sheet";
import { FPS } from "./script/parse";
import { buildTimeline, chapters } from "./script/timeline";
import { LAYOUT } from "./style/theme";
import { Remake15Compositions } from "./remake15/Film";
import { isMotionStyle } from "./script/motion";
import { ArticlePreview } from "./ArticlePreview";
import { episodeId } from "./episodeId";
import { Compare05Registration } from "./Compare05";

const Pair: React.FC<{ e: EpisodeEntry }> = ({ e }) => {
  const { items, total } = buildTimeline(e.script, e.voice);
  return (
    <>
      <Composition id={e.id} component={Episode} durationInFrames={total} fps={FPS}
        width={LAYOUT.width} height={LAYOUT.height} defaultProps={{ dir: e.dir }} />
      {/* 章节内再分章时：npm run render -- 01-1 1 */}
      {chapters(e.script).map((c) => (
        <Composition key={c.no} id={`${e.id}-c${c.no}`} component={Episode} durationInFrames={buildTimeline(e.script, e.voice, c.no).total}
          fps={FPS} width={LAYOUT.width} height={LAYOUT.height} defaultProps={{ dir: e.dir, chapter: c.no }} />
      ))}
      {/* 联络表：时长与正片相同（否则 <Freeze> 到后面的帧会被裁掉），只渲第 0 帧 */}
      <Composition id={`${e.id}-sheet`} component={Sheet} durationInFrames={total} fps={FPS}
        {...sheetSize(sheetFrames(e.dir).length)} defaultProps={{ dir: e.dir }} />
      {e === SAMPLE && (
        <Composition id="sample-sizes" component={SizeSheet} durationInFrames={total} fps={FPS}
          width={LAYOUT.width / 2} height={SIZE_SAMPLES.length * (LAYOUT.height / 2 + 8)}
          defaultProps={{ dir: e.dir, at: longestScreen(items) }} />
      )}
    </>
  );
};

// 字号试样取最长的一屏（最容易暴露问题）
const longestScreen = (items: ReturnType<typeof buildTimeline>["items"]) => {
  const s = [...items].sort((a, b) => b.screen.text.length - a.screen.text.length)[0];
  return s ? s.from + s.timing.fadeOutAt - 1 : 0;
};

// studio 里每章一个文件夹，名字带文章前缀（抽屉里的路径把 / 换成 - 更易读）
const safeId = (t: string) => t.replace(/\//g, "-").replace(/[^a-zA-Z0-9一-鿿-]/g, "");

const EpisodeFolder: React.FC<{ e: EpisodeEntry }> = ({ e }) => {
  const size = { fps: FPS, width: LAYOUT.width, height: LAYOUT.height };
  // 多版本同名章节必须用带版本的 id，否则 studio 里会撞出重复 composition
  const id = e.id;
  return (
    <Folder name={safeId(e.dir)}>
      <Composition id={id} component={Episode} durationInFrames={buildTimeline(e.script, e.voice).total}
        {...size} defaultProps={{ dir: e.dir }} />
      {chapters(e.script).map((c) => (
        <Composition key={c.no} id={`${id}-c${c.no}`} component={Episode}
          durationInFrames={buildTimeline(e.script, e.voice, c.no).total} {...size}
          defaultProps={{ dir: e.dir, chapter: c.no }} />
      ))}
    </Folder>
  );
};

export const Root: React.FC = () => {
  const visible=(getRemotionEnvironment().isStudio?STUDIO_EPISODES:EPISODES).filter(e=>isMotionStyle(e.script.meta));
  const groups=new Map<string,EpisodeEntry[]>();
  for(const entry of visible){
    const key=`${entry.article}/${entry.version}`;
    groups.set(key,[...(groups.get(key)??[]),entry]);
  }
  const full=<Folder name="整篇预览">{[...groups.values()].map(entries=>{
    const ordered=[...entries].sort((a,b)=>a.name.localeCompare(b.name,"zh",{numeric:true}));
    const first=ordered[0];
    const id=episodeId(first.article?.split("/").pop()??first.name,first.version)+"-full";
    return <Composition key={id} id={id} component={ArticlePreview} fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
      durationInFrames={ordered.reduce((sum,e)=>sum+buildTimeline(e.script,e.voice).total,0)} defaultProps={{dirs:ordered.map(e=>e.dir)}}/>;
  })}</Folder>;
  const body = getRemotionEnvironment().isStudio ? (
    <>{STUDIO_EPISODES.filter(e => isMotionStyle(e.script.meta)).map((e) => <EpisodeFolder key={e.id} e={e} />)}</>
  ) : (
    <>{[SAMPLE, ...EPISODES].filter(e => isMotionStyle(e.script.meta)).map((e) => <Pair key={e.id} e={e} />)}</>
  );
  return <>{full}<Compare05Registration/><Remake15Compositions />{body}</>;
};
