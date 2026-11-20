// The script writer, on the page's side: it sends the next stories to writer.php, where an AI
// writes what Elon and Sam say about each one, in their own voices, once for the whole site.
// The page sends only the feed's own data and takes back what the server wrote; it cannot put
// words on air. Without the writer (a static host, no key, a model that does not answer) the
// anchors read the editor's line with their own lead-ins and closers, as before.

const FIELDS = ["id", "title", "summary", "source", "topic"];
const MIN_GAP_MS = 20 * 1000;   // between two requests with new stories
export const WRITER_BATCH = 6;  // the server writes up to 6 stories in one model call

export class ScriptWriter {
  constructor(url = "writer.php") {
    this.url = url;
    this.available = false;
    this.answered = new Set();   // ids written or skipped: never asked again in this visit
    this._busy = false;
    this._lastAt = 0;
  }

  /** Ask the server whether it has a writer (GET writer.php?status). */
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

  /** The stories still to ask about, each once, in the order given. */
  unwritten(stories) {
    const seen = new Set();
    return stories.filter((s) => s?.id && s.title && !this.answered.has(s.id) && !seen.has(s.id) && seen.add(s.id));
  }

  /**
   * Send up to WRITER_BATCH stories, each with who reads it ("Sam" or "Elon"), and resolve with
   * the scripts written: [{storyId, script}]. Stories the writer skipped are not asked again.
   */
  async write(stories, readerOf) {
    if (!this.available || this._busy || Date.now() - this._lastAt < MIN_GAP_MS) return [];
    const fresh = this.unwritten(stories).slice(0, WRITER_BATCH);
    if (!fresh.length) return [];
    this._busy = true;
    this._lastAt = Date.now();
    const written = [];
    try {
      const body = fresh.map((s) => ({
        ...Object.fromEntries(FIELDS.map((f) => [f, String(s[f] ?? "")])),
        reader: readerOf(s),
        year: s.year ? String(s.year) : (s.publishedAt ? String(s.publishedAt).slice(0, 4) : ""),
      }));
      const answer = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: body }),
      });
      const data = answer.ok ? await answer.json() : null;
      for (const [id, item] of Object.entries(data?.scripts || {})) {
        if (!item || typeof item !== "object") continue;
        this.answered.add(id);
        if (typeof item.script === "string" && item.script.trim()) written.push({ storyId: id, script: item.script });
      }
      if (answer.status === 503) this.available = false;
    } catch { /* the broadcast goes on without it */ }
    this._busy = false;
    return written;
  }
}
