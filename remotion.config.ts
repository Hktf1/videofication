import { Config } from "@remotion/cli/config";
import { DefinePlugin } from "webpack";
import fs from "node:fs";

Config.setEntryPoint("engine/src/index.ts");
Config.setPublicDir("engine/public");
Config.setVideoImageFormat("jpeg");

// 用本机已装的 Chrome/Edge，省去下载 Chrome Headless Shell（国内网络很慢）
const browser = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
if (browser) Config.setBrowserExecutable(browser);

// studio 的预览范围由 tools/studio.ts 通过环境变量传进来；Remotion 只注入固定的几个
// process.env 键，所以这里自己define，engine/src/episodes.ts 才读得到
const studioScope = process.env.VIDEOFICATION_STUDIO ?? "";

// 处理稿 script.md、朗读稿.txt 以纯文本方式打包进引擎
Config.overrideWebpackConfig((c) => ({
  ...c,
  module: {
    ...c.module,
    rules: [...(c.module?.rules ?? []), { test: /\.(md|txt)$/, type: "asset/source" }],
  },
  plugins: [
    ...(c.plugins ?? []),
    new DefinePlugin({ "process.env.VIDEOFICATION_STUDIO": JSON.stringify(studioScope) }),
  ],
}));
