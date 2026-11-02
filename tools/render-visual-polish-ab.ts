import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {acquireLock} from './lib';
import {preflight} from './preflight';
import type {SceneCue} from '../engine/src/script/scene';

const root = process.cwd();
const experiment = path.join(root, 'engine/src/experiment/visual-polish-ab');
const entry = path.join(experiment, 'index.ts');
const output = path.join(root, '参考样片/画面精修AB-20261029');
const temp = path.join(root, '.tmp/visual-polish-ab');
const data = JSON.parse(fs.readFileSync(path.join(experiment, 'excerpt.json'), 'utf8')) as {
  source: string; sourceHashes: Record<string, string>; durationInFrames: number; fps: number; cues: SceneCue[];
};
const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const cli = path.join(root, 'node_modules/@remotion/cli/remotion-cli.js');
const env = {...process.env, TMPDIR: temp, TMP: temp, TEMP: temp};
fs.mkdirSync(output, {recursive: true});
fs.mkdirSync(temp, {recursive: true});
acquireLock('render');

async function run(args: string[], label: string) {
  const log = fs.createWriteStream(path.join(temp, `${label}.log`));
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']});
    let tail = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk: Buffer) => {
      log.write(chunk); tail = (tail + chunk.toString()).slice(-8000);
    });
    child.on('error', reject);
    child.on('exit', code => {log.end(); code === 0 ? resolve() : reject(new Error(`${label} 失败 (${code})\n${tail}`));});
  });
  console.log(`${label} 完成`);
}

async function main() {
  const errors = preflight(data.source.replace(/^episodes\//, ''));
  if (errors.length) throw new Error(errors.join('\n'));
  for (const [name, expected] of Object.entries(data.sourceHashes)) {
    if (hash(path.join(root, data.source, name)) !== expected) throw new Error(`来源已变动：${name}，请保留快照后重新取样`);
  }
  if (data.cues.some((cue, i) => cue.frames <= 0 || (i && cue.at !== data.cues[i - 1].at + data.cues[i - 1].frames))) {
    throw new Error('样片字幕不连续');
  }
  const polished = fs.readFileSync(path.join(experiment, 'PolishedScene.tsx'), 'utf8');
  for (const [, cueText, word] of polished.matchAll(/at\('([^']+)', '([^']+)'\)/g)) {
    const cue = data.cues.find(c => c.text.includes(cueText));
    if (!cue || !cue.text.includes(word) || !Number.isFinite(cue.chars[cue.text.indexOf(word)])) {
      throw new Error(`缺少原词节拍：${cueText} / ${word}`);
    }
  }
  console.log('来源、就绪状态、两版共用时间线、逐词动作触发检查通过');
  if (process.argv.includes('--repair-baseline-start')) {
    // 摘录从已存在的场景开始：只修正最初 0.3 秒的场景状态，其余画面与整条音轨保留。
    const prefixFrames = Math.round(.3 * data.fps);
    const prefix = path.join(temp, 'baseline-prefix.mp4');
    await run(['render', entry, 'A-Baseline', prefix, `--frames=0-${prefixFrames - 1}`,
      '--codec=h264', '--crf=18', '--log=warn'], 'baseline-prefix');
    const original = path.join(output, 'A-基础版.mp4');
    const fixed = path.join(temp, 'baseline-fixed.mp4');
    const untouched = path.join(temp, 'baseline-before-prefix-fix.mp4');
    if (!fs.existsSync(untouched)) fs.copyFileSync(original, untouched);
    const filter = `[0:v]setpts=PTS-STARTPTS[p];[1:v]trim=start_frame=${prefixFrames},setpts=PTS-STARTPTS[r];[p][r]concat=n=2:v=1:a=0[v]`;
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', prefix, '-i', untouched,
      '-filter_complex', filter, '-map', '[v]', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(data.fps), '-fps_mode', 'cfr', '-c:a', 'copy', '-frames:v', String(data.durationInFrames),
      '-movflags', '+faststart', fixed], {cwd: root, env, stdio: 'inherit', shell: false});
    if (result.status !== 0) throw new Error('基础版起始状态修正失败');
    // 帧数上限会让第一次编码少拷贝尾部一个 AAC 包，单独封装保留原音轨全部数据。
    const muxed = path.join(temp, 'baseline-final.mp4');
    const mux = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', fixed, '-i', untouched,
      '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', muxed],
    {cwd: root, env, stdio: 'inherit', shell: false});
    if (mux.status !== 0) throw new Error('原音轨封装失败');
    fs.copyFileSync(muxed, original);
    const manifestFile = original + '.manifest.json';
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.inputs['Comparison.tsx'] = hash(path.join(experiment, 'Comparison.tsx'));
    manifest.outputSha256 = hash(original);
    manifest.prefixCorrection = {frames: prefixFrames, reason: '恢复摘录前已存在的场景，首帧有正文画面',
      voice: '原视频完整音轨直接复制', remainingFrames: data.durationInFrames - prefixFrames};
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    console.log('基础版首帧状态已修正，完整音轨保持原样');
    return;
  }
  if (!process.argv.includes('--videos')) {
    for (const frame of [150, 570, 835, 1150]) {
      await run(['still', entry, 'Compare', path.join(output, `检查-${frame}.png`), `--frame=${frame}`, '--log=warn'], `still-${frame}`);
    }
    return;
  }
  for (const [id, filename] of [['A-Baseline', 'A-基础版.mp4'], ['B-Polished', 'B-优化版.mp4'], ['Compare', 'AB-同步对比.mp4']]) {
    console.log(`开始 ${id}：${data.durationInFrames} 帧`);
    await run(['render', entry, id, path.join(output, filename), '--codec=h264', '--crf=18', '--pixel-format=yuv420p',
      '--x264-preset=veryfast', `--concurrency=${Math.min(8, os.availableParallelism())}`, '--log=warn'], id);
    const inputs = ['excerpt.json', 'BaselineScene.tsx', 'PolishedScene.tsx', 'Comparison.tsx', '画面脚本.md'];
    fs.writeFileSync(path.join(output, `${filename}.manifest.json`), JSON.stringify({
      renderedAt: new Date().toISOString(), composition: id, style: 'v1', styleId: 'motion', purpose: 'visual-polish-ab-experiment',
      fps: data.fps, frames: data.durationInFrames, source: data.source, sourceHashes: data.sourceHashes,
      inputs: Object.fromEntries(inputs.map(file => [file, hash(path.join(experiment, file))])),
      voiceSha256: hash(path.join(root, 'engine/public/experiments/visual-polish-ab/voice.wav')),
      bgmSha256: hash(path.join(root, 'engine/public/bgm/default.mp3')),
      dependenciesSha256: hash(path.join(root, 'package-lock.json')), outputSha256: hash(path.join(output, filename)),
    }, null, 2) + '\n');
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
