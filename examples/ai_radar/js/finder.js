// finder.js — finds real prompts, agent skills, AI tools and papers on the web.
//
// Nothing here is written by AI Radar: every result comes from a public directory and
// links back to it. Sources that send CORS headers are read straight from the browser;
// prompts.chat, skills.sh, skillsmp.com and arXiv go through feed-proxy.php (or the public
// proxies). Each search asks its sources in parallel, keeps whatever answered, drops
// unsafe items, ranks by how well the words match and how popular the item is, and
// never throws: a source that fails is listed with ok false.
import { readJson, hashId, plainText } from "./scanner.js";
import { PROMPTS } from "./prompts.js";

const UNSAFE_RE = /\b(nsfw|porn|porno|erotic|lewd|nude|nudes|sexual|uncensored|abliterated|jailbreak|jailbroken|dan mode|bypass (the )?(filter|safety)|gore|hentai|onlyfans|malware|keylogger|ransomware|crack|keygen)\b/i;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

const enc = encodeURIComponent;
const clip = (text, n) => {
  const t = plainText(String(text || "")).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
};
const words = (q) => String(q || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !STOP.has(w));
const STOP = new Set(["for", "the", "and", "with", "to", "of", "in", "a", "an", "on", "my", "me", "some", "any", "best", "good", "find", "skill", "skills", "prompt", "prompts", "claude", "ai"]);

/** The words a directory should search for: "design skills for Claude" becomes "design". */
function keyWords(query) {
  return words(query).join(" ") || String(query || "").trim();
}

/** 0..1: how many of the query's words appear in the item's text (name counts double). */
function relevance(qWords, name, text) {
  if (!qWords.length) return 0.5;
  const n = String(name || "").toLowerCase();
  const t = `${n} ${String(text || "").toLowerCase()}`;
  let hit = 0;
  for (const w of qWords) {
    if (n.includes(w)) hit += 1;
    else if (t.includes(w)) hit += 0.6;
  }
  return hit / qWords.length;
}

/** Rank by relevance first, then popularity (log-scaled so one huge repo does not win everything). */
function rank(results, qWords) {
  for (const r of results) {
    r.match = Math.round(relevance(qWords, r.title, `${r.summary} ${r.by || ""} ${r.tags || ""}`) * 100) / 100;
    r.rank = r.match * 10 + Math.log10(1 + (r.popularity || 0));
  }
  return results
    .filter((r) => !UNSAFE_RE.test(`${r.title} ${r.summary} ${r.text || ""}`))
    .filter((r) => !qWords.length || r.match >= (qWords.length > 1 ? 0.5 : 0.3))
    .sort((a, b) => b.rank - a.rank);
}

/** One entry per item: the same skill or prompt listed by two directories keeps the more popular listing. */
function dedupe(results) {
  const byKey = new Map();
  const keyOf = (r) => `${r.kind}|${String(r.title).toLowerCase().replace(/[^a-z0-9]/g, "")}|${String(r.by || "").toLowerCase()}`;
  const urlOf = (r) => (r.repo || r.url || "").toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\/(www\.)?/, "");
  const seenUrls = new Set();
  for (const r of [...results].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))) {
    const url = urlOf(r);
    if (url && seenUrls.has(url)) continue;
    if (byKey.has(keyOf(r))) continue;
    if (url) seenUrls.add(url);
    byKey.set(keyOf(r), r);
  }
  return [...byKey.values()];
}

/** Ask every source at once; keep what answered. */
async function gather(key, sources) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const settled = await Promise.allSettled(sources.map((s) => s.run()));
  const results = [];
  const report = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      results.push(...r.value);
      report.push({ source: sources[i].name, ok: true, found: r.value.length });
    } else {
      report.push({ source: sources[i].name, ok: false, reason: String(r.reason?.message || r.reason).slice(0, 80) });
    }
  });
  const value = { results, report };
  if (report.some((s) => s.ok)) cache.set(key, { at: Date.now(), value });
  return value;
}

function finish(kind, query, { results, report }, limit) {
  const ranked = rank(dedupe(results), words(query)).slice(0, limit);
  if (!report.some((s) => s.ok)) return { ok: false, kind, query, reason: "The directories did not answer. Try again in a minute.", sources: report };
  return {
    ok: true, kind, query, count: ranked.length,
    results: ranked.map(({ rank: _r, match: _m, popularity: _p, tags: _t, repo: _repo, ...r }) => r),
    sources: report,
  };
}

const ghRepo = (r, extra = {}) => ({
  id: hashId(r.html_url), title: r.full_name, summary: clip(r.description, 220), url: r.html_url,
  source: "GitHub", by: r.owner?.login || "", popularity: r.stargazers_count || 0,
  popularityLabel: `${r.stargazers_count} stars`, repo: r.html_url, tags: (r.topics || []).join(" "),
  updated: r.pushed_at || null, ...extra,
});
const ghSearch = (q, perPage = 12) =>
  readJson(`https://api.github.com/search/repositories?q=${enc(q)}&sort=stars&order=desc&per_page=${perPage}`, { direct: true })
    .then((d) => (d.items || []).filter((r) => !r.archived && !r.fork));

// ---- prompts -----------------------------------------------------------------------

/**
 * Real prompts written by people: prompts.chat (the open prompt library, formerly
 * Awesome ChatGPT Prompts), prompt collections on GitHub, and AI Radar's own library.
 */
export async function findPrompts(query, { limit = 8 } = {}) {
  const q = String(query || "").trim();
  const k = keyWords(q);
  const data = await gather(`prompts:${q.toLowerCase()}`, [
    {
      name: "prompts.chat",
      run: async () => {
        const d = await readJson(`https://prompts.chat/api/prompts?q=${enc(k)}&limit=24`);
        return (d.prompts || []).filter((p) => p.type === "TEXT" || !p.type).map((p) => ({
          id: hashId(`pc:${p.id}`), kind: "prompt", title: clip(p.title, 120), summary: clip(p.description || p.content, 220),
          text: String(p.content || "").slice(0, 1800), url: `https://prompts.chat/prompts/${p.id}_${p.slug}`,
          source: "prompts.chat", by: p.author?.name || p.author?.username || "", category: p.category?.name || "",
          popularity: (p.voteCount || 0) * 20 + (p.viewCount || 0), popularityLabel: `${p.voteCount || 0} votes`,
          tags: (p.tags || []).map((t) => t.tag?.name || "").join(" "), updated: p.updatedAt || null,
        }));
      },
    },
    {
      name: "GitHub prompt collections",
      run: async () => (await ghSearch(`${k} prompts in:name,description,topics`, 8)).map((r) => ghRepo(r, { kind: "prompt collection" })),
    },
    {
      name: "AI Radar library",
      run: async () => PROMPTS.map((p) => ({
        id: p.id, kind: "prompt", title: p.title, summary: p.useFor, text: p.text, url: "./#prompts",
        source: "AI Radar library", by: "AI Radar", category: p.group, popularity: 0, popularityLabel: "",
      })),
    },
  ]);
  return finish("prompts", q, data, limit);
}

// ---- skills ------------------------------------------------------------------------

const ANTHROPIC_SKILLS = "https://api.github.com/repos/anthropics/skills/contents/skills";

/**
 * Agent skills (SKILL.md folders for Claude Code, Codex and other agents): the skills.sh
 * and SkillsMP directories, Anthropic's own skills, and skill repositories on GitHub.
 */
export async function findSkills(query, { limit = 8 } = {}) {
  const q = String(query || "").trim();
  const k = keyWords(q);
  const data = await gather(`skills:${q.toLowerCase()}`, [
    {
      name: "skills.sh",
      run: async () => {
        const d = await readJson(`https://skills.sh/api/search?q=${enc(k)}`);
        return (d.skills || []).slice(0, 20).map((s) => ({
          id: hashId(`ss:${s.id}`), kind: "skill", title: s.name, summary: `${s.skillId} from ${s.source}.`,
          url: `https://skills.sh/${s.id}`, repo: `https://github.com/${s.source}/${s.skillId}`, source: "skills.sh", by: s.source.split("/")[0],
          popularity: s.installs || 0, popularityLabel: `${s.installs || 0} installs`, tags: s.source,
          github: `https://github.com/${s.source}`,
        }));
      },
    },
    {
      name: "SkillsMP",
      run: async () => {
        const d = await readJson(`https://skillsmp.com/api/v1/skills/search?q=${enc(k)}&limit=20`);
        return (d.data?.skills || []).map((s) => ({
          id: hashId(`smp:${s.id}`), kind: "skill", title: s.name, summary: clip(s.description, 220),
          url: s.githubUrl || s.skillUrl, source: "SkillsMP", by: s.author || "",
          // SkillsMP's "stars" belong to whichever repository holds the file (often a copy), so
          // they are not shown or used to rank.
          popularity: 10, popularityLabel: "",
          github: s.githubUrl || "", updated: s.updatedAt ? new Date(s.updatedAt * 1000).toISOString() : null,
        }));
      },
    },
    {
      name: "Anthropic skills",
      run: async () => {
        const list = await readJson(ANTHROPIC_SKILLS, { direct: true });
        return (Array.isArray(list) ? list : []).filter((f) => f.type === "dir").map((f) => ({
          id: hashId(`as:${f.name}`), kind: "skill", title: f.name, summary: `An official skill from Anthropic's skills repository.`,
          url: f.html_url, repo: f.html_url, source: "Anthropic skills", by: "anthropics", popularity: 50000, popularityLabel: "official",
          github: f.html_url,
        }));
      },
    },
    {
      name: "GitHub skill repos",
      run: async () => {
        const [a, b] = await Promise.allSettled([
          ghSearch(`${k} topic:agent-skills`, 8),
          ghSearch(`${k} skill in:name,description claude`, 8),
        ]);
        const repos = [...(a.value || []), ...(b.value || [])];
        if (a.status === "rejected" && b.status === "rejected") throw a.reason;
        return repos.map((r) => ghRepo(r, { kind: "skill repo", github: r.html_url }));
      },
    },
  ]);
  return finish("skills", q, data, limit);
}

// ---- tools: MCP servers, apps, packages, models ------------------------------------

let openRouterModels = null;
async function freeModels() {
  if (!openRouterModels) {
    const d = await readJson("https://openrouter.ai/api/v1/models", { direct: true });
    openRouterModels = (d.data || []).filter((m) => m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
  }
  return openRouterModels;
}

export const TOOL_KINDS = ["all", "mcp", "apps", "packages", "models", "free-models"];

/**
 * AI tools to try: MCP servers (the official MCP Registry and npm), apps and demos
 * (Hugging Face Spaces), libraries (npm), open models (Hugging Face) and free hosted
 * models (OpenRouter's $0 models).
 */
export async function findTools(query, { kind = "all", limit = 8 } = {}) {
  const q = String(query || "").trim();
  const k = keyWords(q);
  const want = (k) => kind === "all" || kind === k;
  const sources = [];
  if (want("mcp")) {
    sources.push({
      name: "MCP Registry",
      run: async () => {
        const d = await readJson(`https://registry.modelcontextprotocol.io/v0/servers?search=${enc(k)}&limit=20`, { direct: true });
        const latest = new Map();
        for (const { server: s } of d.servers || []) latest.set(s.name, s);
        return [...latest.values()].map((s) => ({
          id: hashId(`mcp:${s.name}`), kind: "MCP server", title: s.title || s.name, summary: clip(s.description, 220),
          url: s.websiteUrl || s.repository?.url || `https://registry.modelcontextprotocol.io/v0/servers?search=${enc(s.name)}`,
          // Listed in the official registry: ranked like a well-used npm package.
          source: "MCP Registry", by: s.name.split("/")[0], popularity: 2000, popularityLabel: `v${s.version} in the official registry`,
          remote: (s.remotes || [])[0]?.url || "", repo: s.repository?.url || "",
        }));
      },
    });
    sources.push({
      name: "npm (MCP servers)",
      run: async () => {
        const d = await readJson(`https://registry.npmjs.org/-/v1/search?text=${enc(`${k} keywords:mcp`)}&size=12`, { direct: true });
        return (d.objects || []).map((o) => ({
          id: hashId(`npm:${o.package.name}`), kind: "MCP server", title: o.package.name, summary: clip(o.package.description, 220),
          url: `https://www.npmjs.com/package/${o.package.name}`, source: "npm", by: o.package.publisher?.username || "",
          popularity: o.downloads?.weekly || 0, popularityLabel: `${o.downloads?.weekly || 0} downloads a week`, updated: o.updated || null,
        }));
      },
    });
  }
  if (want("packages")) {
    sources.push({
      name: "npm",
      run: async () => {
        const d = await readJson(`https://registry.npmjs.org/-/v1/search?text=${enc(`${k} keywords:ai`)}&size=12`, { direct: true });
        return (d.objects || []).map((o) => ({
          id: hashId(`npmp:${o.package.name}`), kind: "package", title: o.package.name, summary: clip(o.package.description, 220),
          url: `https://www.npmjs.com/package/${o.package.name}`, source: "npm", by: o.package.publisher?.username || "",
          popularity: o.downloads?.weekly || 0, popularityLabel: `${o.downloads?.weekly || 0} downloads a week`,
        }));
      },
    });
  }
  if (want("apps")) {
    sources.push({
      name: "Hugging Face Spaces",
      run: async () => {
        const d = await readJson(`https://huggingface.co/api/spaces?search=${enc(k)}&sort=likes&direction=-1&limit=12&full=true`, { direct: true });
        return (d || []).map((s) => ({
          id: hashId(`sp:${s.id}`), kind: "app", title: s.cardData?.title || s.id, summary: clip(s.cardData?.short_description || `${s.id}, a ${s.sdk || ""} app on Hugging Face.`, 220),
          url: `https://huggingface.co/spaces/${s.id}`, source: "Hugging Face Spaces", by: s.author || s.id.split("/")[0],
          popularity: s.likes || 0, popularityLabel: `${s.likes || 0} likes`, tags: s.id, updated: s.lastModified || null,
        }));
      },
    });
  }
  if (want("models")) {
    sources.push({
      name: "Hugging Face models",
      run: async () => {
        const d = await readJson(`https://huggingface.co/api/models?search=${enc(k)}&sort=downloads&direction=-1&limit=12`, { direct: true });
        return (d || []).map((m) => ({
          id: hashId(`hf:${m.id}`), kind: "open model", title: m.id, summary: `${m.pipeline_tag ? m.pipeline_tag.replace(/-/g, " ") + " model" : "Model"} by ${m.id.split("/")[0]} on Hugging Face.`,
          url: `https://huggingface.co/${m.id}`, source: "Hugging Face", by: m.id.split("/")[0],
          popularity: m.downloads || 0, popularityLabel: `${m.downloads || 0} downloads, ${m.likes || 0} likes`, tags: m.id,
        }));
      },
    });
  }
  if (want("free-models") || want("models")) {
    sources.push({
      name: "OpenRouter free models",
      run: async () => (await freeModels()).map((m) => ({
        id: hashId(`or:${m.id}`), kind: "free model", title: m.name || m.id, summary: clip(m.description, 220),
        url: `https://openrouter.ai/${m.id}`, source: "OpenRouter", by: m.id.split("/")[0],
        popularity: 1000, popularityLabel: `$0 per token, ${m.context_length || "?"} context`, tags: m.id,
      })),
    });
  }
  return finish("tools", q, await gather(`tools:${kind}:${q.toLowerCase()}`, sources), limit);
}

// ---- papers ------------------------------------------------------------------------

/** Research papers: Hugging Face Papers (with its short summaries) and arXiv. */
export async function findPapers(query, { limit = 8 } = {}) {
  const q = String(query || "").trim();
  const k = keyWords(q);
  const data = await gather(`papers:${q.toLowerCase()}`, [
    {
      name: "Hugging Face Papers",
      run: async () => {
        const d = await readJson(`https://huggingface.co/api/papers/search?q=${enc(k)}&limit=12`, { direct: true });
        return (d || []).slice(0, 12).map(({ paper: p }) => ({
          id: hashId(`hp:${p.id}`), kind: "paper", title: clip(p.title, 160), summary: clip(p.ai_summary || p.summary, 260),
          url: `https://huggingface.co/papers/${p.id}`, source: "Hugging Face Papers", by: (p.authors || []).slice(0, 3).map((a) => a.name).join(", "),
          popularity: (p.upvotes || 0) * 10, popularityLabel: `${p.upvotes || 0} upvotes`, updated: p.publishedAt || null,
        }));
      },
    },
    {
      name: "arXiv",
      run: async () => {
        const url = `https://export.arxiv.org/api/query?search_query=${enc(`all:"${k}"`)}&sortBy=submittedDate&sortOrder=descending&max_results=10`;
        const xml = await fetchArxiv(url);
        return xml.map((e) => ({
          id: hashId(`ax:${e.url}`), kind: "paper", title: clip(e.title, 160), summary: clip(e.summary, 260), url: e.url,
          source: "arXiv", by: e.authors, popularity: 0, popularityLabel: "", updated: e.published,
        }));
      },
    },
  ]);
  return finish("papers", q, data, limit);
}

async function fetchArxiv(url) {
  // arXiv answers in Atom XML; readJson cannot read it, so try the site proxy, then Jina.
  for (const build of [(u) => `./feed-proxy.php?url=${enc(u)}`, (u) => `https://api.allorigins.win/raw?url=${enc(u)}`]) {
    try {
      const resp = await fetch(build(url), { signal: AbortSignal.timeout(18000) });
      if (!resp.ok) continue;
      const doc = new DOMParser().parseFromString(await resp.text(), "application/xml");
      const entries = [...doc.getElementsByTagName("entry")];
      if (!entries.length && !doc.getElementsByTagName("feed").length) continue;
      const text = (el, tag) => el.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
      return entries.map((e) => ({
        title: text(e, "title"), summary: text(e, "summary"), url: text(e, "id"), published: text(e, "published"),
        authors: [...e.getElementsByTagName("author")].slice(0, 3).map((a) => text(a, "name")).join(", "),
      }));
    } catch { /* next route */ }
  }
  throw new Error("arXiv unavailable");
}
