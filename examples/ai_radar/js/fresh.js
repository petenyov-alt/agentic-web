// Keeps the anchors from repeating themselves. Each pool of lines is dealt like a deck: every
// line comes up once before any comes up again. And one memory spans all the pools, so a
// catchphrase ("wild", "massive") said in a lead-in is not said again a story later in a
// sign-off, a reaction, a news flash or an AI-written script.

// Words that carry no flavour of their own: sharing them is not a repeat.
const PLAIN = new Set(`
  this that these those there here with from into about what when where which while have has
  been were will would could should just very really okay alright right well also then than
  them they their your yours ours it's that's here's what's let's i'm i've you're we're don't
  one's this's story stories news next more some much like look time thing things going
  theo's dex's theo dex thanks
`.split(/\s+/).filter(Boolean));

/** The words of a line that make it recognisable, lowercased. */
export function hooks(text) {
  const words = String(text || "").toLowerCase().match(/[a-z][a-z']+/g) || [];
  return new Set(words.map((w) => w.replace(/'s$/, "")).filter((w) => w.length >= 4 && !PLAIN.has(w)));
}

const SENTENCES = /(?:[^.!?]|\.(?=\d))+[.!?]+["')\]]*\s*/g;

export class Fresh {
  /** memory: how many recent lines are remembered. */
  constructor({ memory = 10, random = Math.random } = {}) {
    this.memory = memory;
    this.random = random;
    this.recent = [];        // [{text, words}], newest first
    this.decks = new Map();  // pool key -> indices still to deal
    this.last = new Map();   // pool key -> index dealt last
  }

  /** Remember a line as said. */
  heard(text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    this.recent.unshift({ text: clean, words: hooks(clean) });
    this.recent.length = Math.min(this.recent.length, this.memory);
  }

  /** True when the line shares a hook word with something said lately. */
  clashes(text) {
    const words = hooks(text);
    return this.recent.some((r) => [...words].some((w) => r.words.has(w)));
  }

  /** What was said lately, newest first: the AI producer is told not to reuse these. */
  lately(n = 8) {
    return this.recent.slice(0, n).map((r) => r.text);
  }

  /**
   * A line from the pool: one not dealt yet in this round of the deck and, if one is left,
   * one that repeats nothing said lately. `key` names the pool when the list is built anew
   * each time (the reactions mix a channel's lines with the general ones).
   */
  pick(list, key = list) {
    if (!list?.length) return "";
    let deck = this.decks.get(key);
    if (!deck || !deck.length || deck.some((i) => i >= list.length)) {
      deck = list.map((_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      // A new round never opens with the line that closed the last one.
      if (deck.length > 1 && deck[0] === this.last.get(key)) deck.push(deck.shift());
      this.decks.set(key, deck);
    }
    const at = deck.findIndex((i) => !this.clashes(list[i]));
    let index;
    if (at >= 0) [index] = deck.splice(at, 1);
    else {
      // Only repeats are left in this round: a line dealt earlier that repeats nothing is
      // better than a repeat. When every line repeats something, the one whose echo is oldest.
      const spare = list.findIndex((line, i) => i !== this.last.get(key) && !this.clashes(line));
      if (spare >= 0) index = spare;
      else {
        const age = (i) => { const w = hooks(list[i]); const n = this.recent.findIndex((r) => [...w].some((x) => r.words.has(x))); return n < 0 ? Infinity : n; };
        const best = deck.reduce((a, b) => (age(b) > age(a) ? b : a));
        deck.splice(deck.indexOf(best), 1);
        index = best;
      }
    }
    this.last.set(key, index);
    this.heard(list[index]);
    return list[index];
  }

  /**
   * An AI-written script, with a short opening or closing reaction dropped when it repeats
   * something said lately ("Okay, this is wild." twice in two stories). The news itself is
   * never touched, and at least two sentences stay. Its opening and closing are remembered.
   */
  freshen(script) {
    const parts = String(script || "").match(SENTENCES);
    if (!parts || parts.length < 3) {
      if (parts?.length) { this.heard(parts[0]); this.heard(parts[parts.length - 1]); }
      return script;
    }
    const short = (s) => s.trim().split(/\s+/).length <= 7;
    if (parts.length > 2 && short(parts[0]) && this.clashes(parts[0])) parts.shift();
    if (parts.length > 2 && short(parts[parts.length - 1]) && this.clashes(parts[parts.length - 1])) parts.pop();
    this.heard(parts[0]);
    this.heard(parts[parts.length - 1]);
    return parts.join("").trim();
  }
}
