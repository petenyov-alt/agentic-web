// AI Radar news scanner.
//
// Each TV channel is an AI topic with its own sources: AI labs' blogs, AI news sites,
// Hugging Face (trending models, daily papers), Hacker News, the official MCP server
// registry, Devpost hackathons and the Open Agentic Web list of agentic websites.
// Headlines are cleaned for reading aloud, summaries keep only complete sentences, and
// a safety screen drops adult or abusive items. When a source is down, the built-in
// archive keeps every channel on air.
//
// Feeds without CORS headers are read through a chain of proxies: the site's own
// feed-proxy.php (on a PHP host such as DonWeb), then public proxies. Results are
// cached per channel.

import { ARCHIVE_STORIES } from "./fallback-news.js";
import { rankStories } from "./topstory.js";

export const TOPICS = [
  { id: "all", name: "All AI", short: "ALL", icon: "📡" },
  { id: "models", name: "Models", short: "MOD", icon: "🧠" },
  { id: "local", name: "Local AI", short: "LOC", icon: "💻" },
  { id: "tools", name: "Tools & skills", short: "TLS", icon: "🛠" },
  { id: "projects", name: "GitHub projects", short: "GIT", icon: "⌥" },
  { id: "free", name: "Free & open", short: "FRE", icon: "🎁" },
  { id: "prompts", name: "Prompts", short: "PRM", icon: "✍" },
  { id: "security", name: "Security", short: "SEC", icon: "🛡" },
  { id: "research", name: "Research", short: "RES", icon: "🔬" },
  { id: "events", name: "Competitions", short: "EVT", icon: "🏆" },
  { id: "agentic", name: "Agentic web", short: "AGW", icon: "🕸" },
];
export const TOPIC_IDS = TOPICS.map((t) => t.id);

const DAY = 24 * 3600 * 1000;
const isoDaysAgo = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 19) + "Z";
// Hacker News search: one plain query per source (Algolia has no OR), last 30 days.
const hn = (query, minPoints = 10) => () =>
  `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=15&query=${encodeURIComponent(query)}&numericFilters=${encodeURIComponent(`points>${minPoints},created_at_i>${Math.floor((Date.now() - 30 * DAY) / 1000)}`)}`;

// Bing News: thousands of outlets for one query, newest first. Each item names its outlet.
const bing = (query) => `https://www.bing.com/news/search?format=rss&mkt=en-US&qft=sortbydate%3d%221%22&q=${encodeURIComponent(query)}`;
// Hacker News front page right now: whatever is big today, AI or not (AI items are kept).
const HN_FRONT = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30";

// GitHub trending (daily and weekly), as RSS from a public mirror of github.com/trending.
const TRENDING = (span) => `https://mshibanami.github.io/GitHubTrendingRSS/${span}/all.xml`;
const OPENROUTER = "https://openrouter.ai/api/v1/models";
const DEVPOST_AI = "https://devpost.com/api/hackathons?themes%5B%5D=Machine%20Learning%2FAI";
const SKILL_RE = /\b(skills?|claude code|slash commands?|SKILL\.md|plugins?)\b/i;
const PROMPT_RE = /\b(prompts?|prompt engineering|prompting)\b/i;

// GitHub search: repositories created in the last 7 days, most starred first.
const ghSearch = (q) => `https://api.github.com/search/repositories?q=${encodeURIComponent(`${q} created:>${isoDaysAgo(7).slice(0, 10)} stars:>=25`)}&sort=stars&order=desc&per_page=40`;
// Star-farmed and abusive repositories: bypass tools, cracks, proxy configs, account generators.
const REPO_SPAM_RE = /\b(bypass|crack|cracked|keygen|cheat|cheats|proxy|proxies|config checker|region|unlock|free premium|unlimited|account generator|airdrop|spam|bot farm)\b/i;

// kind: how to read the source. topic: the channel it feeds. trusted: the outlet only
// covers AI, so its items need no AI keyword (others must mention AI).
export const SOURCES = [
  // Models
  { id: "openai", name: "OpenAI News", topic: "models", kind: "rss", trusted: true, url: "https://openai.com/news/rss.xml" },
  { id: "deepmind", name: "Google DeepMind", topic: "models", kind: "rss", trusted: true, url: "https://deepmind.google/blog/rss.xml" },
  { id: "google-ai", name: "Google AI blog", topic: "models", kind: "rss", trusted: true, direct: true, url: "https://blog.google/technology/ai/rss/" },
  { id: "hf-blog", name: "Hugging Face blog", topic: "models", kind: "rss", trusted: true, url: "https://huggingface.co/blog/feed.xml" },
  { id: "decoder", name: "The Decoder", topic: "models", kind: "rss", trusted: true, url: "https://the-decoder.com/feed/" },
  { id: "techcrunch-ai", name: "TechCrunch AI", topic: "models", kind: "rss", trusted: true, url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { id: "verge-ai", name: "The Verge", topic: "models", kind: "rss", trusted: true, url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { id: "ars-ai", name: "Ars Technica", topic: "models", kind: "rss", trusted: true, url: "https://arstechnica.com/ai/feed/" },
  { id: "wired-ai", name: "Wired", topic: "models", kind: "rss", trusted: true, url: "https://www.wired.com/feed/tag/ai/latest/rss" },
  { id: "mit-tr-ai", name: "MIT Technology Review", topic: "models", kind: "rss", trusted: true, url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { id: "marktechpost", name: "MarkTechPost", topic: "models", kind: "rss", trusted: true, url: "https://www.marktechpost.com/feed/" },
  { id: "mistral", name: "Mistral AI", topic: "models", kind: "rss", trusted: true, url: "https://mistral.ai/rss.xml" },
  { id: "hn-front", name: "Hacker News", topic: "models", kind: "hn", direct: true, url: HN_FRONT },
  { id: "openrouter-new", name: "OpenRouter", topic: "models", kind: "openrouter-new", trusted: true, direct: true, url: OPENROUTER },
  { id: "bing-openai", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("OpenAI") },
  { id: "bing-anthropic", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("Anthropic Claude") },
  { id: "bing-gemini", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("Google Gemini") },
  { id: "bing-meta", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("Meta AI Llama") },
  { id: "bing-china", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("DeepSeek OR Qwen OR Kimi AI model") },
  { id: "bing-xai", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("xAI Grok") },
  { id: "bing-launch", name: "Bing News", topic: "models", kind: "rss", bing: true, url: bing("new AI model launch") },
  // Local AI
  { id: "hf-trending", name: "Hugging Face trending", topic: "local", kind: "hf-models", trusted: true, direct: true, url: "https://huggingface.co/api/models?sort=trendingScore&limit=25" },
  { id: "nvidia", name: "NVIDIA blog", topic: "local", kind: "rss", url: "https://blogs.nvidia.com/feed/" },
  { id: "bing-local", name: "Bing News", topic: "local", kind: "rss", bing: true, url: bing("open weights model OR local LLM") },
  { id: "ollama", name: "Ollama releases", topic: "local", kind: "release", product: "Ollama", trusted: true, url: "https://github.com/ollama/ollama/releases.atom" },
  { id: "hn-ollama", name: "Hacker News", topic: "local", kind: "hn", direct: true, url: hn("Ollama", 5) },
  { id: "hn-local", name: "Hacker News", topic: "local", kind: "hn", direct: true, url: hn("local LLM", 10) },
  { id: "hn-weights", name: "Hacker News", topic: "local", kind: "hn", direct: true, url: hn("open weights", 20) },
  // Tools & MCP
  { id: "producthunt-ai", name: "Product Hunt", topic: "tools", kind: "producthunt", trusted: true, url: "https://www.producthunt.com/feed?category=artificial-intelligence" },
  { id: "gh-trending-skills", name: "GitHub trending", topic: "tools", kind: "gh-trending", trusted: true, direct: true, url: TRENDING("weekly"), filter: SKILL_RE, label: "an agent skill trending on GitHub this week" },
  { id: "gh-skills", name: "GitHub", topic: "tools", kind: "github", trusted: true, direct: true, url: () => ghSearch("topic:agent-skills"), label: "a new agent skill on GitHub" },
  { id: "github-blog-ai", name: "GitHub blog", topic: "tools", kind: "rss", trusted: true, url: "https://github.blog/ai-and-ml/feed/" },
  { id: "aws-ml", name: "AWS Machine Learning blog", topic: "tools", kind: "rss", trusted: true, url: "https://aws.amazon.com/blogs/machine-learning/feed/" },
  { id: "bing-agents", name: "Bing News", topic: "tools", kind: "rss", bing: true, url: bing("AI agents tool launch") },
  { id: "mcp-registry", name: "MCP Registry", topic: "tools", kind: "mcp", trusted: true, direct: true, url: () => `https://registry.modelcontextprotocol.io/v0/servers?limit=40&updated_since=${isoDaysAgo(7)}` },
  { id: "hn-mcp", name: "Hacker News", topic: "tools", kind: "hn", direct: true, url: hn("MCP", 20) },
  { id: "hn-agents", name: "Hacker News", topic: "tools", kind: "hn", direct: true, url: hn("AI agent", 40) },
  { id: "hn-skills", name: "Hacker News", topic: "tools", kind: "hn", direct: true, url: hn("agent skills", 5) },
  // GitHub projects: new AI repositories gaining stars this week
  { id: "gh-trending-day", name: "GitHub trending", topic: "projects", kind: "gh-trending", direct: true, url: TRENDING("daily"), label: "trending on GitHub today" },
  { id: "gh-trending-week", name: "GitHub trending", topic: "projects", kind: "gh-trending", direct: true, url: TRENDING("weekly"), label: "one of GitHub's top projects this week" },
  { id: "gh-llm", name: "GitHub", topic: "projects", kind: "github", trusted: true, direct: true, url: () => ghSearch("topic:llm") },
  { id: "gh-agents", name: "GitHub", topic: "projects", kind: "github", trusted: true, direct: true, url: () => ghSearch("topic:ai-agents") },
  { id: "gh-mcp", name: "GitHub", topic: "projects", kind: "github", trusted: true, direct: true, url: () => ghSearch("topic:mcp") },
  // Free & open
  { id: "openrouter-free", name: "OpenRouter", topic: "free", kind: "openrouter-free", trusted: true, direct: true, url: OPENROUTER },
  { id: "hf-spaces", name: "Hugging Face Spaces", topic: "free", kind: "hf-spaces", trusted: true, direct: true, url: "https://huggingface.co/api/spaces?sort=trendingScore&limit=25" },
  { id: "hn-open-source", name: "Hacker News", topic: "free", kind: "hn", direct: true, url: hn("open source LLM", 15) },
  { id: "hn-free-tier", name: "Hacker News", topic: "free", kind: "hn", direct: true, url: hn("free tier", 10) },
  // Prompts
  { id: "willison-prompts", name: "Simon Willison", topic: "prompts", kind: "rss", trusted: true, direct: true, url: "https://simonwillison.net/tags/prompt-engineering.atom" },
  { id: "gh-trending-prompts", name: "GitHub trending", topic: "prompts", kind: "gh-trending", trusted: true, direct: true, url: TRENDING("weekly"), filter: PROMPT_RE, label: "a prompt project trending on GitHub this week" },
  { id: "gh-prompts", name: "GitHub", topic: "prompts", kind: "github", trusted: true, direct: true, url: () => ghSearch("topic:prompt-engineering"), label: "a new prompt collection on GitHub" },  { id: "hn-prompts", name: "Hacker News", topic: "prompts", kind: "hn", direct: true, url: hn("prompt engineering", 5) },
  { id: "hn-system-prompt", name: "Hacker News", topic: "prompts", kind: "hn", direct: true, url: hn("system prompt", 5) },
  // Security
  { id: "willison-injection", name: "Simon Willison", topic: "security", kind: "rss", trusted: true, direct: true, url: "https://simonwillison.net/tags/prompt-injection.atom" },
  { id: "owasp-genai", name: "OWASP GenAI Security", topic: "security", kind: "rss", trusted: true, url: "https://genai.owasp.org/feed/" },
  { id: "embrace-red", name: "Embrace The Red", topic: "security", kind: "rss", trusted: true, url: "https://embracethered.com/blog/index.xml" },
  { id: "hn-injection", name: "Hacker News", topic: "security", kind: "hn", direct: true, url: hn("prompt injection", 3) },
  // Research
  { id: "hf-papers", name: "Hugging Face Daily Papers", topic: "research", kind: "hf-papers", trusted: true, direct: true, url: "https://huggingface.co/api/daily_papers?limit=20" },
  { id: "arxiv-ai", name: "arXiv cs.AI", topic: "research", kind: "rss", trusted: true, url: "https://rss.arxiv.org/rss/cs.AI", max: 8 },
  { id: "mit-news-ai", name: "MIT News", topic: "research", kind: "rss", trusted: true, url: "https://news.mit.edu/rss/topic/artificial-intelligence2" },
  { id: "import-ai", name: "Import AI", topic: "research", kind: "rss", trusted: true, url: "https://importai.substack.com/feed" },
  { id: "latent-space", name: "Latent Space", topic: "research", kind: "rss", trusted: true, url: "https://www.latent.space/feed" },
  { id: "last-week-ai", name: "Last Week in AI", topic: "research", kind: "rss", trusted: true, url: "https://lastweekin.ai/feed" },
  { id: "willison", name: "Simon Willison", topic: "research", kind: "rss", trusted: true, direct: true, url: "https://simonwillison.net/atom/everything/" },
  // Events
  { id: "devpost", name: "Devpost", topic: "events", kind: "devpost", trusted: true, url: `${DEVPOST_AI}&status%5B%5D=open&order_by=deadline` },
  { id: "devpost-2", name: "Devpost", topic: "events", kind: "devpost", trusted: true, url: `${DEVPOST_AI}&status%5B%5D=open&order_by=deadline&page=2` },
  { id: "devpost-3", name: "Devpost", topic: "events", kind: "devpost", trusted: true, url: `${DEVPOST_AI}&status%5B%5D=open&order_by=deadline&page=3` },
  { id: "devpost-prizes", name: "Devpost", topic: "events", kind: "devpost", trusted: true, url: `${DEVPOST_AI}&status%5B%5D=open&order_by=prize-amount` },
  { id: "devpost-soon", name: "Devpost", topic: "events", kind: "devpost", upcoming: true, trusted: true, url: `${DEVPOST_AI}&status%5B%5D=upcoming` },
  // Agentic web
  { id: "agentic-list", name: "Open Agentic Web list", topic: "agentic", kind: "md-table", trusted: true, direct: true, url: "https://raw.githubusercontent.com/cognizant-ai-labs/agentic-web/main/docs/agentic_websites.md" },
  { id: "hn-agentic", name: "Hacker News", topic: "agentic", kind: "hn", direct: true, url: hn("agentic", 15) },
  { id: "hn-a2a", name: "Hacker News", topic: "agentic", kind: "hn", direct: true, url: hn("agent protocol", 5) },
];

// Never on air: adult, abusive or jailbreak material, and model names that advertise it.
const UNSAFE_RE = /\b(nsfw|porn|porno|erotic|lewd|nude|nudes|sexual|uncensored|abliterated|heretic|jailbreak|jailbroken|gore|slur|hentai|onlyfans|fuck\w*|shit\w*|bitch\w*|asshole\w*|cunt\w*)\b/i;
const AI_RE = /\b(ai|a\.i\.|llm|llms|gpt|gemini|claude|llama|mistral|qwen|deepseek|model|models|agent|agents|agentic|mcp|neural|machine learning|ml|transformer|diffusion|chatbot|openai|anthropic|hugging ?face|inference|fine-?tun\w*|prompt\w*|rag|embedding\w*|copilot|benchmark|token\w*|gpu|ollama|grok|xai|kimi|cuda|robot\w*|artificial intelligence)\b/i;

export function isUnsafe(story) {
  return UNSAFE_RE.test(`${story.title} ${story.summary}`);
}

export function isAboutAi(story) {
  return AI_RE.test(`${story.title} ${story.summary}`);
}

const FETCH_TIMEOUT_MS = 9000;
const MAX_PER_CHANNEL = 36;
const CACHE_PREFIX = "ai-radar:channel:v9:";
const CACHE_TTL_MS = 30 * 60 * 1000;

// Proxy chain for feeds without CORS. The first one only exists on a PHP host.
/** Returns a function that resolves no sooner than `ms` after the previous call's turn. */
function spacedBy(ms) {
  let next = 0;
  return () => {
    const now = Date.now();
    const wait = Math.max(0, next - now);
    next = Math.max(now, next) + ms;
    return new Promise((resolve) => setTimeout(resolve, wait));
  };
}

// Jina Reader returns the raw document with X-Return-Format: html (allowed by its CORS).
const PROXIES = [
  { name: "site", build: (url) => `./feed-proxy.php?url=${encodeURIComponent(url)}` },
  { name: "jina", build: (url) => `https://r.jina.ai/${url}`, headers: { "X-Return-Format": "html" }, throttle: spacedBy(3200) },
  { name: "allorigins", build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "rss2json", build: (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`, rss2json: true },
];

// ---- text helpers ------------------------------------------------------------------

/** Strip HTML tags and entities from feed text. */
export function plainText(html) {
  if (!html) return "";
  let text = String(html);
  if (typeof DOMParser !== "undefined") {
    text = new DOMParser().parseFromString(text, "text/html").body.textContent || "";
  } else {
    text = text.replace(/<[^>]*>/g, " ");
  }
  return text.replace(/\s+/g, " ").replace(/The post .* appeared first on .*$/i, "")
    .replace(/(Continue reading|Read more|Read the full story)[^.]*\.?\s*$/i, "").trim();
}

// ---- making stories sound like a TV bulletin ------------------------------------

// Headlines that are not news to read aloud: teasers, galleries, listicles, ads.
const CLICKBAIT_RE = new RegExp([
  "^(here'?s|here is|here are|this is|these are|check out|look:|see |meet the|watch\\b|listen\\b)|",
  "\\b(check out|photos? of|pictures? of|in pictures|photo gallery|gallery|quiz|podcast|newsletter|live updates|live blog|",
  "wordle|crossword|horoscope|deals?|on sale|discount|coupon|promo code|giveaway|sponsored|best .{0,30} to buy|",
  "how to|what to know|everything you need|ranked|review:|recipe|top \\d+|\\d+ (best|things|ways|reasons|tips|photos)|",
  "looking for volunteers|volunteers wanted|calls? for volunteers|in exchange for|live for free|without paying|hunt for|",
  "apply|applications?|eligibility|vacanc(y|ies)|recruitment|jobs?|admissions?|exam|results declared|stipend|tickets?)\\b",
].join(""), "i");
const HEADLINE_PREFIX_RE = /^(watch|video|photos?|gallery|listen|exclusive|breaking|update|updated|opinion|editorial|analysis|explainer|good news)\s*[:|–—-]\s*/i;
const QUOTING_RE = /^quoting\s+/i;
const HEADLINE_TAIL_RE = /\s*[([](video|photos?|watch|gallery|pics?|listen)[)\]]\s*$/i;

// Sentences in a summary that are about the web page, not the story.
const JUNK_SENTENCE_RE = /\b(photo|photos|photograph|pictured|picture|pictures|image|images|video|videos|watch|click|tap|subscribe|newsletter|sign up|read more|read on|continue reading|full story|follow us|credit|getty|shutterstock|alamy|courtesy of|instagram|tiktok|twitter|facebook|youtube|podcast|listen|download|our app|cookies|advertisement|sponsored|affiliate|this article|this story|this post|appeared first|originally published|reporting by|editing by|contributed to)\b|https?:|www\.|@\w/i;
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|St|Mt|Jr|Sr|Inc|Ltd|Co|Corp|vs|etc|U\.S|U\.K|U\.N|No|approx|Gov|Sen|Rep|Gen|Lt|Col|Capt|Sgt|Ave|Rd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/;

function words(text) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

/** How much of `a`'s vocabulary appears in `b` (0–1). */
function overlap(a, b) {
  const wa = new Set(words(a).filter((w) => w.length > 3));
  if (!wa.size) return 0;
  const wb = new Set(words(b));
  let hit = 0;
  for (const w of wa) if (wb.has(w)) hit++;
  return hit / wa.size;
}

/**
 * Clean a headline for reading aloud, or return null when it is not a news headline
 * (a teaser, a gallery, a listicle, a question, too short or too long).
 */
export function cleanHeadline(raw, { minWords = 5 } = {}) {
  let t = plainText(raw).replace(/\s+/g, " ").trim();
  t = t.replace(HEADLINE_PREFIX_RE, "").replace(HEADLINE_TAIL_RE, "").replace(QUOTING_RE, "");
  // "Headline - Publisher" / "Headline | Publisher"
  t = t.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, (m, offset) => (offset > 25 ? "" : m));
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
  // "Raigad Wildlife Rescue: Rare snake found…" → "Rare snake found…"
  const label = /^([^:]{3,40}):\s+(.+)$/.exec(t);
  if (label && words(label[1]).length <= 4 && words(label[2]).length >= 5) t = label[2];
  if (t.length > 150) return null;
  if (!t || t.endsWith("?") || CLICKBAIT_RE.test(t)) return null;
  const count = words(t).length;
  if (count < minWords || count > 28) return null;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) return null;
  return t.replace(/[.,;:–—-]+$/, "");
}

/** Split text into sentences, keeping abbreviations and numbers like 3.5 together. */
export function splitSentences(text) {
  const out = [];
  let current = "";
  const parts = text.split(/(?<=[.!?])\s+(?=["'“‘(]?[A-Z0-9])/);
  for (const part of parts) {
    current = current ? `${current} ${part}` : part;
    const lastWord = current.trim().split(/\s+/).pop();
    if (ABBREVIATIONS.test(lastWord) || /\b[A-Z]\.$/.test(lastWord)) continue;
    out.push(current.trim());
    current = "";
  }
  if (current) out.push(current.trim());
  return out;
}

/**
 * Pick the readable part of a feed summary: up to two complete sentences that are about
 * the story (not photos, links or the page) and do not repeat the headline. Returns ""
 * when nothing qualifies, so the anchor reads the headline alone.
 */
export function cleanSummary(raw, headline = "") {
  let text = plainText(raw)
    .replace(/\[(…|\.\.\.)\]|\[\+\d+ chars\]/g, " …")
    .replace(/^[A-Z][A-Za-z .,'-]{1,40}\s*(\((AP|Reuters|AFP|PTI|ANI|IANS|dpa)\))?\s*[—–-]\s+/, "")
    .replace(/\((photo|image|credit|pictured)[^)]*\)/gi, " ")
    .replace(/\s+/g, " ").trim();
  if (!text) return "";
  const picked = [];
  let length = 0;
  for (const sentence of splitSentences(text)) {
    if (picked.length === 2) break;
    const complete = /[.!?]["'”’)]?$/.test(sentence) && !/(\.\.\.|…)["'”’)]?$/.test(sentence);
    if (!complete) break;                         // the rest was cut off by the feed
    const count = words(sentence).length;
    if (count < 6 || sentence.length > 260) continue;
    if (!/^["'“‘(]?[A-Z0-9]/.test(sentence)) continue;  // starts mid-sentence
    if (/^(I|I'm|I've|My|We|Our)\b/.test(sentence)) continue;
    if (JUNK_SENTENCE_RE.test(sentence)) continue;
    if (headline && overlap(sentence, headline) > 0.7) continue;
    // The first sentence must be about the headline, or the anchor reads the headline alone.
    if (!picked.length && headline && overlap(headline, sentence) < 0.15) break;
    const years = (sentence.match(/\b(19|20)\d{2}\b/g) || []).map(Number);
    if (years.some((y) => y < new Date().getFullYear() - 1)) continue;
    if (length + sentence.length > 240) break;
    picked.push(sentence);
    length += sentence.length;
  }
  return picked.join(" ");
}

export function hashId(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return "s-" + h.toString(36);
}


// ---- fetching ----------------------------------------------------------------------

async function fetchWithTimeout(url, headers = undefined) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timed out")), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function parseRss(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Not a feed");
  const items = [...doc.querySelectorAll("item, entry")];
  if (!items.length && !doc.querySelector("rss, feed, channel")) throw new Error("Not a feed");
  const text = (node, sel) => node.querySelector(sel)?.textContent?.trim() || "";
  return items.map((item) => ({
    title: text(item, "title"),
    summary: text(item, "description") || text(item, "summary") || text(item, "content"),
    url: text(item, "link") || item.querySelector("link")?.getAttribute("href") || "",
    publishedAt: text(item, "pubDate") || text(item, "published") || text(item, "updated") || null,
    sourceName: text(item, "source") || item.getElementsByTagName("News:Source")[0]?.textContent?.trim() || "",
  }));
}

/**
 * Read a feed through the proxy chain. `parse(text)` turns the body into raw items and
 * throws when the body is not what was expected (such as a proxy's error page).
 */
async function readThroughProxies(url, parse, { allowRss2json = true } = {}) {
  const errors = [];
  for (const proxy of PROXIES) {
    if (proxy.rss2json && !allowRss2json) continue;
    try {
      if (proxy.throttle) await proxy.throttle();
      const response = await fetchWithTimeout(proxy.build(url), proxy.headers);
      if (proxy.rss2json) {
        const data = await response.json();
        if (data.status !== "ok") throw new Error(data.message || "rss2json error");
        return {
          via: proxy.name,
          items: (data.items || []).map((i) => ({
            title: i.title, summary: i.description || i.content, url: i.link,
            publishedAt: i.pubDate ? i.pubDate.replace(" ", "T") + "Z" : null, sourceName: "",
          })),
        };
      }
      return { via: proxy.name, items: parse(await response.text()) };
    } catch (error) {
      errors.push(`${proxy.name}: ${error?.message || error}`);
    }
  }
  throw new Error(errors.join("; "));
}


/**
 * Read a JSON API: straight from the browser when it sends CORS headers (`direct`),
 * otherwise through the proxy chain. Throws when no route returns JSON.
 */
export async function readJson(url, { direct = false } = {}) {
  if (direct) {
    try {
      return await (await fetchWithTimeout(url)).json();
    } catch { /* fall back to the proxies */ }
  }
  return (await readThroughProxies(url, (text) => JSON.parse(text), { allowRss2json: false })).items;
}

// ---- normalising each kind of source ----------------------------------------------

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const ensureStop = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);
const stripHtml = (html) => plainText(String(html || "")).replace(/\s+/g, " ").trim();
const fmt = (n) => Number(n || 0).toLocaleString("en-US");

/** Turn one source's raw response into items: {title, summary, url, publishedAt, score, structured}. */
function itemsFrom(source, text) {
  if (source.kind === "rss") {
    // Bing links go through a redirect: keep the article's own address.
    return parseRss(text).map((i) => ({ ...i, score: 0, ...(source.bing ? { url: articleUrl(i.url) } : {}) }));
  }
  if (source.kind === "gh-trending") {
    // Title "owner/repo"; the first paragraph of the description is the project's own blurb.
    return parseRss(text).map((i) => ({
      ...i, repo: i.title.trim(), blurb: stripHtml((/<p>([\s\S]*?)<\/p>/i.exec(i.summary) || [])[1] || ""),
    })).filter(({ repo, blurb }) => !source.filter || source.filter.test(`${repo} ${blurb}`)).map((i) => {
      const { repo, blurb } = i;
      const name = repo.split("/").pop().replace(/[-_]/g, " ");
      return {
        title: `${name}: ${source.label}`, summary: blurb ? `${repo}: ${ensureStop(blurb)}` : `${repo} is ${source.label}.`,
        url: i.url, publishedAt: i.publishedAt || new Date().toISOString(), score: 0, structured: true,
      };
    });
  }
  if (source.kind === "producthunt") {
    return parseRss(text).map((i) => {
      const tagline = stripHtml((/<p>([\s\S]*?)<\/p>/i.exec(i.summary) || [])[1] || "");
      return {
        title: `${i.title.trim()}: launched on Product Hunt`, summary: tagline ? `${i.title.trim()}: ${ensureStop(tagline)}` : "",
        url: i.url, publishedAt: i.publishedAt, score: 0, structured: true,
      };
    });
  }
  if (source.kind === "release") {
    // GitHub release feeds: keep version releases only, not commit-style titles.
    return parseRss(text).map((i) => ({ ...i, version: (/^v?\d+\.\d+[\w.]*(-rc\d*)?/.exec(i.title.trim()) || [])[0] }))
      .filter((i) => i.version).map((i) => ({
        ...i, score: 0, structured: true,
        title: /-rc/.test(i.version) ? `${source.product} ${i.version.replace(/-rc\d*/, "")} release candidate is out` : `${source.product} ${i.version} is out`,
        summary: cleanSummary(i.summary, "") || `A new version of ${source.product} has been released.`,
      }));
  }
  const data = source.kind === "md-table" ? null : JSON.parse(text);
  switch (source.kind) {
    case "hn":
      return (data.hits || []).map((h) => ({
        // Show HN posts open with the author's greeting, so the headline stands alone.
        title: String(h.title || "").replace(/^(show|launch|tell)\s+hn\s*[:–-]\s*/i, "").replace(/\s*\((yc|ycombinator)[^)]*\)/i, ""),
        summary: "",
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        publishedAt: h.created_at, score: h.points || 0, sourceName: `Hacker News, ${fmt(h.points)} points`,
      }));
    case "openrouter-new":
    case "openrouter-free": {
      // New models from the last 14 days, or free ones from the last 60, once per model (no :batch etc.).
      const free = source.kind === "openrouter-free";
      const days = free ? 60 : 14;
      const seenBase = new Set();
      return (data.data || []).filter((m) => {
        const base = m.id.replace(/:.*$/, "");
        if ((free ? !m.id.endsWith(":free") : m.id.includes(":")) || seenBase.has(base)) return false;
        if (!m.created || Date.now() - m.created * 1000 > days * DAY) return false;
        seenBase.add(base);
        return true;
      }).sort((a, b) => b.created - a.created).map((m) => {
        const name = String(m.name || m.id).replace(/^[^:]+:\s*/, "").replace(/\s*\(free\)$/i, "");
        const maker = String(m.name || "").includes(":") ? m.name.split(":")[0].trim() : m.id.split("/")[0];
        const ctx = m.context_length ? `, with a ${fmt(m.context_length)} token context window` : "";
        const perM = (v) => `$${(Number(v || 0) * 1e6).toFixed(2).replace(/\.00$/, "")}`;
        const when = new Date(m.created * 1000).toISOString();
        return free ? {
          title: `${name} from ${maker} is free to use on OpenRouter`,
          summary: `${name} costs nothing per token on OpenRouter right now${ctx}. Free models come with rate limits.`,
          url: `https://openrouter.ai/${m.id}`, publishedAt: when, score: 0, structured: true,
        } : {
          title: `${name} from ${maker} is now available on OpenRouter`,
          summary: `${name} is on OpenRouter${ctx}, at ${perM(m.pricing?.prompt)} per million input tokens and ${perM(m.pricing?.completion)} per million output tokens.`,
          url: `https://openrouter.ai/${m.id}`, publishedAt: when, score: 0, structured: true,
        };
      });
    }
    case "hf-spaces":
      return (Array.isArray(data) ? data : []).map((sp) => ({
        title: `${sp.id.split("/").pop().replace(/[-_]/g, " ")}: a free demo trending on Hugging Face`,
        summary: `${sp.id} has ${fmt(sp.likes)} likes on Hugging Face Spaces, where anyone can try it in the browser for free.`,
        url: `https://huggingface.co/spaces/${sp.id}`, publishedAt: sp.createdAt || null, score: sp.trendingScore || sp.likes || 0, structured: true,
      }));
    case "hf-models":
      return (Array.isArray(data) ? data : []).map((m) => ({
        title: `${m.id.split("/").pop().replace(/[-_]/g, " ")} is trending on Hugging Face`,
        summary: (() => {
          const kind = m.pipeline_tag ? m.pipeline_tag.replace(/-/g, " ") : "machine learning";
          return `${m.id} is ${/^[aeiou]/i.test(kind) ? "an" : "a"} ${kind} model with ${fmt(m.likes)} likes and ${fmt(m.downloads)} downloads.`;
        })(),
        url: `https://huggingface.co/${m.id}`, publishedAt: m.createdAt, score: m.trendingScore || m.likes || 0,
        structured: true, rawName: m.id,
      }));
    case "hf-papers":
      return (Array.isArray(data) ? data : []).map((p) => ({
        title: p.title || p.paper?.title,
        summary: p.paper?.ai_summary || p.summary || p.paper?.summary || "",
        url: `https://huggingface.co/papers/${p.paper?.id}`, publishedAt: p.publishedAt || p.paper?.publishedAt,
        score: p.paper?.upvotes || 0, structured: true, sourceName: `Hugging Face Daily Papers, ${fmt(p.paper?.upvotes)} upvotes`,
      }));
    case "mcp": {
      const seen = new Set();
      return (data.servers || []).filter((s) => {
        const name = s.server?.name;
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      }).map((s) => {
        const meta = s._meta?.["io.modelcontextprotocol.registry/official"] || {};
        const label = s.server.title || s.server.name;
        return {
          title: `New MCP server: ${label}`,
          summary: s.server.description ? `${label} is listed in the official MCP Registry. ${s.server.description}` : `${label} is listed in the official MCP Registry.`,
          url: s.server.websiteUrl || s.server.repository?.url || "https://registry.modelcontextprotocol.io/",
          publishedAt: meta.publishedAt || meta.updatedAt, score: 0, structured: true,
        };
      });
    }
    case "devpost":
      return (data.hackathons || []).map((h) => ({
        title: `${h.title}: an AI hackathon ${source.upcoming ? "opening soon" : "open"} on Devpost`,
        summary: `${h.title} runs ${h.submission_period_dates || "now"}, with ${h.time_left_to_submission || "time left"} to submit, ${stripHtml(h.prize_amount)} in prizes and ${fmt(h.registrations_count)} people registered.`,
        url: h.url, publishedAt: null, score: h.registrations_count || 0, structured: true,
        meta: {
          event: h.title, dates: h.submission_period_dates || "", left: h.time_left_to_submission || "",
          deadline: endDateOf(h.submission_period_dates), prize: stripHtml(h.prize_amount), registered: h.registrations_count || 0,
          where: h.displayed_location?.location || "Online",
        },
      }));
    case "github": {
      const seen = new Set();
      return (data.items || []).filter((r) => {
        // Clones that share one description are star-farming; keep the first and drop the rest.
        const key = String(r.description || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
        if (!r.description || seen.has(key) || REPO_SPAM_RE.test(`${r.full_name} ${r.description}`) || r.fork) return false;
        seen.add(key);
        return true;
      }).map((r) => ({
        title: `${r.name.replace(/[-_]/g, " ")}: ${source.label || "a new open-source project on GitHub"}`,
        summary: `${r.full_name} has ${fmt(r.stargazers_count)} stars in its first week${r.language ? `, written in ${r.language}` : ""}. ${String(r.description).trim()}`,
        url: r.html_url, publishedAt: r.created_at, score: r.stargazers_count || 0, structured: true,
      }));
    }
    case "md-table":
      return String(text).split("\n").filter((l) => /^\|\s*https?:/.test(l)).map((l) => {
        const cells = l.split("|").map((c) => c.trim());
        const [, url, name, description] = cells;
        return {
          title: `${name} is on the Open Agentic Web`, summary: `${name} is listed as an open agentic website. ${description}`,
          url, publishedAt: null, score: 0, structured: true,
        };
      });
    default:
      return [];
  }
}

/** "Oct 30 - Dec 04, 2026" → "2026-12-04"; null when the text has no end date. */
function endDateOf(text) {
  const t = String(text || "").trim();
  // "Oct 30 - Dec 04, 2026", or "Nov 13 - 20, 2026" where the end shares the start's month.
  const m = /(?:([A-Z][a-z]{2})\s+)?(\d{1,2}),\s*(\d{4})\s*$/.exec(t);
  if (!m) return null;
  const monthName = m[1] || (/^([A-Z][a-z]{2})/.exec(t) || [])[1];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthName);
  return month < 0 ? null : `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function readSource(source) {
  const url = typeof source.url === "function" ? source.url() : source.url;
  const parse = (text) => itemsFrom(source, text);
  if (source.direct) {
    // These sources send CORS headers: read them straight from the browser first.
    try {
      return { via: "direct", items: parse(await (await fetchWithTimeout(url)).text()) };
    } catch { /* fall back to the proxies */ }
  }
  return readThroughProxies(url, parse, { allowRss2json: source.kind === "rss" });
}

/** Clean, screen and score one source's items. Returns {kept, rejected}. */
function normalizeSource(source, items) {
  const kept = [];
  const rejected = [];
  for (const raw of items.slice(0, source.max || 30)) {
    // Labs and trusted outlets announce in few words ("Introducing Gemini 4 Neon"), and so
    // does the Hacker News front page; elsewhere a very short headline is usually noise.
    const minWords = source.trusted || source.kind === "hn" ? 2 : 5;
    const title = raw.structured ? stripHtml(raw.title).slice(0, 160) : cleanHeadline(raw.title, { minWords });
    if (!title) continue;
    const published = toIso(raw.publishedAt);
    if (published && Date.now() - new Date(published).getTime() > 60 * DAY) continue;
    const summary = raw.structured ? cleanSummary(raw.summary, "") || stripHtml(raw.summary).slice(0, 240) : cleanSummary(raw.summary, title);
    const story = {
      id: hashId(raw.url || title), title, summary, url: raw.url || "",
      source: raw.sourceName || source.name, sourceId: source.id, topic: source.topic,
      publishedAt: published, origin: "live", score: raw.score || 0,
      ...(raw.meta ? { meta: raw.meta } : {}),
    };
    if (isUnsafe(story) || UNSAFE_RE.test(raw.rawName || "")) { rejected.push({ title: story.title, source: story.source, reason: "unsafe" }); continue; }
    if (!source.trusted && !isAboutAi(story)) continue;
    kept.push(story);
  }
  return { kept, rejected };
}

// ---- archive & cache ---------------------------------------------------------------

export function archiveStories(topic = null) {
  return ARCHIVE_STORIES
    .filter((s) => !topic || topic === "all" || s.topic === topic)
    .map((story) => ({ ...story, sourceId: "studio-archive", publishedAt: null, origin: "archive", score: 0 }));
}

function readCache(topic) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + topic) || "null");
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;
  } catch { /* storage may be blocked */ }
  return null;
}

function writeCache(topic, result) {
  try { localStorage.setItem(CACHE_PREFIX + topic, JSON.stringify({ at: Date.now(), result })); } catch { /* ignore */ }
}

/**
 * Scan one channel's sources ("all" has none of its own: it shows every channel).
 * Returns {topic, stories, liveCount, rawCount, rejected, sources, scannedAt, fromCache}.
 * `stories` holds live stories only; the page merges in the archive. Never throws.
 */
export async function scanChannel(topic, { force = false } = {}) {
  if (!force) {
    const cached = readCache(topic);
    if (cached) return { ...cached, fromCache: true };
  }
  const sources = SOURCES.filter((s) => s.topic === topic);
  const results = await Promise.allSettled(sources.map(async (source) => {
    const { items, via } = await readSource(source);
    return { via, items, ...normalizeSource(source, items) };
  }));
  const seen = new Set();
  const stories = [];
  const rejected = [];
  let rawCount = 0;
  const report = sources.map((source, i) => {
    const r = results[i];
    if (r.status === "rejected") {
      return { id: source.id, name: source.name, topic, ok: false, error: String(r.reason?.message || r.reason).slice(0, 300) };
    }
    rawCount += r.value.items.length;
    rejected.push(...r.value.rejected);
    let kept = 0;
    for (const story of r.value.kept) {
      const key = story.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      stories.push(story);
      kept++;
    }
    return { id: source.id, name: source.name, topic, ok: true, via: r.value.via, fetched: r.value.items.length, kept };
  });
  // Newest first, then by the source's own score (points, upvotes, likes). New GitHub
  // projects are all from this week, so there the stars decide.
  if (topic === "projects") stories.sort((a, b) => b.score - a.score);
  else stories.sort((a, b) => (b.publishedAt || "").slice(0, 10).localeCompare((a.publishedAt || "").slice(0, 10)) || b.score - a.score);
  // Reports of the same news merge before the cap, so big news is never cut; it goes first.
  const ranked = rankStories(stories).stories;
  const result = {
    topic, stories: ranked.slice(0, MAX_PER_CHANNEL), liveCount: Math.min(ranked.length, MAX_PER_CHANNEL), rawCount, rejected,
    sources: report, scannedAt: new Date().toISOString(),
  };
  if (stories.length) writeCache(topic, result);
  return { ...result, fromCache: false };
}

// ---- search, for answering questions and checking tips ----------------------------

/**
 * Search recent AI news for a query: Hacker News stories and Bing News reports.
 * Returns cleaned reports with a stable id and the outlet. Never throws.
 */
export async function searchNews(query, { topic = "all" } = {}) {
  const bing = `https://www.bing.com/news/search?format=rss&mkt=en-US&q=${encodeURIComponent(query)}`;
  const hnUrl = `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=10&query=${encodeURIComponent(query)}&numericFilters=${encodeURIComponent(`created_at_i>${Math.floor((Date.now() - 90 * DAY) / 1000)}`)}`;
  const [news, hnews] = await Promise.allSettled([
    readThroughProxies(bing, parseRss, { allowRss2json: false }),
    readSource({ kind: "hn", direct: true, url: hnUrl }),
  ]);
  if (news.status === "rejected" && hnews.status === "rejected") {
    return { ok: false, reason: "News search is unavailable right now." };
  }
  const raw = [
    ...(news.status === "fulfilled" ? news.value.items.map((i) => ({ ...i, url: articleUrl(i.url) })) : []),
    ...(hnews.status === "fulfilled" ? hnews.value.items : []),
  ];
  const reports = [];
  const seen = new Set();
  for (const item of raw) {
    const title = cleanHeadline(item.title) || stripHtml(item.title).slice(0, 160);
    if (!title) continue;
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    const url = item.url || "";
    let host = "news report";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep default */ }
    const story = {
      id: hashId(url || title), title, summary: cleanSummary(item.summary, title), url,
      source: item.sourceName || host, sourceId: "news-search", topic, publishedAt: toIso(item.publishedAt),
      origin: "search", score: item.score || 0,
    };
    story.onAirAllowed = !isUnsafe(story) && isAboutAi(story);
    reports.push(story);
    if (reports.length === 12) break;
  }
  return { ok: true, query, reports };
}

/** Bing News links go through a click tracker; return the article's own address. */
function articleUrl(link) {
  try {
    const url = new URL(link);
    const real = url.searchParams.get("url");
    return real ? decodeURIComponent(real) : link;
  } catch {
    return link || "";
  }
}
