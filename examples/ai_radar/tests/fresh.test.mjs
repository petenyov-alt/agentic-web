// Checks that the anchors do not repeat themselves (js/fresh.js). Run from examples/:
//   node --test "ai_radar/tests/*.test.mjs"
import assert from "node:assert/strict";
import test from "node:test";
import { Fresh, hooks } from "../js/fresh.js";

// Dex's pools as they were when "Okay, this is wild." came back two stories apart.
const LEADS = [
  "Okay, this one's pretty cool.", "Alright, check this out.", "Honestly, this is good.", "Quick one, builders.",
  "Okay, this is wild.", "Next up, and I like this one.", "Pay attention, this is a good one.", "Alright, here we go.",
  "This one's fun.", "Okay, listen to this.", "Big if true. And it's true.", "Here's what's new.",
  "Strap in.", "This one's for the builders.", "Fast one.", "Let's go. Next story.",
];
const CLOSERS = [
  "Pretty cool. Go build something.", "Honestly, just try it.", "Wild. The link is in the feed.", "Ship something with it.",
  "That's the future right there.", "Let's go.", "Just build it.", "Honestly, love it.", "Okay, that's useful.",
  "Fast. I like fast.", "Pretty cool, honestly.", "Somebody build on this tonight.", "Big step. Keep shipping.",
  "Ten out of ten.", "Try it this weekend.", "That's how you do it.",
];
const BANTER = [
  "Okay, that's wild. The link is in the feed.", "Wild times, Theo. Wild times.", "Huh. Neat.", "Love that.",
  "Cheaper and faster. My favourite combo.", "Somebody ship a demo by Friday.", "Good. More of that.",
  "That's a real upgrade.", "I'd run that today.", "Numbers don't lie. Mostly.", "Speed wins.", "Bookmarked.",
];

// A seeded random, so the test is the same every run.
function seeded(seed) {
  return () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
}

test("a catchphrase is not said again a few lines later, from any pool", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const fresh = new Fresh({ random: seeded(seed) });
    const said = [];
    for (let story = 0; story < 30; story++) {
      said.push(fresh.pick(LEADS), fresh.pick(CLOSERS), fresh.pick(BANTER, "banter:dex:models"));
    }
    // Each line's key words, compared with the 9 lines said just before it.
    for (let i = 0; i < said.length; i++) {
      if (![...hooks(said[i])].includes("wild")) continue;
      const before = said.slice(Math.max(0, i - 9), i);
      assert.ok(!before.some((l) => hooks(l).has("wild")), `seed ${seed}: "${said[i]}" right after ${JSON.stringify(before)}`);
    }
  }
});

test("every line of a pool comes up once before any comes up again", () => {
  const fresh = new Fresh({ random: seeded(7), memory: 0 });
  const first = Array.from({ length: LEADS.length }, () => fresh.pick(LEADS));
  assert.equal(new Set(first).size, LEADS.length);
  // The next round does not open with the line that closed this one.
  assert.notEqual(fresh.pick(LEADS), first.at(-1));
});

test("an AI script's repeated opening reaction is dropped, the news is kept", () => {
  const fresh = new Fresh();
  fresh.heard("Okay, this is wild.");
  const script = "Okay, this is wild. Google released Gemini 4 Neon. It ranks 2nd on the Agent Arena Index. Just build it.";
  assert.equal(fresh.freshen(script), "Google released Gemini 4 Neon. It ranks 2nd on the Agent Arena Index. Just build it.");
  // A fresh opening stays, and is remembered: the next script that opens with it loses it.
  const other = "Honestly, love this. Hugging Face shipped a new agent toolkit. Try it this weekend.";
  assert.equal(fresh.freshen(other), other);
  assert.equal(fresh.freshen("Honestly, love this. Mistral open-sourced a small model. Fast one."), "Mistral open-sourced a small model. Fast one.");
  // Short scripts are left whole.
  assert.equal(fresh.freshen("Okay, this is wild. Mistral shipped."), "Okay, this is wild. Mistral shipped.");
  // The producer is told what was said lately.
  assert.ok(fresh.lately().includes("Okay, this is wild."));
});
