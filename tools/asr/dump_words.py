import os
import sys
import glob
import json

# 让 ctranslate2 找到 pip 安装的 CUDA DLL
for d in glob.glob(os.path.join(sys.prefix, "Lib", "site-packages", "nvidia", "*", "bin")):
    os.add_dll_directory(d)
    os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]

from faster_whisper import WhisperModel

# 用法：python dump_words.py 音频 输出.json
# 与外部 asr/dump_words.py 的区别：关掉 VAD、关掉跨段上下文。
# 配音是干净的合成语音，段间停顿 0.3～1s 很密；VAD 在这些停顿处切段，
# whisper 会在每段边界重复上一句的尾巴（表现为多个词时间戳完全相同），
# 对稿时被当成「配音里多出内容」而卡住导出。
src, dst = sys.argv[1], sys.argv[2]
language = sys.argv[3] if len(sys.argv) > 3 else "zh"
try:
    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
except Exception as e:
    print("GPU 不可用，改用 CPU:", e)
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")

segments, _ = model.transcribe(
    src, language=language, beam_size=5, vad_filter=False, word_timestamps=True,
    initial_prompt="以下是普通话的句子，使用简体中文，带标点。" if language == "zh" else None,
    condition_on_previous_text=False,
)
words = [{"w": w.word, "s": w.start, "e": w.end} for seg in segments for w in seg.words]
# whisper 在音频尾部常幻觉出「中文字幕志愿者…」这类短语，这些词没有真实时长
# （多个词时间戳完全相同）。从尾部去掉零时长的词，避免对稿判成「多出内容」。
# 差值要取整比较：55.94-55.92 在浮点里是 0.020000000000000018，直接比会漏掉。
while words and round(words[-1]["e"] - words[-1]["s"], 3) <= 0.02:
    words.pop()
json.dump(words, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
print("done", len(words), "words")
