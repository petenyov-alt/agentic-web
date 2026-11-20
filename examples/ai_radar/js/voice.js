// Voice-over controller around the Web Speech API (window.speechSynthesis).
//
// Speaks a script sentence by sentence (Chrome cuts long utterances short) and reports
// word boundaries with their character offset in the full script. When muted, or when
// the browser has no speech synthesis, it does a timed "silent read" instead, so the
// anchor keeps talking and the teleprompter keeps rolling. Muting or unmuting takes
// effect at once and the broadcast carries on from the next sentence. Technical names are
// said in words (js/say.js: "GPT-OSS-20B" as "GPT OSS 20 B", not spelled letter by letter),
// while the captions keep the text as written.

import { forSpeech, speechText } from "./say.js";

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

/** Split a script into sentence chunks, keeping each chunk's offset in the script. */
export function chunkScript(text) {
  const chunks = [];
  // The point in "3.6" or "v1.5" is not the end of a sentence.
  const re = /(?:[^.!?…]|\.(?=\d))+[.!?…]*["')\]]*\s*/g;
  let match;
  while ((match = re.exec(text))) {
    if (!match[0].trim()) continue;
    chunks.push({ text: match[0], offset: match.index });
  }
  return chunks.length ? chunks : [{ text, offset: 0 }];
}

// Voices that are sound effects or characters, not newsreaders.
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|buenas|cellos|eddy|flo|grandma|grandpa|jester|junior|organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox|good news|hysterical|deranged|pipe organ|kathy)\b/i;

// Best first. Each entry is tried in order against the browser's English voices.
const FEMALE_RANKS = [
  /\b(aria|jenny|sonia|libby|emma|ava|michelle|ana|natasha|clara|neerja)\b.*(natural|neural|online)/i,
  /(natural|neural).*\b(aria|jenny|sonia|libby|emma|ava|michelle)\b/i,
  /\b(ava|zoe|samantha|allison|susan|serena|kate|karen|moira|tessa|fiona|veena|isha)\b.*\((premium|enhanced)\)/i,
  /google us english/i,
  /google uk english female/i,
  /\b(samantha|ava|allison|zoe|serena|susan)\b/i,
  /\b(microsoft (zira|hazel|susan|catherine|heera))\b/i,
  /\b(moira|karen|tessa|fiona|victoria|veena)\b/i,
];
const MALE_RANKS = [
  /\b(guy|ryan|andrew|brian|christopher|eric|davis|thomas|william|prabhat)\b.*(natural|neural|online)/i,
  /(natural|neural).*\b(guy|ryan|andrew|brian|christopher|eric)\b/i,
  /\b(evan|nathan|tom|alex|daniel|oliver|arthur|aaron|rishi|lee)\b.*\((premium|enhanced)\)/i,
  /google uk english male/i,
  /\b(daniel|alex|tom|oliver|arthur|aaron|evan|nathan)\b/i,
  /\b(microsoft (david|mark|george|james|ravi))\b/i,
  /\b(rishi|lee|fred)\b/i,
];

// A moment of silence, for unlocking the audio element inside a click.
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

function wordLengthAt(text, index) {
  const match = /\S+/.exec(text.slice(index));
  return match ? match[0].length : 1;
}

export class VoiceOver extends EventTarget {
  constructor() {
    super();
    this.supported = Boolean(synth && typeof SpeechSynthesisUtterance !== "undefined");
    this.voices = [];
    this.voiceURI = "";
    this.rate = 1;
    this.pitch = 1.05;
    this.volume = 1;
    this.muted = false;
    this.speaking = false;
    this._token = 0;
    this._timers = [];
    this._endChunk = null;    // ends the current chunk early (used when muting/unmuting)
    // Studio voices (tts-proxy.php, Deepgram): null until connectCloud finds them available.
    this.cloud = null;        // {url, failures, offUntil}
    this._audio = null;       // one <audio> element, unlocked by the first click
    this._clips = new Map();  // "anchor\ntext" -> Promise<object URL>, the last few sentences
    if (this.supported) {
      this._loadVoices();
      synth.addEventListener?.("voiceschanged", () => this._loadVoices());
    }
  }

  _loadVoices() {
    const all = synth.getVoices();
    this.voices = [...all].sort((a, b) => {
      const ae = a.lang.startsWith("en") ? 0 : 1;
      const be = b.lang.startsWith("en") ? 0 : 1;
      return ae - be || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });
    if (!this.voiceURI || !this.voices.some((v) => v.voiceURI === this.voiceURI)) {
      const preferred = this.voices.find((v) => /en[-_](US|GB)/i.test(v.lang) && /natural|neural|google|samantha|daniel|aria|jenny/i.test(v.name))
        || this.voices.find((v) => v.lang.startsWith("en") && v.default)
        || this.voices.find((v) => v.lang.startsWith("en"))
        || this.voices[0];
      this.voiceURI = preferred ? preferred.voiceURI : "";
    }
    this.dispatchEvent(new Event("voices"));
  }

  /**
   * The best English voice for a male or female anchor. Voices are ranked by quality:
   * neural "Natural" voices (Edge), Premium/Enhanced voices (macOS downloads), Google's
   * voices (Chrome), then the best built-in system voices. Novelty voices never qualify.
   * Returns "" when the browser offers no suitable voice.
   */
  pick(gender) {
    const english = this.voices.filter((v) => v.lang.toLowerCase().startsWith("en") && !NOVELTY.test(v.name));
    const ranks = gender === "female" ? FEMALE_RANKS : MALE_RANKS;
    for (const rank of ranks) {
      const match = english.find((v) => rank.test(v.name));
      if (match) return match.voiceURI;
    }
    // No named match: any English voice, so the anchor never falls back to the
    // system language (a Spanish or Hebrew system voice reading English text).
    const any = english.find((v) => v.lang.toLowerCase().startsWith("en-us")) || english[0];
    return any ? any.voiceURI : "";
  }

  voiceList() {
    return this.voices.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));
  }

  setOptions({ voiceURI, rate, pitch, volume } = {}) {
    if (voiceURI !== undefined) this.voiceURI = voiceURI;
    if (rate !== undefined) this.rate = Math.min(2, Math.max(0.5, Number(rate)));
    if (pitch !== undefined) this.pitch = Math.min(2, Math.max(0, Number(pitch)));
    if (volume !== undefined) this.volume = Math.min(1, Math.max(0, Number(volume)));
    if (this._audio) {
      this._audio.volume = this.volume;
      this._audio.playbackRate = this.rate;
    }
  }

  /** Mute or unmute. The current sentence ends now; the next one uses the new mode. */
  setMuted(muted) {
    muted = Boolean(muted);
    if (muted === this.muted) return;
    this.muted = muted;
    if (!this.speaking) return;
    this._clearTimers();
    if (this.supported) synth.cancel();
    this._endChunk?.();
  }

  /**
   * Use the site's studio voices when its server offers them (GET url?status). Without them
   * (a static host, no key, the day's allowance used up) the browser's voices read as before.
   */
  async connectCloud(url) {
    if (typeof Audio === "undefined" || typeof fetch === "undefined") return false;
    try {
      const answer = await fetch(`${url}?status`, { cache: "no-store" });
      const info = answer.ok ? await answer.json() : null;
      if (!info?.available) return false;
      this.cloud = { url, failures: 0, offUntil: 0 };
      this._audio = this._audio || new Audio();
      this._audio.preload = "auto";
      this.dispatchEvent(new Event("cloud"));
      return true;
    } catch {
      return false;
    }
  }

  /** True while the studio voices answer (after 3 failures in a row, they rest for 5 minutes). */
  get cloudReady() {
    return Boolean(this.cloud && Date.now() >= this.cloud.offUntil);
  }

  /** Must run inside a user gesture once, so later speech is allowed. */
  unlock() {
    // The audio element too: Safari lets an element play later only if a click started it once.
    if (this._audio && !this._audio.src) {
      try {
        this._audio.src = SILENT_WAV;
        this._audio.play()?.catch?.(() => {});
      } catch { /* ignore */ }
    }
    if (!this.supported) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    } catch { /* ignore */ }
  }

  _clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  }

  stop() {
    this._token++;
    this._clearTimers();
    if (this.supported) synth.cancel();
    this._endChunk?.();
    if (this.speaking) {
      this.speaking = false;
      this.dispatchEvent(new CustomEvent("end", { detail: { reason: "stopped" } }));
    }
  }

  /**
   * Read `text` aloud (or silently when muted). Resolves with "ended", "stopped" or
   * "error". Events: "start", "chunk", "word" ({charIndex, charLength}), "end".
   */
  async speak(text, { voiceURI, pitch, anchor } = {}) {
    this.stop();
    this._override = { voiceURI, pitch };
    const token = ++this._token;
    this.speaking = true;
    this.dispatchEvent(new CustomEvent("start", { detail: { text } }));
    let reason = "ended";
    try {
      const chunks = chunkScript(text);
      for (const [i, chunk] of chunks.entries()) {
        if (token !== this._token) break;
        this.dispatchEvent(new CustomEvent("chunk", { detail: chunk }));
        const studio = anchor && this.cloudReady && !this.muted;
        if (studio && i === 0) this.prefetch(text, anchor);   // every sentence, in order, while the first plays
        if (this.muted || (!this.supported && !studio)) await this._silentChunk(chunk, token);
        else if (studio && await this._cloudChunk(chunk, token, anchor)) { /* played */ }
        else if (token === this._token && !this.muted && this.supported) await this._speakChunk(chunk, token);
        else if (token === this._token) await this._silentChunk(chunk, token);
      }
    } catch {
      reason = "error";
    }
    if (token !== this._token) return "stopped";
    this.speaking = false;
    this._token++;
    this.dispatchEvent(new CustomEvent("end", { detail: { reason } }));
    return reason;
  }

  _speakChunk(chunk, token) {
    return new Promise((resolve, reject) => {
      // Voices load late in some browsers (Safari): read the list again if it is empty.
      if (!this.voices.length) this._loadVoices();
      const uri = this._override?.voiceURI || this.voiceURI;
      const voice = this.voices.find((v) => v.voiceURI === uri);
      const said = speechText(chunk.text);
      const u = new SpeechSynthesisUtterance(said.text);
      // Always English: without a voice, the browser would use the system language.
      u.lang = voice && voice.lang.toLowerCase().startsWith("en") ? voice.lang : "en-US";
      if (voice) u.voice = voice;
      u.rate = this.rate;
      u.pitch = this._override?.pitch ?? this.pitch;
      u.volume = this.volume;
      let gotBoundary = false;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(estimate);
        this._endChunk = null;
        if (error) reject(error); else resolve();
      };
      this._endChunk = () => finish();
      // Some voices (many cloud voices) never fire onboundary: estimate word timing.
      const estimate = setTimeout(() => {
        if (!gotBoundary && token === this._token) this._estimateWords(chunk, token);
      }, 350);
      u.onboundary = (event) => {
        if (event.name && event.name !== "word") return;
        gotBoundary = true;
        // The voice reads the spoken words; the captions follow the same word as written.
        const at = said.source(event.charIndex);
        this.dispatchEvent(new CustomEvent("word", {
          detail: { charIndex: chunk.offset + at, charLength: wordLengthAt(chunk.text, at) },
        }));
      };
      u.onend = () => finish();
      u.onerror = (event) => {
        if (event.error === "interrupted" || event.error === "canceled") finish();
        else finish(new Error(event.error));
      };
      synth.speak(u);
    });
  }

  /**
   * Fetch a script's studio audio ahead of time, a sentence after another, so it starts at
   * once when its turn comes. Does nothing without the studio voices. Resolves when done.
   */
  async prefetch(text, anchor) {
    // Muted, the anchors read silently: no studio audio is made for nobody to hear.
    if (!anchor || this.muted || !this.cloudReady || !String(text || "").trim()) return;
    for (const chunk of chunkScript(String(text))) {
      if (!this.cloudReady) return;
      try { await this._clip(chunk.text, anchor); } catch { /* the broadcast falls back by itself */ }
    }
  }

  /**
   * Have the server make the studio audio for many lines without keeping it here: the server
   * caches each sentence, so later these lines start at once for every visitor.
   * lines: [{anchor, text}]. Resolves with {made, failed}.
   */
  async warm(lines, { parallel = 4 } = {}) {
    if (!this.cloud) return { made: 0, failed: 0 };
    const jobs = [];
    // The same words as on air (see _clip), so the server's cache has them.
    for (const { anchor, text } of lines) for (const chunk of chunkScript(text)) if (chunk.text.trim()) jobs.push({ anchor, text: forSpeech(chunk.text.trim()) });
    let made = 0, failed = 0, next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        try {
          const answer = await fetch(this.cloud.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(job) });
          if (answer.ok) { await answer.arrayBuffer(); made++; } else failed++;
        } catch { failed++; }
      }
    };
    await Promise.all(Array.from({ length: parallel }, worker));
    return { made, failed };
  }

  /** The studio audio for one sentence, as an object URL. Each sentence is fetched once. */
  _clip(text, anchor) {
    const key = `${anchor}\n${text.trim()}`;
    if (this._clips.has(key)) return this._clips.get(key);
    const promise = fetch(this.cloud.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: forSpeech(text.trim()), anchor }),
    }).then(async (answer) => {
      if (!answer.ok) throw new Error(`studio voice ${answer.status}`);
      return URL.createObjectURL(await answer.blob());
    });
    promise.catch(() => this._clips.delete(key));
    this._clips.set(key, promise);
    // Keep the last 120 sentences (a few minutes of broadcast); let the browser free the older ones.
    while (this._clips.size > 120) {
      const [oldest, old] = this._clips.entries().next().value;
      this._clips.delete(oldest);
      old.then((u) => URL.revokeObjectURL(u), () => {});
    }
    return promise;
  }

  /**
   * Play one sentence in the anchor's studio voice. Resolves true when it played (or was
   * stopped), false when the studio voice failed and the browser voice should read it.
   */
  async _cloudChunk(chunk, token, anchor) {
    let src;
    try {
      src = await this._clip(chunk.text, anchor);
    } catch {
      this._cloudFailed();
      return false;
    }
    if (token !== this._token) return true;
    if (this.muted) return false;
    const audio = this._audio;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (played) => {
        if (settled) return;
        settled = true;
        audio.onended = audio.onerror = audio.onloadedmetadata = null;
        this._endChunk = null;
        resolve(played);
      };
      this._endChunk = () => { audio.pause(); finish(true); };
      audio.onloadedmetadata = () => {
        if (token !== this._token) return;
        const ms = Number.isFinite(audio.duration) ? (audio.duration * 1000) / audio.playbackRate : 0;
        this._estimateWords(chunk, token, ms);
      };
      audio.onended = () => { this.cloud.failures = 0; finish(true); };
      audio.onerror = () => { this._cloudFailed(); finish(false); };
      audio.src = src;
      audio.volume = this.volume;
      audio.playbackRate = this.rate;
      const playing = audio.play();
      playing?.catch?.(() => { this._cloudFailed(); finish(false); });
    });
  }

  _cloudFailed() {
    if (!this.cloud) return;
    this.cloud.failures += 1;
    if (this.cloud.failures >= 3) {
      this.cloud.offUntil = Date.now() + 5 * 60 * 1000;
      this.cloud.failures = 0;
    }
  }

  _silentChunk(chunk, token) {
    return new Promise((resolve) => {
      const duration = this._estimateWords(chunk, token);
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this._endChunk = null;
        resolve();
      };
      this._endChunk = finish;
      this._timers.push(setTimeout(finish, duration + 250));
    });
  }

  /**
   * Emit timed word events for a chunk. Returns the chunk's estimated duration in ms.
   * With `totalMs` (the length of the real audio) the same timing is stretched to fit it.
   */
  _estimateWords(chunk, token, totalMs = 0) {
    const msPerChar = 62 / this.rate;
    const words = [...chunk.text.matchAll(/\S+/g)];
    const steps = words.map((w) => Math.max(140, (w[0].length + 1) * msPerChar));
    const natural = steps.reduce((a, b) => a + b, 0);
    const scale = totalMs > 0 && natural > 0 ? totalMs / natural : 1;
    let t = 0;
    words.forEach((w, i) => {
      const { index } = w;
      const length = w[0].length;
      this._timers.push(setTimeout(() => {
        if (token !== this._token) return;
        this.dispatchEvent(new CustomEvent("word", { detail: { charIndex: chunk.offset + index, charLength: length } }));
      }, t));
      t += steps[i] * scale;
    });
    return t;
  }
}
