// The news editor, on the page's side: it sends the stories about to air to editor.php,
// where an AI decides whether each one goes on air and how the anchor says it, and keeps the
// verdicts. Without the editor (a static host, no key, a model that does not answer) nothing
// changes: every story stays and the anchors use their own rules (js/retell.js).

const FIELDS = ["id", "title", "summary", "source", "topic"];
const MIN_GAP_MS = 15 * 1000;   // between two requests with new stories
// The server judges up to 25 stories in one model call, and the free models allow about 45
// calls a day for the whole site: so a request waits until there are enough new stories to
// fill a call, unless one of them is about to go on air.
export const BATCH = 25;
export const MIN_BATCH = 10;

export class NewsEditor {
  constructor(url = "editor.php") {
    this.url = url;
    this.available = false;
    this.verdicts = new Map();   // story id -> {keep, spoken, why, by}
    this._asked = new Set();     // ids sent and not answered yet
    this._busy = false;
    this._lastAt = 0;
  }

  /** Ask the server whether it has an editor (GET editor.php?status). */
  async connect() {
    if (typeof fetch === "undefined" || typeof location === "undefined") return false;
    try {
      const answer = await fetch(`${this.url}?status`, { cache: "no-store" });
      const info = answer.ok ? await answer.json() : null;
      this.available = Boolean(info?.available);
    } catch {
      this.available = false;
    }
    return this.available;
  }

  /** True when the editor took the story off the air. */
  isDropped(story) {
    return this.verdicts.get(story?.id)?.keep === false;
  }

  /**
   * The channel the editor filed a kept story under, by what it is about ("all" for AI news
   * that fits no channel), or null when the editor did not choose one.
   */
  channelOf(story) {
    const verdict = this.verdicts.get(story?.id);
    if (!verdict?.keep || typeof verdict.channel !== "string") return null;
    return verdict.channel === "none" ? "all" : verdict.channel;
  }

  /** How the editor wants the story said, or null (then the anchors' own rules apply). */
  spokenOf(story) {
    const verdict = this.verdicts.get(story?.id);
    return verdict?.keep && verdict.spoken ? verdict.spoken : null;
  }

  /** The stories that still need a verdict, each once, in the order given. */
  unjudged(stories) {
    const seen = new Set();
    return stories.filter((s) => s?.id && s.title && !this.verdicts.has(s.id) && !this._asked.has(s.id) && !seen.has(s.id) && seen.add(s.id));
  }

  /**
   * Send the stories without a verdict, most urgent first, and keep the answers: a full call
   * of up to BATCH stories, and only once there are MIN_BATCH of them, unless `urgent`.
   * Resolves with how many verdicts came back (0 when there was nothing to do).
   */
  async review(stories, { urgent = false } = {}) {
    if (!this.available || this._busy || Date.now() - this._lastAt < MIN_GAP_MS) return 0;
    const fresh = this.unjudged(stories).slice(0, BATCH);
    if (!fresh.length || (fresh.length < MIN_BATCH && !urgent)) return 0;
    this._busy = true;
    this._lastAt = Date.now();
    fresh.forEach((s) => this._asked.add(s.id));
    let count = 0;
    try {
      const answer = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A story keeps the channel its source gave it here, so its verdict is found again
        // after the editor has moved it to another channel.
        body: JSON.stringify({ stories: fresh.map((s) => Object.fromEntries(FIELDS.map((f) => [f, String((f === "topic" ? s.sourceTopic ?? s.topic : s[f]) ?? "")]))) }),
      });
      const data = answer.ok ? await answer.json() : null;
      for (const [id, verdict] of Object.entries(data?.verdicts || {})) {
        if (verdict && typeof verdict.keep === "boolean") { this.verdicts.set(id, verdict); count++; }
      }
      if (answer.status === 503) this.available = false;
    } catch { /* the broadcast goes on without it */ }
    // Whatever was not answered may be asked again later.
    fresh.forEach((s) => this._asked.delete(s.id));
    this._busy = false;
    return count;
  }
}
