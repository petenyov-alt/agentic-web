// AI Radar top stories.
//
// The same news reaches the radar from several outlets at once: the lab's own blog, news
// sites, Bing News and the Hacker News front page. This groups those reports into one story
// (by the names they share, such as "Gemini 4 Neon"), keeps the best report and lists the
// outlets. A story that many outlets carry, from a lab's own blog or high on Hacker News,
// and that is fresh, is a top story: it goes on air first.

const HOUR = 3600 * 1000;
const CLUSTER_WINDOW_MS = 48 * HOUR;   // reports further apart than this are different news
const TOP_MAX_AGE_MS = 36 * HOUR;      // a top story is at most this old
export const TOP_HEAT = 8;

// The labs' own blogs: their announcements are the news itself.
const LAB_SOURCES = new Set(["openai", "deepmind", "google-ai", "mistral", "hf-blog"]);

// Words that say nothing about which news it is, even when capitalised in a headline.
const GENERIC = new Set(`a an the and or but of for to in on at by with from into over as is are was were be been it its this that
these those new now just more most less all any how why what when who which where here there today week weeks month year
says said say launch launches launched launching release releases released ships ship shipped introduces introducing
introduce announces announced announce unveils unveiled reveals revealed adds added update updates updated gets get got
brings bring makes make made lets let can could will would may might should first latest next big biggest top best faster
fast cheaper cheap better free open source model models ai agent agents agentic app apps tool tools feature features users
user people company companies startup startups report reports study research paper new-ish your you our we us they their
his her he she i my me not no yes vs via after before about against still even also amid than then so up down out off
inside behind under within without why-it-matters exclusive opinion analysis review hands-on preview beta version
available availability now-available rolls rolling rollout out expands expand expanding coming comes come goes go going
tech technology developers developer data powered power using use used help helps work works working every one two three
four five six seven eight nine ten million billion percent per cent day days hour hours minute minutes`.split(/\s+/));

// Companies and model families: shared by many unrelated stories, so they never decide alone.
const FAMILY = new Set(`google openai anthropic meta microsoft apple amazon aws nvidia deepmind gemini gpt chatgpt claude llama
qwen deepseek mistral grok xai hugging face huggingface github copilot alibaba tencent baidu bytedance samsung intel amd
ibm oracle salesforce perplexity cohere midjourney stability runway sora veo kimi moonshot zhipu glm minimax`.split(/\s+/));

/** The names in a headline: capitalised words and words with digits, minus generic words. */
export function namesIn(title) {
  const names = new Set();
  for (const raw of String(title || "").replace(/[’']s\b/g, "").split(/[^A-Za-z0-9.+-]+/)) {
    const word = raw.replace(/^[.+-]+|[.+-]+$/g, "");
    const lower = word.toLowerCase();
    if ((lower.length < 2 && !/\d/.test(lower)) || GENERIC.has(lower)) continue;
    if (/^[A-Z]/.test(word) || /\d/.test(word)) names.add(lower);
  }
  return names;
}

const isStrong = (name) => name.length >= 3 && !/^\d+(\.\d+)?$/.test(name) && !FAMILY.has(name);

/** The outlet behind a report, without Hacker News' points. */
export function outletOf(story) {
  return String(story.source || "").replace(/,\s*[\d.,]+k?\s*points?$/i, "").replace(/\s+on MSN$/i, "").trim() || "the feed";
}

const timeOf = (story) => (story.publishedAt ? new Date(story.publishedAt).getTime() : NaN);
const hnPoints = (story) => story.hnPoints ?? (/^hacker news/i.test(story.source || "") ? story.score || 0 : 0);
// A report may already stand for several (when a channel was ranked before the whole radar).
const outletsOf = (story) => story.outlets || [outletOf(story)];
const isLab = (story) => Boolean(story.lab) || LAB_SOURCES.has(story.sourceId);

/** Two reports are the same news: they share a distinctive name and at least one more. */
function sameNews(a, b) {
  let shared = 0;
  let strong = false;
  for (const name of a.names) {
    if (!b.names.has(name)) continue;
    shared++;
    if (isStrong(name)) strong = true;
  }
  return strong && shared >= 2;
}

/** The report to read on air: a lab's own words first, then the one with the fullest summary. */
function bestReport(members) {
  return [...members].sort((a, b) =>
    (isLab(b) - isLab(a))
    || ((b.summary || "").length > 40) - ((a.summary || "").length > 40)
    || (timeOf(a) || Infinity) - (timeOf(b) || Infinity))[0];
}

/**
 * Group reports of the same news. Returns {stories, groups}: `stories` keeps one report per
 * news item (in the original order, top stories first, hottest first), each with `outlets`,
 * `heat`, `memberIds` and `top`; `groups` maps every member id to the kept report's id.
 */
export function rankStories(stories, now = Date.now()) {
  const items = stories.map((story, index) => ({ story, index, names: namesIn(story.title), t: timeOf(story) }));
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const fresh = items.filter((item) => Number.isFinite(item.t) && now - item.t < CLUSTER_WINDOW_MS);
  for (let i = 0; i < fresh.length; i++) {
    for (let j = i + 1; j < fresh.length; j++) {
      const a = fresh[i];
      const b = fresh[j];
      if (Math.abs(a.t - b.t) < CLUSTER_WINDOW_MS && sameNews(a, b)) parent[find(a.index)] = find(b.index);
    }
  }
  const clusters = new Map();
  for (const item of items) {
    const root = find(item.index);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(item);
  }
  const groups = new Map();
  const kept = [];
  for (const members of clusters.values()) {
    const reports = members.map((m) => m.story);
    const best = bestReport(reports);
    const outlets = [...new Set([...outletsOf(best), ...reports.flatMap(outletsOf)])];
    const memberIds = [...new Set(reports.flatMap((r) => r.memberIds || [r.id]))];
    const lab = reports.some(isLab);
    const points = Math.max(...reports.map(hnPoints));
    const newest = Math.max(...members.map((m) => m.t).filter(Number.isFinite), -Infinity);
    const age = now - newest;
    const heat = Math.min(outlets.length, 6) * 2
      + (lab ? 2 : 0)
      + (points >= 100 ? 2 : 0)
      + (age < 12 * HOUR ? 1 : 0);
    const top = members.length > 0 && Number.isFinite(newest) && age < TOP_MAX_AGE_MS && heat >= TOP_HEAT;
    for (const id of memberIds) groups.set(id, best.id);
    kept.push({
      story: { ...best, outlets, heat, top, lab, hnPoints: points, memberIds },
      index: Math.min(...members.map((m) => m.index)),
    });
  }
  kept.sort((a, b) => (b.story.top - a.story.top) || (b.story.top ? b.story.heat - a.story.heat : 0) || a.index - b.index);
  return { stories: kept.map((k) => k.story), groups };
}

/** "A", "A and B", "A, B and C". */
export function listOutlets(outlets) {
  const names = outlets.slice(0, 3);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Who is reporting a top story, said on air: the outlets the radar reads itself come first
 * (the lab, the news sites, Hacker News), the rest are counted. "" for a single outlet.
 */
export function reportingLine(outlets, known = []) {
  if (!outlets || outlets.length < 2) return "";
  const own = outlets.filter((o) => known.includes(o));
  const named = (own.length ? own : outlets).slice(0, 2);
  if (outlets.length <= 3) return `${listOutlets(outlets)} are all reporting it.`;
  return `${outlets.length} outlets are reporting it, including ${listOutlets(named)}.`;
}
