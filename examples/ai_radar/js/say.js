// How the anchors' voices are given the text: technical names in words they can say.
//
// A voice spells a word with dashes between its parts one character at a time: Deepgram's
// formatting guide for its Aura-2 voices gives "J-O-H-N" as the way to make it spell a name.
// So "GPT-OSS-20B" came out as G, P, T, O, S, S, 2, 0, B. Here a technical name is said part
// by part instead, the way people say it: "GPT OSS 20 B". Only the words sent to the voice
// change: the captions on screen keep the text as written, and speechText() says which written
// word each spoken word belongs to, so the captions follow the voice.
//
// Ordinary words stay as they are: hyphenated words (state-of-the-art, Alt-Tab), dates, money,
// units (16GB, 4K, 10x), ordinals, and capitals the voices already say well (GPT, NASA).

// Acronyms that are written in lower case in model names; said as letters in capitals.
const ACRONYMS = new Set(["ai", "api", "apis", "asr", "cli", "cpu", "gpt", "gpu", "gpus", "llm", "llms", "mcp", "ocr", "oss", "sdk", "sdks", "tpu", "tts", "ui", "vlm", "vlms"]);
// Only inside a name: "gemma-3-27b-it" is instruction-tuned, not the word "it".
const NAME_ONLY = new Set(["it"]);
// Lower-case company names in model ids ("openai/gpt-oss-20b"), said the way they are known.
const NAMES = { openai: "OpenAI", deepseek: "DeepSeek", huggingface: "Hugging Face", mistralai: "Mistral AI" };

// A name with dashes, underscores or slashes between its parts: gpt-oss-20b, Llama-3.1-8B.
const SEPARATED = /^[A-Za-z0-9][A-Za-z0-9.]*(?:[-_/][A-Za-z0-9][A-Za-z0-9.]*)+$/;
// A number with a unit or suffix (16GB, 4K, 10x, 1st, 1990s, 5pm): the voices read these well.
const UNIT = /^\d+(?:\.\d+)?[A-Za-z]{1,3}$/;
// A model size: 20B, 1.5b. Said as a number and the letter.
const SIZE = /^\d+(?:\.\d+)?[bB]$/;

/**
 * One part of a name, said in words: letters and numbers that touch are said apart
 * ("A22B" → "A 22 B", "Qwen3" → "Qwen 3"), and a short acronym or a lone letter is said as
 * capital letters ("gpt" → "GPT", "xl" → "XL", "4o" → "4 O").
 */
function sayPart(part) {
  const named = NAMES[part.toLowerCase()];
  if (named) return named;
  return part.replace(/([A-Za-z])(?=\d)|(\d)(?=[A-Za-z])/g, "$1$2 ").split(" ").map((word) => {
    const lower = word.toLowerCase();
    // In lower case only: "LLMs" is said well as written.
    if ((ACRONYMS.has(lower) || NAME_ONLY.has(lower)) && !/[A-Z]/.test(word.slice(1))) return word.toUpperCase();
    if (/^[a-z]$/.test(word)) return word.toUpperCase();
    // Up to four letters and no vowel is an acronym, not a word: "xl", "mp", "hf".
    if (/^[a-z]{2,4}$/i.test(word) && !/[aeiouy]/i.test(word)) return word.toUpperCase();
    return word;
  }).join(" ");
}

/** A written word without its punctuation, said in words; the same word when nothing changes. */
function sayCore(core) {
  if (SEPARATED.test(core) && /[A-Za-z]/.test(core)) {
    const parts = core.split(/[-_/]/);
    const technical = /\d/.test(core) || /[A-Z]{2}/.test(core) || parts.some((p) => ACRONYMS.has(p.toLowerCase()));
    return technical ? parts.map(sayPart).join(" ") : core;
  }
  if (ACRONYMS.has(core.toLowerCase()) && !/[A-Z]/.test(core.slice(1)) && core !== core.toUpperCase()) return core.toUpperCase();
  if (SIZE.test(core)) return `${core.slice(0, -1)} B`;
  // A word of letters and digits that is not a number with a unit or a web address: "H100",
  // "A3B", "Qwen3" (but not "16GB" or "13F.ai").
  if (/^[A-Za-z0-9.]+$/.test(core) && /[A-Za-z]/.test(core) && /\d/.test(core) && !UNIT.test(core) && !/\.[A-Za-z]{2,}$/.test(core)) return sayPart(core);
  return core;
}

/** One written word (between spaces), with its punctuation and a possessive "'s" kept. */
function sayWord(word) {
  const lead = /^[("'“‘[«]*/.exec(word)[0];
  const rest = word.slice(lead.length);
  const tail = /(?:['’]s)?[)\]"'”’.,;:!?…»]*$/.exec(rest)[0];
  const core = rest.slice(0, rest.length - tail.length);
  if (!core) return word;
  const said = sayCore(core);
  return said === core ? word : lead + said + tail;
}

/**
 * The text as the voice should get it, and where each spoken word is written.
 * :return: {text, source}: source(i) is the offset, in the written text, of the word that the
 *   spoken text's character i belongs to.
 */
export function speechText(written) {
  const text = String(written ?? "");
  let spoken = "";
  const marks = [];   // [where a word starts in the spoken text, where it starts in the written one]
  let last = 0;
  for (const match of text.matchAll(/\S+/g)) {
    spoken += text.slice(last, match.index);
    marks.push([spoken.length, match.index]);
    spoken += sayWord(match[0]);
    last = match.index + match[0].length;
  }
  spoken += text.slice(last);
  const source = (i) => {
    let at = 0;
    for (const [said, wrote] of marks) {
      if (said > i) break;
      at = wrote;
    }
    return at;
  };
  return { text: spoken, source };
}

/** The text as the voice should get it: "GPT-OSS-20B is out." → "GPT OSS 20 B is out." */
export function forSpeech(written) {
  return speechText(written).text;
}
