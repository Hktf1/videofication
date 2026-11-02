import {articleOf, readVersion, versionOf} from './lib';
import {resolveVoice} from './perform';

/** 版本语言与配音配置的统一读取入口；无版本层的旧稿仍用中文云健。 */
export function speechSettings(dir: string) {
  const version = versionOf(dir);
  const meta = readVersion(articleOf(dir), version);
  const label = meta['语言'] || (/^(英文|English|EN)/.test(version) ? '英文' : '中文');
  const locale = meta['语言代码'] || ({中文: 'zh-CN', 英文: 'en-US', Chinese: 'zh-CN', English: 'en-US'} as Record<string, string>)[label];
  if (!locale || !/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) throw Error(`版本「${version}」请填写有效的语言代码，例如 en-US`);
  const language = locale.split('-')[0];
  const configuredVoice = meta['音色'] || ({zh: 'zh-CN-YunjianNeural', en: 'en-US-GuyNeural'} as Record<string, string>)[language];
  const voice = configuredVoice && resolveVoice(configuredVoice);
  if (!voice) throw Error(`版本「${version}」请填写完整音色 ID`);
  return {locale, language, voice};
}
