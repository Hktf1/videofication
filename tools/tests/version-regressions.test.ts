import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {EP_DIR, ROOT, articleStyle, resolveEpisode, resolveVersion, outputFor} from '../lib';
import {speechSettings} from '../language';
import {parsePerformance} from '../perform';
import {alignVoice} from '../../engine/src/script/sync';

test('选版、英文配音配置与跨版本合并风格回归', () => {
  const folder = fs.mkdtempSync(path.join(EP_DIR, '999998-regression-'));
  const article = path.basename(folder), zh = '中文-纯文字v1', en = '英文-极简动效v4';
  const chapter = '999998-1-章';
  const run = (file: string, args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', path.join(ROOT, file), ...args], {cwd: ROOT, encoding: 'utf8'});
  try {
    for (const [v, language, style, voice] of [[zh,'中文','v1','云健'],[en,'英文','v4','en-US-JennyNeural']]) {
      const dir = path.join(folder,v,chapter); fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(folder,v,'版本.md'), `语言：${language}\n风格：${style}\n音色：${voice}\n`);
      for (const f of fs.readdirSync(path.join(EP_DIR,'_template-chapter'))) fs.copyFileSync(path.join(EP_DIR,'_template-chapter',f),path.join(dir,f));
      fs.writeFileSync(path.join(dir,'script.md'),`---\n风格：${style}\n---\n## 999998-1 章\nHello world\n`);
      fs.writeFileSync(path.join(dir,'朗读稿.txt'),'Hello world.');
    }
    const onlyZh = '999998-2-只有中文版'; fs.mkdirSync(path.join(folder,zh,onlyZh));
    fs.writeFileSync(path.join(folder,zh,onlyZh,'script.md'),'---\n风格：v1\n---\n## 999998-2 章\n测试\n');
    fs.writeFileSync(path.join(folder,'status.md'),`当前版本：${en}\n`);
    assert.equal(resolveEpisode('999998-1'), `${article}/${en}/${chapter}`);
    // 缺章必须退出，不能落到另一种语言的同号章节。
    const evalCode = `import {resolveEpisode} from ${JSON.stringify(pathToFileURL(path.join(ROOT,'tools/lib.ts')).href)};resolveEpisode('999998-2');`;
    const missing = spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',evalCode],{cwd:ROOT,encoding:'utf8'});
    assert.equal(missing.status,1); assert.match(missing.stderr,/找不到章节/);
    assert.equal(resolveEpisode(`${article}/${zh}/${chapter}`),`${article}/${zh}/${chapter}`);
    assert.equal(resolveEpisode('999998-1',zh),`${article}/${zh}/${chapter}`);
    assert.deepEqual(speechSettings(`${article}/${en}/${chapter}`),{locale:'en-US',language:'en',voice:'en-US-JennyNeural'});
    assert.equal(speechSettings(`${article}/${zh}/${chapter}`).voice,'zh-CN-YunjianNeural');
    const dry = run('tools/tts.ts',['999998-1','--dry']);
    assert.equal(dry.status,0,dry.stderr); assert.match(dry.stdout,/en-US-JennyNeural/);
    fs.writeFileSync(path.join(folder,en,chapter,'朗读稿.演出.txt'),'Hello world.');
    const performanceDry = run('tools/tts.ts',['999998-1','--dry']);
    assert.equal(performanceDry.status,0,performanceDry.stderr); assert.match(performanceDry.stdout,/en-US-JennyNeural/);
    assert.equal(parsePerformance('@音色 en-GB-RyanNeural\nHello world.','Hello world.').errors.length,0);
    const perf = parsePerformance('Hello world.','Hello world.',speechSettings(`${article}/${en}/${chapter}`).voice);
    assert.equal(perf.parts[0].kind === 'text' && perf.parts[0].style.voice,'en-US-JennyNeural');
    fs.writeFileSync(path.join(folder,'status.md'),`当前版本：${zh}\n`);
    const selected = resolveVersion(article,en);
    assert.equal(articleStyle(article), 'v1'); assert.equal(articleStyle(article,selected),'v1');
    assert.match(outputFor(path.join(folder,'out'),'film',articleStyle(article,selected)),/film\.mp4$/);
    const all = run('tools/render.ts',['--all','--dry']);
    assert.equal(all.status,0,all.stderr);
    const plan = JSON.parse(all.stdout); assert.equal(plan.dry,true);
    assert.ok(plan.targets.some((t: {dir: string})=>t.dir === `${article}/${en}/${chapter}`));
    const filtered = run('tools/render.ts',['--all','--version',en,'--dry']);
    assert.equal(filtered.status,0,filtered.stderr);
    assert.ok(JSON.parse(filtered.stdout).targets.every((t: {dir: string})=>t.dir.includes(`/${en}/`)));
  } finally {
    const relative = path.relative(EP_DIR,folder);
    assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.dirname(folder)===path.resolve(EP_DIR));
    fs.rmSync(folder,{recursive:true,force:true});
  }
});

test('英文识别忽略大小写差异，保留原稿字符', () => {
  const aligned = alignVoice('HELLO World',[{w:'hello',s:0,e:1},{w:'world',s:1,e:2}]);
  assert.equal(aligned.coverage,1); assert.equal(aligned.src.join(''),'HELLOWorld');
  assert.deepEqual(aligned.missing,[]); assert.deepEqual(aligned.extra,[]);
});

test('ASR 根据传入语言选择识别参数，英文不带中文提示', t => {
  const python = 'D:/WorkSpace/asr-venv/Scripts/python.exe';
  if (!fs.existsSync(python)) {t.skip('本机 ASR Python 环境未安装'); return;}
  // 使用假的 Whisper 模型，只读取参数；不加载模型、不读取媒体。
  const code = `import sys, types, runpy, tempfile, pathlib, json
class FakeModel:
 def __init__(self,*args,**kwargs): pass
 def transcribe(self,*args,**kwargs):
  print(json.dumps(kwargs)); return [], None
sys.modules['faster_whisper']=types.SimpleNamespace(WhisperModel=FakeModel)
with tempfile.TemporaryDirectory() as tmp:
 sys.argv=['dump_words.py','unused.mp3',str(pathlib.Path(tmp)/'words.json'),'en']
 runpy.run_path(${JSON.stringify(path.join(ROOT,'tools/asr/dump_words.py').replace(/\\/g,'/'))},run_name='__main__')
`;
  const result = spawnSync(python,['-I','-c',code],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const settings = JSON.parse(result.stdout.split(/\r?\n/)[0]);
  assert.equal(settings.language,'en'); assert.equal(settings.initial_prompt,null);
});
