// Retelling a headline for the anchors. A blog post titled "I tried making X" is the
// author's voice: read out as it is, it sounds as if the anchor did it. These rules turn
// the author's "I", "my", "we" and "our" into the third person ("A developer tried making
// X"), and when a title cannot be turned safely, the anchor says whose words they are
// ("A post on Hacker News is titled: ..."). Only what is spoken changes; the story's own
// title stays as it is on screen and in the data.

// Verbs that can follow "I" in a headline without changing form in the third person.
const KEEPS_FORM = /^(?:\w+ed|built|made|wrote|ran|got|put|spent|found|gave|took|let|taught|read|won|lost|left|went|came|saw|did|had|was|began|brought|bought|caught|chose|drove|fed|felt|fought|forgot|held|hid|kept|knew|lent|lit|meant|met|paid|quit|rode|rang|rose|sent|set|shot|shut|sold|sang|sat|slept|spoke|stole|stood|struck|swam|threw|told|thought|understood|woke|wore|can|can't|cannot|could|couldn't|should|shouldn't|would|wouldn't|will|won't|might|must|just|finally|also|actually|accidentally|asked|almost|never|now|still|only)\b/i;

// What is left that still speaks as the author. "I" and "US" are matched by case: "US"
// is the country and "AI" is not a pronoun.
const FIRST_PERSON = /(?:^|[^\p{L}'’])(?:I|I['’](?:m|ve|d|ll)|[Mm]e|[Mm]y|[Mm]ine|[Mm]yself|[Ww]e|[Ww]e['’](?:re|ve|d|ll)|[Oo]ur|[Oo]urs|[Oo]urselves|us)(?![\p{L}'’])/u;

/** True when the text speaks as its author: "I", "my", "we", "our". */
export function isFirstPerson(text) {
  return FIRST_PERSON.test(String(text || ""));
}

// Where a new subject may start: the beginning, after a sentence or a colon, or after
// "How", "Why", "What", "When", "Where", "Here's how" and the like.
const OPENER = String.raw`(^|[.!?:;]\s+|\b(?:[Hh]ow|[Ww]hy|[Ww]hat|[Ww]hen|[Ww]here|[Ss]o|[Aa]nd|[Bb]ut|[Hh]ere['’]s (?:how|why|what)|[Tt]he day|[Tt]he time)\s+)`;

const capital = (pre, word) => (pre === "" || /[.!?:;]\s+$/.test(pre) ? word[0].toUpperCase() + word.slice(1) : word);

/**
 * The text in the third person, or null when it cannot be turned safely.
 * "I tried making X" -> "A developer tried making X"; "How I built my app" -> "How a
 * developer built their app"; "We raised $10M" -> "The team raised $10M".
 * Text with no first person comes back unchanged.
 */
export function thirdPerson(text) {
  let s = String(text || "");
  if (!isFirstPerson(s)) return s;
  const subject = (who, verb) => (m, pre) => `${pre}${capital(pre, who)}${verb}`;
  const re = (body) => new RegExp(`${OPENER}${body}`, "g");
  // The author as the subject.
  s = s.replace(re(String.raw`I(?:['’]m| am)\b`), subject("a developer", " is"))
    .replace(re(String.raw`I(?:['’]ve| have)\b`), subject("a developer", " has"))
    .replace(re(String.raw`I['’]d\b`), subject("a developer", " would"))
    .replace(re(String.raw`I(?:['’]ll| will)\b`), subject("a developer", " will"))
    .replace(new RegExp(`${OPENER}I (?=\\S)`, "g"), (m, pre, offset, all) => {
      const next = all.slice(offset + m.length);
      return KEEPS_FORM.test(next) ? `${pre}${capital(pre, "a developer")} ` : m;
    })
    .replace(re(String.raw`[Ww]e(?:['’]re| are)\b`), subject("the team", " is"))
    .replace(re(String.raw`[Ww]e(?:['’]ve| have)\b`), subject("the team", " has"))
    .replace(re(String.raw`[Ww]e(?:['’]ll| will)\b`), subject("the team", " will"))
    .replace(new RegExp(`${OPENER}[Ww]e (?=\\S)`, "g"), (m, pre, offset, all) => {
      const next = all.slice(offset + m.length);
      return KEEPS_FORM.test(next) ? `${pre}${capital(pre, "the team")} ` : m;
    });
  // Without an "I" or "we" to turn ("Let me explain MCP", "My setup"), "them" or "their"
  // would change what the title says: the anchor quotes it instead.
  if (s === String(text || "")) return null;
  // Their things. "My" after the subject was turned is "their"; "our" is the team's.
  const word = (from, to) => { s = s.replace(new RegExp(`(^|[^\\p{L}'’])${from}(?![\\p{L}'’])`, "gu"), (m, pre) => `${pre}${to}`); };
  word("myself", "themselves"); word("Myself", "Themselves");
  word("my", "their"); word("My", "Their");
  word("mine", "theirs");
  word("me", "them");
  word("ourselves", "themselves");
  word("our", "their"); word("Our", "Their");
  word("ours", "theirs");
  word("us", "them");
  return isFirstPerson(s) ? null : s;
}

/**
 * The title and summary as an anchor says them. A first-person title that cannot be turned
 * is said as a quote from its outlet. A first-person summary is left out: it is the author's
 * own story ("I am a student and..."), and turned round it would put words in a stranger's mouth.
 */
export function retell(story) {
  const title = String(story?.title || "").trim();
  const summary = String(story?.summary || "").trim();
  const turned = thirdPerson(title);
  const where = String(story?.source || "").replace(/\s+on MSN$/i, "").replace(/\s*\(\d+ points?\)$/i, "").trim();
  const spokenTitle = turned !== null ? turned
    : `${where ? `A post on ${where}` : "A new post"} is titled: ${title.replace(/\.+$/, "")}`;
  const spokenSummary = isFirstPerson(summary) ? "" : summary;
  return { title: spokenTitle, summary: spokenSummary };
}
