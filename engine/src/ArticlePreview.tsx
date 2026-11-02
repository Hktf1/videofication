import React from "react";
import { Series, useVideoConfig } from "remotion";
import { Episode } from "./Episode";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";

/** 与逐章导出后合并使用相同的章节时间线；预览不需要先生成 MP4。 */
export const ArticlePreview:React.FC<{dirs:string[]}>=({dirs})=>{
  const {fps}=useVideoConfig();
  return <Series>{dirs.map(dir=>{
    const ep=findEpisode(dir);
    if(!ep)throw new Error(`预览章节不存在：${dir}`);
    return <Series.Sequence key={dir} name={ep.name} durationInFrames={buildTimeline(ep.script,ep.voice).total} premountFor={fps}>
      <Episode dir={dir}/>
    </Series.Sequence>;
  })}</Series>;
};
