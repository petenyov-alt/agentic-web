// Checks how the anchors' voices are given the text (js/say.js, js/voice.js). Run from examples/:
//   node --test "ai_radar/tests/*.test.mjs"
import assert from "node:assert/strict";
import test from "node:test";
import { forSpeech, speechText } from "../js/say.js";
import { VoiceOver } from "../js/voice.js";

test("a model name with dashes is said in words, not spelled out letter by letter", () => {
  assert.equal(forSpeech("GPT-OSS-20B is out."), "GPT OSS 20 B is out.");
  assert.equal(forSpeech("Try gpt-oss-20b, it's free."), "Try GPT OSS 20 B, it's free.");
  assert.equal(forSpeech("openai/gpt-oss-20b"), "OpenAI GPT OSS 20 B");
  assert.equal(forSpeech("Qwen3-235B-A22B-Instruct-2507"), "Qwen 3 235 B A 22 B Instruct 2507");
  assert.equal(forSpeech("Llama-3.1-8B and GPT-4o."), "Llama 3.1 8 B and GPT 4 O.");
  assert.equal(forSpeech("(DeepSeek-R1)"), "(DeepSeek R 1)");
  assert.equal(forSpeech("GPT-OSS-20B's speed"), "GPT OSS 20 B's speed");
  assert.equal(forSpeech("gemma-3-27b-it"), "gemma 3 27 B IT");
  assert.equal(forSpeech("stable-diffusion-xl-base-1.0"), "stable diffusion XL base 1.0");
  assert.equal(forSpeech("AI-generated video"), "AI generated video");
});

test("a Hugging Face title, already spaced, is said the same way", () => {
  assert.equal(forSpeech("gpt oss 20b is trending on Hugging Face."), "GPT OSS 20 B is trending on Hugging Face.");
  assert.equal(forSpeech("Qwen3 Coder 30B A3B Instruct is trending"), "Qwen 3 Coder 30 B A 3 B Instruct is trending");
  assert.equal(forSpeech("A 70B model on one H100."), "A 70 B model on one H 100.");
});

test("ordinary words, names, dates, money and units are left as they are", () => {
  for (const text of [
    "Theo Sweep and Dex Ping, in the radar room.",
    "A state-of-the-art, open-source model with real-time voice.",
    "Released 2026-11-19, it runs 24/7.",
    "It raised $40B in 2025, up 20-30%.",
    "First on the 1st, back in the 1990s, live at 5pm.",
    "It needs 16GB, streams in 4K and is 10x faster.",
    "Spell it J-O-H-N, then T-Mobile and Wi-Fi.",
    "GPT and NASA and the U.S. are fine as written.",
    "LLMs and APIs, as written; see 13F.ai and Node.js.",
  ]) assert.equal(forSpeech(text), text);
});

test("each spoken word points back to the written word, for the captions", () => {
  const { text, source } = speechText("Meet GPT-OSS-20B today.");
  assert.equal(text, "Meet GPT OSS 20 B today.");
  assert.equal(source(0), 0);
  // Every part of the name points at the name as written.
  for (const part of ["GPT", "OSS", "20", "B"]) assert.equal(source(text.indexOf(` ${part} `) + 1), "Meet ".length, part);
  assert.equal(source(text.indexOf("today")), "Meet GPT-OSS-20B ".length);
  const same = speechText("Nothing to change here.");
  assert.equal(same.source(8), 8);
});

test("the studio voices get the spoken words, both on air and when warming up", async () => {
  const posted = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    posted.push(JSON.parse(init.body).text);
    return new Response(new Uint8Array(200), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
  };
  try {
    const voice = new VoiceOver();
    voice.cloud = { url: "tts-proxy.php", failures: 0, offUntil: 0 };
    await voice._clip("Meet GPT-OSS-20B today.", "dex");
    await voice.warm([{ anchor: "theo", text: "Meet GPT-OSS-20B today." }]);
    assert.deepEqual(posted, ["Meet GPT OSS 20 B today.", "Meet GPT OSS 20 B today."], "The same words on air and in the server's cache.");
  } finally {
    globalThis.fetch = realFetch;
  }
});
