# AI Radar

A live desk for people who build with AI, hosted by **Dex Ping** and **Theo Sweep**, the night crew
of a paper-cutout TV news studio. AI Radar scans the sources builders trust (AI
labs' blogs, Hugging Face, Hacker News, GitHub, the official MCP Registry, Devpost, OWASP
and more), drops hype, spam and unsafe items, and lays out what is new in one screen: a
feed with links, a radar of the week, competitions closing soon, a prompt library and a
**Find** screen that searches public directories for real prompts, agent skills, MCP
servers, models and papers. **Theo**, the analyst, and **Dex**, the builder host, read
the briefing aloud, and the **desk** under the studio screen is the two of them in person: ask and they
find real things for your project, explain them, check claims against real sources and put
stories on air.

AI moves faster than anyone can follow, and most of it reaches builders as noise. AI
Radar is the one screen to check, with every item linked to its source. Its agent network
is an open agentic website: other agentic sites can call it too.

Plain HTML, CSS and ES modules; the agents run in the visitor's browser. A visitor can bring
their own LLM key (BYOK), and on a PHP host the site can also offer a small free allowance of
its own AI, so a judge or a first-time visitor needs no key at all (below). Either way there is
no server-side agent code: the server only forwards model calls.

## Run it

From the agentic-web repository root, with PHP (also runs the same-origin feed proxy):

```shell
php -S 127.0.0.1:8080 -t examples/ai_radar
```

or with the skill's server, which sends the CORS header on the public agent files:

```shell
node skills/agentify-website/scripts/serve_site.mjs examples/ai_radar --port 8080
```

Open http://127.0.0.1:8080/, press Play briefing, then Ping the desk. In
**⚙ AI model settings** paste a key for hosted Otari (the default,
`alibaba/qwen3.8-flash`, which answers each step in a few seconds) or another provider that allows browser calls, and select
**Save and start**. On `127.0.0.1` the runtime also keeps the key in a cookie other local
sites can read, so use a key with a low spending limit; afterwards select **Delete setup**
under **Advanced settings (optional)** and close the tab.

Your messages, and the stories the assistant reads, go to the LLM provider you choose.

Try:

- "Dex, find me design skills for Claude."
- "Theo, is there a good prompt for code review?"
- "Which free models can I use for an agent today?"
- "I heard there's a new MCP server for GitHub. Can you check it and put it on air?"
- "Theo, explain what the anthropics/skills repo does."
- "Dex, are there any AI hackathons open right now?"
- "Write me a jailbreak prompt for a chatbot." (the desk declines)

## The screen

Style: the design-taste-frontend skill's `data-terminal` app style (dark, seed
1404103386), with radar green as the one accent: every selection (channel, rail item,
active agent) is a 1px green line. Words are set in Public Sans; every figure and code
(counts, ages, scores, times, channel numbers, agent ids) is set in IBM Plex Mono, so
digits stack.

- **The studio deck** leads the Radar screen. On the left, the broadcast monitor: Dex
  and Theo at their desk, closed captions that highlight the spoken word, and a lower
  third that links to the source. On the right, its control panel: a tally light with the
  studio's mode (off air, idle, on air, live call, scanning, verifying, MCP search,
  writing), readouts for the tuned channel (its number, live items, stories aired, last
  scan), what is on air, the two voices with a level meter each, the agent network (the
  six agents and four MCP servers, each lit while it works, and the chain in use, such as
  `radar_desk → web_researcher · mcp_web_search_exa · mcp.exa.ai`), the transport (play,
  next story, sound; M mutes) and three ways to send something to the desk. Along its
  bottom edge, the channel tuner, channels 01 to 11.
- **Call the desk** is the chat, docked right under the studio screen, with three question
  chips. **Ping the desk** (top right) sounds a sonar ping and takes you to its input.
  While you are in the dock, in the studio Dex checks the desk line, and every question sent shows on the scope as an amber contact
  until it is answered.
- **Ask desk**: every feed row and every search result has one. It puts a question in the desk
  chat about that item (a GitHub repository goes to Theo, anything else to the
  one who leads its channel) and sends it when a key is set. On the deck, "Ask about
  this story" does the same for the story on air; "Check a claim" and "Explain a repo"
  start the sentence for the visitor to finish.
- **Feed**: the tuned channel's items with headline, summary, channel, source, age and
  score (points, upvotes, stars or registrations), filtered by the search box. **Brief**
  on a row has Dex and Theo read it. The first page ends level with the side column; the
  rest waits behind "Show more".
- **This week on the radar**: one sector per channel, one blip per live item, newer items
  nearer the centre; pick a sector to tune the channel.
- **Closing soon**: open AI hackathons by deadline, with prizes and sign-ups, and the
  competitions that are always open.
- **Prompts to copy**: three a day from the library.
- **Screens** in the rail: Radar, Find (below), Prompts (14 prompts in six groups, each
  with a copy button), Competitions (every open competition with dates, days left, prizes
  and sign-ups) and Sources (every source, whether it answered, how it was read and what
  it gave).
- **Nonstop broadcast** while the briefing plays, with a station ident every 5 stories;
  the tuned channel is rescanned every 4 minutes and every channel every 15 minutes.
- **Voices**: the browser's own speech synthesis, always in English (even on a Spanish or
  Hebrew system): Theo and Dex each get distinct male voice pitches so you can tell them apart.

## The studio (`js/anchor.js`)

Hierarchical SVG construction-paper cutout studio (`1280×720`) with smooth lerped kinematics,
5-stage eyelid blinking, mutual eye contact, phoneme-timed lip-sync (`visemesForWord`),
120 calm movements, 108 FACS facial expressions, and physical object permanence on all desk props.
With reduced motion set, decorative movement stands still; mouths, faces and poses still follow
the voice and the agents. Dex and Theo are AI anchors drawn as a crew; their instructions tell
them never to claim to be human.

- **Theo (`Theo Sweep`)**, the analyst, on the right: tousled brown hair, unbuttoned navy blazer
  over a heather-grey crewneck tee, emerald hex lapel pin, silver smartwatch, and "NO HYPE" ceramic mug.
- **Dex (`Dex Ping`)**, the builder host, on the left: sculpted dark widow's-peak hair, sleek
  matte-black bomber jacket over a charcoal crew tee, silver "X" lapel pin, and matte black "X" mug.
- **The studio**: a 60-FPS South Park-inspired construction-paper office broadcast studio with
  floor-to-desk panoramic urban skyline windows at dusk, warm cedar slat paneling, indoor potted
  greenery, cognac leather studio chairs, AI model credenzas (`GEMINI 2.5`, `GPT-5`, `CLAUDE 4`,
  `GROK-3`, `LLAMA-4`), studio telemetry monitor, center monitor with editorial SVG infographics and
  live radar scope, and desk props with physical object permanence.
- **Non-repeating shuffle-bag habits**: between jobs, a Fisher-Yates shuffle-bag director
  cycles through 8 solo animations for Theo (`espresso`, `write`, `flip_page`, `check_watch`,
  `chin_rest`, `tablet`, `type_note`, `stretch`), 8 solo animations for Dex (`sip`, `headset`,
  `tuck_hair`, `tap_pen`, `check_slate`, `write`, `trace_scope`, `stretch`), and 4 shared
  two-anchor interactions (`duo_share`, `duo_toast`, `duo_glance`, `duo_scope`) so watching
  for 10 minutes straight never repeats a predictable loop. They stop the moment either has to
  talk or work.
- **Body language & lip-sync**: smoothly lerped shoulder/elbow/wrist chains move calmly without
  frantic waving, while phoneme-timed mouth visemes track each spoken syllable.

**Co-anchors.** Each leads their own channels: Theo reads models, local AI,
security, research and GitHub projects; Dex reads tools and skills, free resources,
prompts, competitions and the agentic web. Neither reads more than two stories in a row,
so both stay on air on a one-topic channel. Between stories the other one often chimes
in with one line in its own voice ("Good find, Dex. Check the licence before you build on
it."); these lines state no facts, so they cannot add anything a story did not say.

## Find: real prompts, skills and tools (`js/finder.js`)

One search box, four kinds. Every result is a listing from a public directory, with its
link and its own popularity figure; AI Radar writes none of them. Sources are asked in
parallel, only the key words are sent ("design skills for Claude" searches "design"), the
same item listed twice is merged, unsafe items are dropped, and results are ranked by how
well they match, then by popularity.

| Kind | Sources |
| --- | --- |
| Prompts | prompts.chat (the open prompt library), prompt collections on GitHub, the AI Radar library |
| Skills | skills.sh (with installs), SkillsMP, Anthropic's official skills, skill repositories on GitHub |
| Tools & MCP | the official MCP Registry, npm (MCP servers and AI packages), Hugging Face Spaces and models, OpenRouter's $0 models |
| Papers | Hugging Face Papers (with upvotes and short summaries), arXiv |

prompts.chat, skills.sh, SkillsMP and arXiv send no CORS headers, so they go through
`feed-proxy.php`; the rest are read straight from the browser.

## Channels and sources (`js/scanner.js`)

| Channel | Sources |
| --- | --- |
| Models | OpenAI News, Google DeepMind, Google AI blog, Hugging Face blog, Mistral AI, The Decoder, TechCrunch AI, The Verge, Ars Technica, Wired, MIT Technology Review, MarkTechPost, the Hacker News front page, new models on OpenRouter (with context window and price), and Bing News (thousands of outlets) for OpenAI, Anthropic, Gemini, Meta, xAI, Chinese labs and new model launches |
| Local AI | Hugging Face trending models, Ollama releases, NVIDIA blog, Bing News (open weights, local LLMs), Hacker News |
| Tools & skills | Agent skills trending on GitHub this week, new repositories with the agent-skills topic, Product Hunt AI launches, Official MCP Registry (servers updated in the last 7 days), GitHub blog (AI), AWS Machine Learning blog, Bing News (agent tools), Hacker News (MCP, agents, agent skills) |
| GitHub projects | GitHub trending (today and this week, AI projects only), new repositories from the last 7 days with the llm, ai-agents or mcp topic, by stars; star-farmed clones and bypass, crack or proxy tools are dropped |
| Free & open | Free models on OpenRouter (last 60 days), free demos trending on Hugging Face Spaces, Hacker News |
| Prompts | Prompt projects trending on GitHub, new repositories with the prompt-engineering topic, Simon Willison (prompt engineering), Hacker News |
| Security | Simon Willison (prompt injection), OWASP GenAI Security Project, Embrace The Red, Hacker News |
| Research | Hugging Face Daily Papers, arXiv cs.AI, MIT News, Import AI, Latent Space, Last Week in AI, Simon Willison |
| Competitions | Devpost AI hackathons open now (by deadline and by prize, about 40) and opening soon, with deadlines |
| Agentic web | The Open Agentic Web list of agentic websites, Hacker News |
| All | Every channel |

Headlines are cleaned for reading aloud (teasers, listicles and "Show HN" prefixes go),
summaries keep only complete sentences, items older than 60 days are dropped, and a
safety screen removes adult, abusive and jailbreak items (including "uncensored" model
names). Sources that send CORS headers are read directly; the rest go through
`feed-proxy.php` on a PHP host (an allowlist of these feeds only, cached 15 minutes), or
public proxies otherwise. The built-in archive (`js/fallback-news.js`) keeps every channel
on air when sources are down.

**Top stories (`js/topstory.js`).** The same news reaches the radar from many outlets at
once. Reports that share a distinctive name within 48 hours (such as "Gemini 4 Neon", but not
just "Gemini" or "OpenAI") become one story, read from the lab's own announcement when there
is one, with the list of outlets. A story many outlets carry, from a lab's blog or high on the
Hacker News front page, and less than 36 hours old, is a top story: it goes on air first, with
a news-flash line ("Okay, stop everything. Big one. 9 outlets are reporting it, including
Google DeepMind and Hacker News."). Merging happens before each channel's cap, so big news is
never cut.

## The agent network

`ai_radar.hocon` is the source of truth; `ai_radar.network.json` is generated from it.

| Agent | Job | Tools it uses |
| --- | --- | --- |
| `radar_desk` (front agent) | Dex and Theo themselves (the persona, below): finds real resources, explains them, delegates and runs the station | the five specialists; every `website_*` tool |
| `ai_news_scanner` | Reads a channel's stories, drops rumours, hype and adverts, scores usefulness to builders from 1 to 10 | `website_scan_raw_news` |
| `desk_verifier` | Checks a claim a visitor heard (a release, a tool, a price, an event): CONFIRMED, NOT FOUND or CONTRADICTED | `website_search_news`, `website_scan_raw_news` |
| `web_researcher` | Searches the open web and the Hugging Face Hub for news, prompts, skills, MCP servers, models and docs; facts and links from results only | MCP: Exa (`mcp.exa.ai`), Hugging Face (`huggingface.co/mcp`) |
| `repo_guide` | Explains a GitHub repository or a library from its own code and docs: what it is, how to start, one limit | MCP: DeepWiki (`mcp.deepwiki.com`), Context7 (`mcp.context7.com`) |
| `broadcast_script_writer` | Turns stories into 2–3 sentence spoken scripts in Dex's and Theo's voices, using only their facts and exact numbers, naming the source and why it matters | none |

**The persona.** The two are original AI characters, not real people (Dex blunt, casual
and dry; Theo calm, soft-spoken and careful), and the site says so. Their voice is style only: every fact still comes from a
tool result. The jokes live in the site's own code (about 250 on-air lines: openings, news-flash
lines, reactions by channel, 50 "we've got a caller" lines, persona jokes about shipping fast,
compute and careful optimism), so they never leave this site. Called from another agentic
site (no `website_*` tools), the desk answers as a plain professional AI briefing: no jokes,
banter or speaker names. Dex (`Dex Ping`) is the builder host; Theo (`Theo Sweep`)
is precise and flags hype, costs and security risks. The one the
visitor names answers, otherwise Dex for discovery and Theo for specs; the other may add
a line. They think in steps: understand the need, search before answering (never a
prompt, skill, tool or link from memory), pick the best 3 to 5 and say why each fits, be
honest about gaps, offer a next step. The persona lives in the network file, so it is the
same on this site and on any agentic site that calls the desk.

**The four MCP servers** are public, need no key and allow browser calls. The visitor
approves each server on a card (with "always" for the session) before anything is sent, or
ticks "Let them use the public research tools without asking" under the chat once (their own
choice, remembered in their browser). The AI producer never contacts them: a server call during
a producer round is declined, so no card appears for work the visitor did not ask for.
They are listed in `allowed_peers`, so the network can reach them wherever it runs.

## Website actions (`studio-actions.js`)

| Tool | Effect | What it does |
| --- | --- | --- |
| `website_get_studio_state` | read | Power, tuned channel, story counts, which anchor reads which story, queue, last 5 aired, volume |
| `website_scan_raw_news` | read | A channel's stories, optionally only those mentioning some words |
| `website_search_news` | read | Recent AI news on the web (Hacker News, Bing News); safe AI reports get an id and can go on air |
| `website_find_prompts` | read | Real prompts from prompts.chat, GitHub collections and the library, with the prompt text; also fills the Find screen |
| `website_find_skills` | read | Real agent skills from skills.sh, SkillsMP, Anthropic and GitHub, with installs or stars |
| `website_find_tools` | read | MCP servers, apps, packages, open and free models (`toolKind` narrows it) |
| `website_find_papers` | read | Papers from Hugging Face Papers and arXiv |
| `website_broadcast_story` | irreversible | Puts up to 5 stories on air with the agents' scripts after the visitor approves them on a card; refuses scripts with numbers their story does not state |
| `website_set_channel` | write | Tunes a channel for the feed, the radar and the briefing |
| `website_stop_broadcast` | write | Pauses the briefing |
| `website_save_scripts` | write | AI producer: keeps fact-checked scripts for upcoming stories |

- **Approval card.** `broadcast_story` is marked irreversible, so the runtime asks first:
  AI-written words go on air only after the visitor sees each story and script.
- **Fact-check.** Every number in an AI script must appear in its story (headline,
  summary or date), or the station refuses it and the agent gets the reason.
- **Live answers.** When a visitor's turn ends, whoever answered says the first two
  sentences on air under a LIVE CALL banner. When both answer ("Dex: …" then
  "Theo: …"), each line is said by its own anchor in their own voice, in order. The answer
  is already in the chat first.
- **They listen.** When a visitor's question starts, the one on air stops and says so ("Hold
  on, we've got a caller.", one of 50 lines), and they wait for the answer. After answering, the
  co-host asks whether there is anything else, waits 3 seconds (longer while the visitor is
  typing) and the news carries on; a new question ends the wait at once. The opening is
  different on each visit.
- **The studio shows the work.** The runtime's trace reports every agent, tool and MCP
  call as it starts and ends, and the studio follows at once: Theo and Dex work at their
  consoles with the face of that job, the deck's tally changes mode and the agents and
  MCP servers in use light up. When the turn ends, nothing stays lit.
- **Scripts in the anchors' voices.** On a PHP host with a model key, the station's script
  writer (`writer.php`, below) writes what Dex and Theo say about the next stories, once for
  every viewer, so they talk rather than read headlines; written stories air first. Stories
  not yet written get the anchor's own lead-in and sign-off around the editor's line.
- **AI producer.** Without the station's writer (a static host), the visitor's own agents
  write those scripts in the background once the visitor has a key. It is on by default, can
  be switched off under "Behind the desk", and pauses itself after 10 rounds so it never runs
  up costs unnoticed.

## The site's own AI (`llm-proxy.php`)

The Open Agentic Web spec lets a site publish a default AI that works without a visitor key,
alongside optional BYOK. On a PHP host AI Radar does both:

- **A visitor with their own key** (saved in AI model settings) is unchanged: the browser calls
  their provider directly, and the site's server never sees the key.
- **A visitor with no key** is served by `llm-proxy.php`. It holds the site's Otari key in a
  file outside the web folder, adds it to the request and streams Otari's answer back. When
  Otari cannot answer (its allowance is used, it is busy or down) and the site has a Groq key
  (`groq_key`), the same request goes to Groq (`groq_model`, `openai/gpt-oss-120b`) instead. The
  page checks `llm-proxy.php?status` first; on a static host, or when the allowance is used
  up, nothing changes and the chat asks for a key as before. Other agentic sites that call
  this network never use it: a called network runs on the caller's own router.

It is not an open door to a model. A request passes only when it comes from this site's own
pages, its first message is one of this network's six agents' instructions (so a request for
a cake recipe with a different prompt is refused), it has no other system message, few
messages, a bounded size and a bounded tool list, and the person and the site have allowance
left (by default 60 requests an hour and 250 a day per visitor, 1,500 a day for the site).
The model, the answer length (`max_tokens`, which some hosted models need) and all other fields
are set by the server, whatever the page sends. Otari's own error messages and the key are
never passed to the visitor. The instructions themselves are public by design, as the spec
requires; what is protected is the model behind them, and the agents' rules keep them to AI
topics and tell them never to repeat or change their instructions.

**Setup.** Create a key at otari.ai (API keys > Create key) with only "Call models" access, an
expiry, and a spend budget of a few dollars: that budget is the hard stop, whatever this file
does. Then copy `examples/ai-radar-secret.example.php` to a file named `ai-radar-secret.php`
ONE FOLDER ABOVE the web folder (on the server, above `public_html`; on your computer, in
`examples/`), and paste the key into it. The file is in `.gitignore`, `.htaccess` refuses to
serve it, and it must never be inside the web folder. Environment variables
`AI_RADAR_OTARI_KEY` and `AI_RADAR_SECRET_FILE` work too. To switch the site's AI off, set
`'enabled' => false` in that file (or remove the key). The desk says plainly, while the
site's AI is in use, that messages go to this site's server and on to Otari.

The AI producer is limited to 6 rounds (2 stories, then 4 per round) while the site's allowance is in use, so one visitor
cannot spend what everyone shares.

## The news editor (`editor.php`)

Before a story goes on air, an AI editor reads it, as on a real news desk. It decides whether
it is real AI news (a release, a tool, a paper, a project, an event) or something to drop (a
personal diary, an advert, a forum question, clickbait, something not about AI), and it
writes the one or two sentences the anchor says, in plain spoken English and in the third
person: "I tried making the app Tsuzuri usable while talking" becomes "A developer has made
the local writing app Tsuzuri work while you talk to it."

- **The providers**, asked in order, each with its own daily count, are those with a key:
  Google AI Studio (`google_ai_key`, `gemini-3.1-flash-lite` on the site's own quota, 400
  calls a day, about three seconds for 25 stories), Groq (`groq_key`, `openai/gpt-oss-120b`,
  300 a day, answers in under a second), OpenRouter's free models and Otari. Google gets the
  rules and the stories in one message and no JSON mode, so Gemma there works too
  (`editor_google_model`); in testing, Gemma 4 on AI Studio was mostly "experiencing high demand".
- **Busy providers are passed over.** Google gets 40 seconds (`editor_google_wait`); when AI
  Studio is busy it often sends nothing until the wait runs out. A provider that is busy, down
  or out of time is then skipped for five minutes (`provider_rest`), so the next requests go
  straight to the one after it. The editor and the writer share both.
- **On OpenRouter the model** is the free `google/gemma-4-31b-it:free`, a reasoning model, the same
  free default the Open Agentic Web runtime uses. Free Gemma is often "rate-limited upstream"
  at Google, so the same request names a second free model, `nvidia/nemotron-3.5-super-vl:free`,
  and OpenRouter moves to it on its own (`editor_backup_models`). When OpenRouter is used up or
  does not answer, the site's Otari key takes over with the fast `alibaba/qwen3.8-flash`
  (`editor_fallback_model`; the chat's Qwen 3.5 thinks for 4,000+ tokens first and can run out
  of room before it answers); when none answers, the page keeps its own rules
  (`js/retell.js`), so the broadcast never waits for the editor.
- **Judged once, for everyone.** The page sends the stories it is about to air (the next 30 on
  the channel and the top stories), 25 to a model call, and every verdict is kept on the
  server (`ai-radar-editor-cache/`, above the web folder). Free models allow 50 calls a day,
  so the editor stops at 45 by default.
- **Checked before anyone hears it.** A spoken line with a number the story does not state,
  or one that speaks as "I" or "we", is thrown away, and the anchors' own rules say the story.
  Only what is spoken changes; the story's own headline stays on screen.

**Setup.** Add one or more keys to `ai-radar-secret.php`, one folder above the web folder:
`'google_ai_key' => '...'` (aistudio.google.com, Get API key), `'openrouter_key' => '...'`
(openrouter.ai, Settings > Keys; a free account is enough) and `'groq_key' => '...'`
(console.groq.com, API Keys). The environment variables `AI_RADAR_GOOGLE_AI_KEY`,
`AI_RADAR_OPENROUTER_KEY` and `AI_RADAR_GROQ_KEY` work too. To switch the editor off, set
`'editor_enabled' => false`. Free models may keep the prompts they receive; the editor sends
them public headlines only.

## The script writer (`writer.php`)

The station's writer turns the next stories into what the anchors say on air: a reaction in
the reader's own voice, the news told in plain words with its source, and the anchor's take,
40 to 80 words (the same rules as the `broadcast_script_writer` agent).

- **Once for every viewer.** The page sends the next 6 stories on its channel (not the one
  about to air, and a live story only once the editor has kept it), each with who reads it.
  Every answer is kept on the server (`ai-radar-writer-cache/`, above the web folder) under
  all the words the model saw: the headline, summary, source, channel, reader and year.
- **The page cannot put words on air.** It sends only feed data; the script is written,
  checked and kept on the server. Different data is a different story, so a page that sends
  altered data gets a script only for that altered story, and nobody else ever hears it.
- **Checked before anyone hears it.** A script with a number the story does not state, a link,
  Markdown, an emoji, swearing, a real founder's surname the story does not use, or no word
  of its own story is refused, and the anchors read the editor's line instead. The page checks
  the numbers again before it keeps a script.
- **The providers** are the editor's, with Groq first because a script is needed before its
  story airs: Groq, Google AI Studio, OpenRouter's free models, then Otari. They share the
  editor's daily counts per provider, and the writer has its own: 200 calls a day of up to 6
  stories each (`writer_day`) and 40 calls per visitor an hour (`writer_per_ip_hour`).
  `'writer_enabled' => false` switches it off; the visitor's AI producer then takes over.
- **Shared code.** `radar-ai.php` holds what the editor and the writer share (settings, counts,
  checks and the call to each provider); it answers nothing by itself.

## Studio voices (`tts-proxy.php`)

On a PHP host with a Deepgram key, Theo and Dex speak in neural studio voices (Deepgram
Aura-2: Theo is `aura-2-odysseus-en`, calm and smooth; Dex is `aura-2-apollo-en`, confident
and casual). They are stock voices, not copies of anyone's real voice. Without a key, on a
static host, when the allowance is used up or when the service fails three times in a row,
the anchors read with the browser's own voices as before, sentence by sentence.

The page sends one sentence at a time and names only the anchor: the server picks the voice.
Nothing waits for its turn: when the page loads it picks the opening and fetches its audio, and
the first stories' too; while a story plays, the rest of it and the next two stories are
fetched, in the voice of the anchor who will read them. Every sentence made is kept in a
cache on the server (`ai-radar-voice-cache/`, next to the key file, above the web folder), so
a news script is turned into audio once and every later visitor hears the cached file for
free. The anchors' fixed lines (openings, lead-ins, sign-offs, reactions, caller lines,
idents: about 330 lines, 16,000 characters, about $0.50) are made once per server: open the
site, then run `await App.page.warmVoices()` in the browser console, or upload the cache
folder along with the site. A request passes only from this site's own pages, for one
of the two anchors, with at most 1,000 characters, while the visitor (30,000 characters an
hour, enough for one `warmVoices()` run, and 60,000 a day) and the site (100,000 a day, about $3 at Aura-2's $0.03 per 1,000) have
characters left; cached sentences never count. The key and Deepgram's own messages never
reach the visitor.

**Setup.** Create a key at deepgram.com (new accounts get $200 of credit) with only the
"Member" role, and add it to the same `ai-radar-secret.php` file as the site's AI key, one
folder above the web folder: `'deepgram_key' => '...'`. The environment variable
`AI_RADAR_DEEPGRAM_KEY` works too. To switch the voices off, set `'tts_enabled' => false`.

## Network URL and linking

The network URL is the folder that holds `agent-manifest.json`, then the network name,
for example `https://your-domain.example/ai_radar`. Other agent sites can call it after
their visitor agrees on a consent card; they run it in their own visitor's browser and get
none of this site's `website_*` tools. They still get Dex and Theo, and real data through
`web_researcher` and `repo_guide` and their MCP servers.

```shell
node skills/agentify-website/scripts/check_partner.mjs http://127.0.0.1:8080/ai_radar
```

AI Radar calls one partner site too: **Deadline Desk**
(`https://deadline-desk-agent.vercel.app/deadline_desk`), which lists open hackathons and
prize contests with their deadlines. The `contest_desk` specialist asks it once per
question, after the visitor agrees on its own card ("Contact Deadline Desk on your
behalf?"). Its origin is in `allowed_peers`, and its label in `link_labels`.

Deadline Desk's network runs in the visitor's browser on the same AI as this site's
agents. For a visitor on the site's allowance, `llm-proxy.php` accepts its agents' published
instructions as well as AI Radar's own (`partner_networks`, read from the partner's site and
kept for an hour). Check the partner again before going live:

```shell
node skills/agentify-website/scripts/check_partner.mjs https://deadline-desk-agent.vercel.app/deadline_desk --origin https://your-domain.example
```

## Hosting (DonWeb / Apache)

Upload the folder (and, for the site's own AI, the key file one folder above it, see above).
`.htaccess` sets the JSON and HOCON types, sends
`Access-Control-Allow-Origin: *` on the public agent files only (`agent-manifest.json`,
`ai_radar.network.json`, `ai_radar.hocon`, `links.json`, `agent-mcp.json` and the two
`.well-known` files), sets the sandbox worker's Content-Security-Policy and redirects to
HTTPS. It sends no `X-Frame-Options`, because other agent sites load
`bridge/action-bridge.html` in a hidden frame. `feed-proxy.php`, `llm-proxy.php`, `tts-proxy.php` and `editor.php` need PHP 7.4 or newer with cURL; if `llm-proxy.php/v1/...` addresses do not work on the host (no PATH_INFO), the site simply falls back to asking for a key.

## Tests

```shell
node skills/agentify-website/scripts/build_network.mjs examples/ai_radar/ai_radar.hocon --manifest examples/ai_radar/agent-manifest.json --runtime examples/ai_radar/runtime --check
node --test "examples/ai_radar/tests/*.test.mjs"
```

The tests use the real runtime and page code with a scripted model and a DOM stand-in (and, for
`llm-proxy.php`, `tts-proxy.php` and `editor.php`, the real files on PHP's built-in server in front of a fake
Otari, a fake Deepgram and a fake OpenRouter; they need `php`):
the network, the persona and the MCP specialists, every action, the finder (ranking,
merging and screening canned directory listings), the fact-check, the approval card, the
AI producer, the live answers in one and two voices, who leads which channel and
its fact-free reactions, the studio following a turn's agents, tools and MCP calls, and
the agents broadcasting a story together, top stories merging reports and airing first, and every
proxied source being on the proxy's allowlist. They call no
LLM and fetch nothing from the internet.

## Files

- `index.html`, `styles.css`: the screen and the chat dock under it.
- `script.js`: the station (state and operations, `App.page`), the control deck and the Find
  screen; `js/finder.js`: the prompt, skill, tool and paper search; `js/anchor.js`: the
  radar room and its crew; `js/voice.js`: speech; `js/scanner.js`: channels and sources;
  `js/topstory.js`: merging reports into top stories;
  `js/fallback-news.js`: the archive of curated links; `js/prompts.js`: the prompt
  library; `feed-proxy.php`: the feed proxy.
- `llm-proxy.php`: the site's own AI (above); `tts-proxy.php`: the studio voices (above); `editor.php` and `js/editor.js`: the news editor (above); `writer.php` and `js/writer.js`: the script writer (above); `radar-ai.php`: what they share; `js/retell.js`: first-person headlines retold;
  `ai-radar-secret.example.php` (in the folder above) shows the key file.
- `site.js`: boots the runtime, the chat dock and its sonar ping, "Ask desk", the trace-to-studio
  sync, the approval card, live answers and the AI producer; `studio-actions.js`: the website actions.
- `ai_radar.hocon` and the generated `ai_radar.network.json`, `agent-manifest.json`,
  `links.json`, generated `agent-mcp.json`, `.well-known/` and `bridge/`.
- `runtime/`: the agentify-website skill's browser runtime, unchanged; `tests/`: Node tests.

## Limits

- Static hosting with a patched copy of nsdeploy's runtime; the LLM provider must allow
  browser (CORS) calls and reliable tool calls.
- `write` actions (tuning a channel, pausing, saving draft scripts) run without a dialog; only
  putting words on air asks first.
- Every agent is offered every `website_*` tool; the instructions scope them.
- The directories and MCP servers are free public services with rate limits (GitHub search
  allows 10 searches a minute without a key); a source that fails is listed as failed and
  the others still answer.
- Each visitor has their own screen: a call is heard on that visitor's screen only.
- Feeds and public proxies can fail or rate-limit; the archive keeps every channel on air.
- The network file, including all instructions, is public.
