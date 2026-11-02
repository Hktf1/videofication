"""Generate the isolated English preview with Edge TTS word boundary metadata."""
import asyncio
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "engine/public/english15"
VOICE = "en-US-GuyNeural"

async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scenes = json.loads((Path(__file__).parent / "narration.json").read_text(encoding="utf-8"))
    for scene in scenes:
        audio = OUTPUT / (str(scene["id"]) + ".mp3")
        metadata = OUTPUT / (str(scene["id"]) + ".words.json")
        settings = {"text": scene["text"], "voice": VOICE, "rate": "+0%", "pitch": "+0Hz"}
        cache = OUTPUT / (str(scene["id"]) + ".settings.json")
        if audio.exists() and metadata.exists() and cache.exists() and json.loads(cache.read_text(encoding="utf-8")) == settings:
            print("Cached scene", scene["id"], flush=True)
            continue
        for attempt in range(3):
            try:
                words = []
                communicate = edge_tts.Communicate(boundary="WordBoundary", **settings)
                with audio.open("wb") as stream:
                    async for chunk in communicate.stream():
                        if chunk["type"] == "audio":
                            stream.write(chunk["data"])
                        elif chunk["type"] == "WordBoundary":
                            words.append({"w": chunk["text"], "s": chunk["offset"] / 10000000, "e": (chunk["offset"] + chunk["duration"]) / 10000000})
                if not words or not audio.stat().st_size:
                    raise RuntimeError("Missing audio or word boundaries")
                metadata.write_text(json.dumps(words, indent=2), encoding="utf-8")
                cache.write_text(json.dumps(settings, indent=2), encoding="utf-8")
                print("Generated scene", scene["id"], "words", len(words), flush=True)
                break
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2)

asyncio.run(main())
