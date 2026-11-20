// The news desk: big news from many outlets becomes one top story, and every source
// that needs the site's proxy is allowed by it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rankStories, listOutlets, namesIn } from "../js/topstory.js";
import { SOURCES } from "../js/scanner.js";
import { thirdPerson, retell, isFirstPerson } from "../js/retell.js";

test("a first-person headline is retold, never read as if the anchor did it", () => {
  assert.equal(thirdPerson("I tried making the local AI novel app 'Tsuzuri' usable while talking"),
    "A developer tried making the local AI novel app 'Tsuzuri' usable while talking");
  assert.equal(thirdPerson("How I built a RAG pipeline with my own data"), "How a developer built a RAG pipeline with their own data");
  assert.equal(thirdPerson("I'm building an agent that writes my emails"), "A developer is building an agent that writes their emails");
  assert.equal(thirdPerson("I've replaced my IDE with Claude Code"), "A developer has replaced their IDE with Claude Code");
  assert.equal(thirdPerson("We raised $10M to build open models for our users"), "The team raised $10M to build open models for their users");
  assert.equal(thirdPerson("What we learned shipping agents to 1M users"), "What the team learned shipping agents to 1M users");
  // Not the first person: "US" is the country and "AI" is not "I".
  for (const plain of ["OpenAI releases GPT-6.2 with a 1M context window", "US labs race China on AI chips"]) {
    assert.equal(isFirstPerson(plain), false);
    assert.equal(thirdPerson(plain), plain);
  }
  // What cannot be turned safely is quoted, with its outlet; a first-person summary is left out.
  for (const quoted of ["Ask HN: What do I need to learn for AI?", "I think AI agents are overhyped", "Let me explain MCP", "My agent setup for 2026"]) {
    assert.equal(thirdPerson(quoted), null);
  }
  assert.deepEqual(retell({ title: "Let me explain MCP", source: "Hacker News (120 points)", summary: "I am a student and my school has no AI course." }),
    { title: "A post on Hacker News is titled: Let me explain MCP", summary: "" });
  assert.deepEqual(retell({ title: "Gemini 4 Neon is out", source: "Google DeepMind", summary: "It ranks second." }),
    { title: "Gemini 4 Neon is out", summary: "It ranks second." });
});

const NOW = Date.parse("2026-11-18T23:30:00Z");
const report = (id, title, source, sourceId, hoursAgo, score = 0) => ({
  id, title, source, sourceId, score, summary: "A complete sentence about the news, long enough to read.",
  publishedAt: new Date(NOW - hoursAgo * 3600e3).toISOString(),
});

test("the same news from several outlets becomes one top story that airs first", () => {
  const { stories, groups } = rankStories([
    report("a", "Put Gemini to work for you", "Google AI blog", "google-ai", 5),
    report("b", "Google Search gets a major upgrade with Gemini 4 Hydrogen", "Google AI blog", "google-ai", 30),
    report("c", "Google ships Gemini 4 Neon, its fourth new Gemini model in a month", "The Decoder", "decoder", 2),
    report("d", "Introducing Gemini 4 Neon", "Google DeepMind", "deepmind", 2.5),
    report("e", "Gemini 4 Neon", "Hacker News, 332 points", "hn-front", 2, 332),
    report("f", "OpenAI Releases New Agents SDK For Developers", "The Verge", "verge-ai", 4),
    report("g", "Anthropic Releases New Agents Features", "Wired", "wired-ai", 4),
  ], NOW);
  const top = stories[0];
  assert.equal(top.id, "d", "The lab's own announcement is the report read on air.");
  assert.equal(top.top, true);
  assert.deepEqual(top.outlets, ["Google DeepMind", "The Decoder", "Hacker News"]);
  assert.equal(groups.get("c"), "d");
  assert.equal(groups.get("e"), "d");
  assert.equal(stories.filter((s) => s.top).length, 1, "Nothing else is a top story.");
  assert.ok(stories.some((s) => s.id === "b"), "A different Gemini model stays its own story.");
  assert.ok(stories.some((s) => s.id === "f") && stories.some((s) => s.id === "g"), "Shared generic words do not merge stories.");
  assert.equal(stories.length, 5);
  assert.equal(listOutlets(top.outlets), "Google DeepMind, The Decoder and Hacker News");
});

test("old news is never a top story", () => {
  const { stories } = rankStories([
    report("a", "Introducing Gemini 4 Neon", "Google DeepMind", "deepmind", 60),
    report("b", "Gemini 4 Neon is out", "The Decoder", "decoder", 61),
  ], NOW);
  assert.ok(stories.every((s) => !s.top));
});

test("headline names skip generic words, even in title case", () => {
  assert.deepEqual([...namesIn("Google Launches New Gemini 4 Neon Model For Developers")], ["google", "gemini", "4", "neon"]);
});

test("every source read through the proxy is allowed by feed-proxy.php", () => {
  const php = readFileSync(new URL("../feed-proxy.php", import.meta.url), "utf8");
  for (const source of SOURCES.filter((s) => !s.direct)) {
    const url = typeof source.url === "function" ? source.url() : source.url;
    const host = new URL(url).host;
    assert.ok(php.includes(`'${host}'`), `${source.id}: ${host} is not in feed-proxy.php's allowed hosts.`);
  }
  assert.ok(SOURCES.length >= 55, `The radar reads ${SOURCES.length} sources.`);
});
