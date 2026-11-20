// Checks the studio voices endpoint (tts-proxy.php) against a fake Deepgram. No real key is
// used and no request leaves this machine. Run from the repository root:
//   node --test "examples/ai_radar/tests/*.test.mjs"
// The tests start the real PHP file with PHP's built-in web server, so they need `php`.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { chunkScript, VoiceOver } from "../js/voice.js";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const HAS_PHP = spawnSync("php", ["-v"]).status === 0;
const KEY = "dg_test-site-key";
const MP3 = Buffer.alloc(400, 0xff);
const cleanups = [];
after(async () => { for (const stop of cleanups) await stop(); });

/** A stand-in for Deepgram's /v1/speak: records what it receives and answers as the test says. */
async function fakeDeepgram() {
  const seen = [];
  const state = { status: 200 };
  const server = http.createServer((req, res) => {
    let text = "";
    req.on("data", (c) => { text += c; });
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body: text ? JSON.parse(text) : null });
      if (state.status !== 200) {
        res.writeHead(state.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ err_msg: `Invalid credentials ${KEY}` }));
        return;
      }
      res.writeHead(200, { "Content-Type": "audio/mpeg" });
      res.end(MP3);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  cleanups.push(() => new Promise((r) => server.close(r)));
  return { seen, state, url: `http://127.0.0.1:${server.address().port}/v1/speak` };
}

async function freePort() {
  const probe = net.createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const { port } = probe.address();
  await new Promise((r) => probe.close(r));
  return port;
}

async function site(env) {
  const port = await freePort();
  const state = await mkdtemp(`${tmpdir()}/ai-radar-tts-test-`);
  const child = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", SITE], {
    stdio: "ignore",
    env: { ...process.env, AI_RADAR_SECRET_FILE: "/nonexistent/ai-radar-secret.php", AI_RADAR_STATE_DIR: state, ...env },
  });
  cleanups.push(() => { child.kill(); });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try { await send(base, "/tts-proxy.php?status", null, { method: "GET", origin: "" }); return base; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("PHP did not start.");
}

function send(base, path, body, { method = "POST", origin = base } = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const h = origin ? { Origin: origin } : {};
    if (method === "POST") { h["Content-Type"] = "application/json"; h["Content-Length"] = Buffer.byteLength(data); }
    const req = http.request(new URL(path, base), { method, headers: h }, (res) => {
      const parts = [];
      res.on("data", (c) => parts.push(c));
      res.on("end", () => { const buf = Buffer.concat(parts); resolve({ status: res.statusCode, headers: res.headers, buf, text: buf.toString("utf8") }); });
    });
    req.on("error", reject);
    if (method === "POST") req.write(data);
    req.end();
  });
}

const PATH = "/tts-proxy.php";
const status = async (base) => JSON.parse((await send(base, `${PATH}?status`, null, { method: "GET", origin: "" })).text);

test("the studio voices speak with the site's key, each anchor in its own voice, and cache every sentence", { skip: !HAS_PHP && "php is not installed" }, async () => {
  const dg = await fakeDeepgram();
  const base = await site({ AI_RADAR_DEEPGRAM_KEY: KEY, AI_RADAR_TTS_UPSTREAM: dg.url });
  assert.equal((await status(base)).available, true);

  const theo = await send(base, PATH, { text: "  Gemini 4 Neon is out.  ", anchor: "Theo" });
  assert.equal(theo.status, 200);
  assert.equal(theo.headers["content-type"], "audio/mpeg");
  assert.equal(theo.headers["x-voice-source"], "deepgram");
  assert.deepEqual(theo.buf, MP3);
  assert.equal(dg.seen[0].headers.authorization, `Token ${KEY}`);
  assert.match(dg.seen[0].url, /model=aura-2-odysseus-en/);
  assert.deepEqual(dg.seen[0].body, { text: "Gemini 4 Neon is out." });

  const dex = await send(base, PATH, { text: "Gemini 4 Neon is out.", anchor: "dex" });
  assert.match(dg.seen[1].url, /model=aura-2-apollo-en/);
  assert.equal(dex.headers["x-voice-source"], "deepgram");

  // The same sentence in the same voice comes from the cache: Deepgram is not asked again.
  const again = await send(base, PATH, { text: "Gemini 4 Neon is out.", anchor: "theo" });
  assert.equal(again.headers["x-voice-source"], "cache");
  assert.deepEqual(again.buf, MP3);
  assert.equal(dg.seen.length, 2);
});

test("the studio voices refuse other sites, other voices and long or empty text", { skip: !HAS_PHP && "php is not installed" }, async () => {
  const dg = await fakeDeepgram();
  const base = await site({ AI_RADAR_DEEPGRAM_KEY: KEY, AI_RADAR_TTS_UPSTREAM: dg.url });
  const code = async (body, opts) => { const r = await send(base, PATH, body, opts); return [r.status, JSON.parse(r.text).error.code]; };
  assert.deepEqual(await code({ text: "Hi there.", anchor: "theo" }, { origin: "https://evil.example" }), [403, "forbidden_origin"]);
  assert.deepEqual(await code({ text: "Hi there.", anchor: "theo" }, { origin: "" }), [403, "forbidden_origin"]);
  assert.deepEqual(await code({ text: "Hi there.", anchor: "aura-2-zeus-en" }), [400, "unknown_anchor"]);
  assert.deepEqual(await code({ text: "  ...  ", anchor: "theo" }), [400, "empty_text"]);
  assert.deepEqual(await code({ text: "word ".repeat(300), anchor: "theo" }), [413, "too_long"]);
  assert.equal((await send(base, PATH, null, { method: "GET" })).status, 405);
  assert.equal(dg.seen.length, 0);
});

test("the studio voices count characters per person and for the site, and never show the key", { skip: !HAS_PHP && "php is not installed" }, async () => {
  const dg = await fakeDeepgram();
  const base = await site({ AI_RADAR_DEEPGRAM_KEY: KEY, AI_RADAR_TTS_UPSTREAM: dg.url, AI_RADAR_TTS_PER_IP_HOUR: "60", AI_RADAR_TTS_GLOBAL_DAY: "1000" });
  assert.equal((await send(base, PATH, { text: "This sentence has forty characters in it.", anchor: "theo" })).status, 200);
  const over = await send(base, PATH, { text: "And this one goes over the hourly limit.", anchor: "theo" });
  assert.equal(over.status, 429);
  assert.equal(JSON.parse(over.text).error.code, "rate_limited");
  assert.ok(Number(over.headers["retry-after"]) > 0);
  // A cached sentence is free.
  assert.equal((await send(base, PATH, { text: "This sentence has forty characters in it.", anchor: "theo" })).headers["x-voice-source"], "cache");

  dg.state.status = 401;
  const rejected = await send(base, PATH, { text: "New.", anchor: "dex" });
  assert.equal(rejected.status, 503);
  assert.equal(JSON.parse(rejected.text).error.code, "site_key_rejected");
  assert.ok(!rejected.text.includes(KEY) && !rejected.text.includes("credentials"));
  assert.ok(!(await send(base, `${PATH}?status`, null, { method: "GET", origin: "" })).text.includes(KEY));

  const off = await site({ AI_RADAR_DEEPGRAM_KEY: KEY, AI_RADAR_TTS_UPSTREAM: dg.url, AI_RADAR_TTS_DISABLED: "1" });
  assert.equal((await status(off)).available, false);
  assert.equal(JSON.parse((await send(off, PATH, { text: "Hi.", anchor: "theo" })).text).error.code, "voices_off");
  const nokey = await site({ AI_RADAR_TTS_UPSTREAM: dg.url });
  assert.equal((await status(nokey)).available, false);
});

test("the voice falls back to the browser when the studio voices are not there", async () => {
  // Node has no Audio element: connectCloud declines, and speech goes on as before.
  const voice = new VoiceOver();
  assert.equal(await voice.connectCloud("tts-proxy.php"), false);
  assert.equal(voice.cloudReady, false);
  // A version number stays in one sentence, so it is spoken as "three point six".
  assert.deepEqual(chunkScript("Gemini 3.6 Flash is out. Next.").map((c) => c.text.trim()), ["Gemini 3.6 Flash is out.", "Next."]);
});
