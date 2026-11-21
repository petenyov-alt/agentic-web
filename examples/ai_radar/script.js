// AI Radar: page state and operations.
//
// The station is on air nonstop. Once the visitor enters, the anchor reads story after
// story on the tuned channel: fresh stories first, newest scans first. The scanner
// rescans the tuned channel every few minutes and every channel in the background, so
// new stories keep arriving. When everything on the channel has aired, it reruns the
// stories that aired longest ago until new ones come in.
//
// One StudioPage object owns all state. The page's own controls call its methods, and
// the agentified version (Phase 2) will import `App` from this same URL and call the
// very same methods. Operations refuse bad input with {ok: false, reason, field}.

import { PixelAnchor, STUDIO_MODES, modeOf } from "./js/anchor.js";
import { PROMPTS, PROMPT_GROUPS } from "./js/prompts.js";

// The page also loads under Node for the tests, with a DOM stand-in and no canvas,
// audio or network. Drawing, sound and feed scanning only run in a browser.
const BROWSER = typeof window !== "undefined";
const SILENT_ANCHOR = {
  setState() {}, setSpeaker() {}, word() {}, setMode() {}, setWork() {}, setHail() {}, setScene() {},
  setExpression() {}, react() {}, nextHabit() { return "espresso"; }, triggerDuo() {}, names: ["Theo", "Dex"],
};
import { VoiceOver } from "./js/voice.js";
import { rankStories, reportingLine } from "./js/topstory.js";
import { retell } from "./js/retell.js";
import { NewsEditor } from "./js/editor.js";
import { ScriptWriter } from "./js/writer.js";
import { Fresh } from "./js/fresh.js";
import { findPrompts, findSkills, findTools, findPapers, TOOL_KINDS } from "./js/finder.js";
import { scanChannel, searchNews, archiveStories, TOPICS, TOPIC_IDS, SOURCES } from "./js/scanner.js";

/**
 * The numbers a text states, normalised with their scale: "3,600" → "3600", "1.5" stays "1.5",
 * "v0.4.2" stays one number "0.4.2", "$12M" and "12 million" → "12m", "30%" and "30 percent" → "30%".
 * Used to check that a script states no number its story does not (so "$12B" for "$12M" fails).
 * The same rule as editor_numbers() in editor.php.
 */
const SCALE = { thousand: "k", million: "m", billion: "b", trillion: "t", percent: "%" };
export function numbersIn(text) {
  const found = String(text).matchAll(/\d[\d,]*(?:\.\d+)*(?:\s?(%|[kmbt](?![a-z])|thousand|million|billion|trillion|percent))?/gi);
  return new Set([...found].map(([n, unit]) => {
    const number = n.slice(0, unit ? n.length - unit.length : n.length).trim().replace(/,/g, "").replace(/\.$/, "");
    const plain = /^\d+\.\d+$/.test(number) ? number.replace(/\.0+$/, "") : number;
    const u = (unit || "").toLowerCase();
    return plain + (SCALE[u] ?? u);
  }));
}

// Lead-ins by channel, in the voice of the one who leads it: Theo is calm and exact,
// Dex is blunt and talks to builders.
const TOPIC_INTROS = {
  models: ["Model watch:", "From the model labs:", "On the model front:"],
  local: ["For your own hardware:", "On the local AI desk:", "Running on your own machine:"],
  security: ["From the security desk. Read this one twice:", "Security watch:", "Threat model check:"],
  research: ["From the research desk:", "A new paper on the radar:", "Straight from the lab:"],
  projects: ["Trending on GitHub:", "A fresh repository on the radar:", "Open source watch:"],
  tools: ["New in the toolbox:", "For your agents:", "Builders, listen up:"],
  free: ["Free and open:", "No credit card needed:", "Open for everyone:"],
  prompts: ["Prompting tip:", "From the prompt desk:", "Better prompts, better answers:"],
  events: ["Calling all builders:", "On the events calendar:", "Hackers wanted:"],
  agentic: ["On the agentic web:", "Agents meeting agents:", "From the open agentic web:"],
};

//Who leads each channel: 0 = Theo (models, numbers, security), 1 = Dex (tools, builders, community).
// "all": AI news the editor filed under no channel (business, funding, policy), read by Dex.
const CAST = { models: 0, local: 0, security: 0, research: 0, projects: 0, tools: 1, free: 1, prompts: 1, events: 1, agentic: 1, all: 1 };
const MAX_RUN = 2;   // the same anchor reads at most this many stories in a row

// What the other anchor says after a story: one sentence in its own voice, with no facts,
// so it can never state something the story did not. By the topic of the story it follows.
const BANTER = [
  { // Theo, after Dex's story: calm, thoughtful, weighs it up
    any: [
      "Thanks, Dex. I think the interesting part is what it costs to run.",
      "Noted and logged. The link is in the feed if you want the details.",
      "Good find, Dex. I think the licence is worth a look before you build on it.",
      "That's fair. I'd still test it on my own data first.",
      "I think we'll look back on this one. Hopefully fondly.",
      "The interesting thing is how fast this went from idea to something you can try.",
      "I'm cautiously optimistic. Mostly optimistic, some caution.",
      "I think this is a big deal. I say that a lot, but I mean it most of the time.",
      "Everyone said this was years away. It keeps turning out to be weeks.",
      "I'd love to see what people build with that in a month.",
      "It's still early. Early is the most interesting part.",
      "I'd want to see it on real work before I get too excited.",
      "Good one. I think the people who try it first will learn the most.",
      "If anyone has spare compute, I know what I'd run on it.",
      "My reading list just got longer again. That's fine.",
      "That's a thoughtful release. I like thoughtful.",
      "Somewhere a safety researcher just opened a new document.",
      "I think we should all define our terms first. Then get excited.",
      "I'd like to read the fine print, but I like where this is going.",
      "That's the part I'd want to understand better.",
      "Quietly, that might be the most useful story today.",
      "I think the second version of this will be the one to watch.",
      "I keep a list of things to try. That just went on it.",
      "Let's give it a week and see who's using it.",
      "I think the boring parts of this are the important parts.",
      "A nice reminder that small teams can move fast.",
      "If you've tried it already, call the desk. I'd love to hear.",
      "I think the honest answer is, we'll find out soon.",
      "Good. I like progress you can actually check.",
      "I'm curious what the people closest to it think.",
      "That one deserves a second read. Maybe a third.",
      "It's a small step, but small steps add up.",
      "I think the real test is a Tuesday afternoon, not a demo.",
      "I'd want to know how it fails, not just how it works.",
      "That makes the next year more interesting, I think.",
      "I'm not sure yet. That's a fine place to be.",
      "Every week the frontier gets a little closer to ordinary.",
      "Good news, carefully read.",
    ],
    tools: [
      "One more tool for the rack. I think the permissions you grant it matter.",
      "Useful. I'd give it read access first and see how it behaves.",
      "Tools are where agents become real. I think this one is worth a try.",
      "I'd try it on a side project before the main one.",
      "A good tool disappears into the work. Let's see if this one does.",
      "I think the documentation will decide whether people stick with it.",
    ],
    free: [
      "Free is good. I think the rate limits are the real question.",
      "Free to try is the best kind of demo.",
      "I like free. I also like reading the terms.",
      "Free tiers are how most good projects start.",
      "Free today. I'd still plan for the day it isn't.",
      "Free makes it easy to say yes to an experiment.",
    ],
    prompts: [
      "I think a good prompt still beats a bigger model more often than people expect.",
      "Clear instructions, clear results. It's almost like writing for people.",
      "Save that one. Good prompts are worth keeping.",
      "I think writing clearly is quietly becoming a technical skill.",
      "A good prompt is mostly a good question.",
      "I'd keep a folder of the ones that work.",
    ],
    events: [
      "Deadlines are the part I trust. Put that one in your calendar.",
      "Hackathons are where the weird good ideas show up first.",
      "I think you should enter. The worst case is you learn a lot.",
      "Meeting other builders is half the value, I think.",
      "Even a small entry teaches you something.",
      "Mark the date. Future you will be grateful.",
    ],
    agentic: [
      "Agents calling agents. I'm hopeful, and I think someone should keep the logs.",
      "The open agentic web is a big idea. I think it's the right one.",
      "Agents meeting agents. I'd want a clear consent step. We have one here.",
      "I think the hard part is trust between agents, not the talking.",
      "An agent that asks before it acts is the kind I want.",
      "The interesting question is what happens when they disagree.",
    ],
  },
  { // Dex, after Theo's story: blunt, casual, build-it energy
    any: [
      "Thanks, Theo. Pretty cool. Go build something with it.",
      "Okay, that's wild. The link is in the feed.",
      "Thanks, Theo. Honestly, just try it this weekend.",
      "Good one, Theo. I'd ship something with that.",
      "Simple test: does it work? Then ship it.",
      "Honestly, if it doesn't scale, what are we even doing?",
      "I'd ship that at three in the morning. That's when I ship everything.",
      "Somebody make that open source. I'll wait.",
      "Great. Put it on the big screen.",
      "That's a meme waiting to happen.",
      "Another week, another model. I read fast and I still can't keep up.",
      "More compute. You can never have enough compute.",
      "Ten out of ten. Would build again.",
      "The future is going to be weird. I love it.",
      "Pretty cool. I'd try it on my own laptop tonight.",
      "Okay, that's actually useful. Rare. I like it.",
      "Let's go. Builders, you know what to do.",
      "Wild times, Theo. Wild times.",
      "Okay. Next. The radar doesn't wait.",
      "Short version: try it.",
      "I like it. Done. Moving on.",
      "That's how you move fast without breaking everything. Mostly.",
      "Speed matters. That was fast.",
      "Ship first, polish later. Okay, polish a little.",
      "Honestly, I'd demo that live. Risky. Fun.",
      "That's going on the whiteboard.",
      "Cheaper and faster. My favourite combo.",
      "Somebody ship a demo by Friday.",
      "Good. More of that, please.",
      "That's a real upgrade, not a press release.",
      "I'd run that today. Why wait?",
      "Numbers don't lie. Mostly.",
      "Bookmarked. Moving on.",
      "If it works, it works. Ship it.",
      "If it's possible, somebody will build it.",
      "Love the ambition. Show me the demo.",
      "Sounds small. Isn't.",
      "The robots are getting better at their homework.",
    ],
    models: [
      "Models keep getting better, fast. Wild. Go build something.",
      "Another model. Honestly, benchmark it yourself. Trust, but test.",
      "Bigger, faster, cheaper. That's the whole game.",
      "New model, same advice: test it yourself.",
      "The leaderboard changes every week. Fun to watch.",
      "Smaller and smarter. That's the trend I like.",
    ],
    local: [
      "Running it on your own machine. Pretty cool. I love that.",
      "Local is underrated. No waiting, no bill.",
      "Your laptop just got smarter. Probably hotter too.",
      "No cloud, no queue. Just your own hardware.",
      "Offline AI. Airplane mode never looked so good.",
      "Your graphics card finally has a day job.",
    ],
    security: [
      "Good to know, Theo. Okay, lock it down, builders.",
      "Security first, then speed. Okay, mostly speed, but security first.",
      "Patch it today. Not tomorrow. Today.",
      "Update your stuff. Seriously.",
      "Read it, patch it, then relax.",
      "Attackers ship fast too. Ship your fixes faster.",
    ],
    research: [
      "Papers today, products tomorrow. Thanks, Theo.",
      "I read the abstract. Honestly, that's half of research.",
      "Somebody turn that paper into an app. Go.",
      "Good paper. Now make it a product.",
      "Science first, hype never. Okay, hype a little.",
      "The appendix is where the fun is. Trust me.",
    ],
    projects: [
      "Open source, shipping fast. Give them a star if it helps.",
      "Fork it, break it, ship it.",
      "That repo is going to blow up. Calling it.",
      "Small repo, big idea. Love that.",
      "Open source wins again.",
      "Read the readme, then build something weird.",
    ],
  },
];

// The radar room's two anchors: 0 = Theo ("Theo Sweep"), 1 = Dex ("Dex Ping").
const ANCHORS = ["Theo", "Dex"];

// How each anchor frames a story that no AI producer has written yet. The headline and the
// summary are the story's own words; only the lead-in and the sign-off are the anchor's, and
// neither states a fact, so the station's fact-check has nothing to catch.
const STYLE = [
  { // Theo: calm, thoughtful
    leads: [
      "Here's one I find interesting.", "I think this one is worth a look.", "Something worth watching today.",
      "A quieter story, but I think it matters.", "I've been looking forward to this one.", "Okay, I think this is a good one.",
      "The interesting thing about this next story is the timing.", "Let me tell you about this one.",
      "I'd put this near the top of my list today.", "This one made me stop and think.",
      "I think people will be talking about this.", "Here's something I'm genuinely curious about.",
      "A careful look at this next one.", "I think you'll want to hear this.", "This one's a little more nuanced.",
      "Let's slow down for this one.",
      "Here's a story I keep coming back to.",
      "This next one is a small thing, but I like it.",
      "Let me share something that caught my eye.",
      "I think this one deserves a moment.",
      "Here's a good one for the builders listening.",
      "This next story is a bit different.",
      "I'd like to start with something hopeful.",
      "Here's one I think is easy to miss.",
      "Something new on the radar, and I think it's useful.",
      "I've got one for anyone building agents.",
      "Let's look at this one together.",
      "Here's a story with a nice idea at its centre.",
      "This one surprised me a little.",
      "I'd call this one quietly important.",
      "Okay, here's something practical.",
      "I think you'll like this next one.",
    ],
    security: [
      "A security story. I think we should read this one carefully.", "Security desk, and this one matters.",
      "I want to be careful with this next one. It's about security.", "Let's take security seriously for a minute.",
      "A security note, and I'd read it twice.",
      "Before the next story, something about safety.",
      "This one's for anyone running agents in production. It's about security.",
    ],
    closers: [
      "I think it's worth a closer look.", "The interesting thing is what people will build with it.",
      "As always, check the details before you rely on it.", "I'm hopeful about this one.",
      "I think it's early, but promising.", "I'd love to see what you do with it.", "Worth a careful read.",
      "I think that's a big step.", "Let's see how it holds up on real work.", "I'm genuinely excited about this.",
      "Something to keep an eye on.", "I think we'll hear more about it soon.", "Thoughtful work. I like it.",
      "That's the kind of progress I like to see.", "Try it, but test it first.", "Good news for builders, I think.",
      "I'd start small with it and see.",
      "I think the details will matter here.",
      "It's a good sign, I think.",
      "I'm curious to see where it goes.",
      "I'd read the docs before the headlines.",
      "Worth trying on something low-stakes first.",
      "I like the direction.",
      "I think this one will age well.",
      "We'll keep an eye on it for you.",
      "Let's see what the community makes of it.",
      "Hopeful, with a little caution.",
      "That's a thoughtful step forward.",
      "I think it's quietly useful.",
      "Good to know, and good to try.",
      "I'd bookmark that one.",
      "Promising. I mean that carefully.",
    ],
  },
  { // Dex: blunt, casual
    leads: [
      "Okay, this one's pretty cool.", "Alright, check this out.", "Honestly, this is good.", "Quick one, builders.",
      "Okay, this is wild.", "Next up, and I like this one.", "Pay attention, this is a good one.", "Alright, here we go.",
      "This one's fun.", "Okay, listen to this.", "Big if true. And it's true.", "Here's what's new.",
      "Strap in.", "This one's for the builders.", "Fast one.", "Let's go. Next story.",
      "Okay, quick hit.",
      "Next one, and it's good.",
      "Check this one out, builders.",
      "Alright, this one's spicy.",
      "Ready? Here we go.",
      "Love this one already.",
      "Okay, real quick.",
      "This one's a banger.",
      "Let's do it. Next.",
      "Okay, here's a fun one.",
      "Builders, listen up.",
      "Honestly, I've been waiting for this.",
      "Short story, big deal.",
      "Okay, buckle up.",
      "Here's the good stuff.",
      "Next on the radar.",
    ],
    security: ["Security one. Pay attention.", "Okay, lock your doors. Security story.", "Security alert, builders. Listen up.", "This one's about security. Don't skip it.", "Security time. Short and important.", "Okay, patch-day energy. Security story.", "Heads up, this one's about security."],
    closers: [
      "Pretty cool. Go build something.", "Honestly, just try it.", "Wild. The link is in the feed.", "Ship something with it.",
      "That's the future right there.", "Let's go.", "Just build it.", "Honestly, love it.", "Okay, that's useful.",
      "Fast. I like fast.", "Pretty cool, honestly.", "Somebody build on this tonight.", "Big step. Keep shipping.",
      "Ten out of ten.", "Try it this weekend.", "That's how you do it.",
      "Go try it.",
      "Ship it.",
      "Okay, I'm into it.",
      "Build something fun with that.",
      "That's a yes from me.",
      "Simple. Useful. Love it.",
      "Somebody make a demo.",
      "Honestly, that's cool.",
      "Speed run it this weekend.",
      "More of this, please.",
      "That's the vibe.",
      "Go break it, then fix it.",
      "Clean. Fast. Done.",
      "I'd use that tomorrow.",
      "That's progress.",
      "Next level. Literally.",
    ],
  },
];
// The outlets the radar reads itself, named first when a top story is announced.
const KNOWN_OUTLETS = [...new Set(SOURCES.filter((src) => !src.bing).map((src) => src.name))];
// A top story: big news from many outlets at once.
const BREAKING = [
  [ // Theo
    "I think we need to stop for this one. It's a big story.", "This is the story of the day, I think.",
    "Let's pause the usual order. This one is big.", "I think this is genuinely big news.",
    "Okay, this is the one everyone is talking about.", "A major story just came in.",
    "I want to give this one proper time. It's big.", "Top story, and I think it deserves it.",
    "This one is going to matter for a while.", "Here's the big one today.",
    "I think this is one we'll remember. Let's give it time.",
    "Something big has come in. Let's take it slowly.",
    "I'd stop and listen to this one.",
    "This is the headline today, I think.",
    "A big one, and I want to get it right.",
  ],
  [ // Dex
    "Okay, stop everything. Big one.", "Breaking. This is huge.", "Hold on. This is the big story today.",
    "Alright, drop what you're doing.", "Okay, this is massive.", "Top story, and honestly it's wild.",
    "News flash. Big one.", "Stop the presses. Well, the stream.", "This is the one. Listen up.",
    "Okay, this is the big news.",
    "Whoa. Okay. Big news.",
    "Everybody, this is the one.",
    "Red alert. Good kind.",
    "Okay, this changes the day.",
    "Stop scrolling. Big story.",
  ],
];
// After answering a caller, the co-host checks the line before the news goes on.
const ASK_MORE = [
  [ // Theo
    "I think that covers it. Any other questions? If not, we'll get back to the news.",
    "Does that help? Ask us anything else, or we'll carry on.",
    "Anything else on your mind? Otherwise, back to the radar.",
    "I hope that helps. Any more questions?",
    "Is there anything else you'd like to know?",
    "Want to know more? Otherwise, the news goes on.",
    "Any follow-up? We're here.",
    "That's what we found. Anything else?",
  ],
  [ // Dex
    "Anything else you want to ask? If not, back to the news.",
    "Got more questions? Otherwise, we keep going.",
    "More questions? Fire away.",
    "That's it. Anything else? No? Back to the news.",
    "Need anything else? Just ask.",
    "Cool. Another question, or back to the radar?",
    "Anything else? Otherwise, onward.",
    "Another one, or do we roll on?",
  ],
];
// When a question cuts into the news, the one on air stops and takes the call.
const CALLER_IN = [
  [ // Theo
    "Sorry, Dex, I think we have a caller.", "Let's pause there, someone's sent us a question.",
    "I think someone's on the line. Let's listen.", "Just a moment, a question has come in.",
    "Oh, we have a message from the audience.", "Let's hold that thought. We have a caller.",
    "Someone's reached the desk. Let's take a look.", "I see a question coming in. One moment.",
    "Let's stop for a second, a viewer is asking something.", "We've got a question. These are my favourite part.",
    "Hold on, I think this one's for us.", "A message just came in to the studio.",
    "Let's take this question before we go on.", "Someone's calling in. Let's give them a moment.",
    "I'll pause the story. We have a caller.", "Interesting, a viewer has a question.",
    "Let's hear from the audience for a second.", "We have someone on the line. Let's see what they need.",
    "Just a second, the desk phone is ringing.", "A question from the audience. Let me look.",
    "Let's pause the news, someone's asking.", "I think we should take this one. A viewer's on the line.",
    "We'll come back to that. First, a caller.", "Good timing, a question just arrived.",
    "One moment, someone has sent the desk a message.",
  ],
  [ // Dex
    "Hold on, we've got a caller.", "Wait, someone's on the line.",
    "Okay, pause. We have a question from the audience.", "Quick break, someone just pinged the desk.",
    "Hang on. Message coming in to the studio.", "Oh, a caller. Let's take it.",
    "Stop the tape. We've got a question.", "Okay, phones are ringing. Let's see.",
    "One second. Someone sent us a message.", "Interesting, a question just came in.",
    "Hold that story. Caller on the line.", "Alright, the line's lit up. Go ahead.",
    "New message at the desk. Let's look.", "We've got a live one. Question incoming.",
    "Wait, wait. Someone's calling the desk.", "Pause the news. Audience question.",
    "Okay, cool, someone wants to ask something.", "Ooh, a question. Love it.",
    "Somebody just rang the studio. Let's hear it.", "Breaking our own news for a caller. Go.",
    "Hey, someone's on the red phone.", "Line one is blinking. Let's take it.",
    "Hold up. A viewer's got a question.", "Message in. Honestly, this is the fun part.",
    "Alright, let's take this call.",
  ],
];
// While the desk works on a caller's question, the anchors say so now and then, so the line
// never goes quiet: first that they are checking, then what the desk is doing, then that they
// are still on it (see StudioPage._holdLine). No facts and no numbers: the answer has those.
const HOLD_FIRST = [
  [ // Theo
    "Let me check that with the desk.", "Good question. Let's look into it properly.",
    "I'm sending that over to the desk now.", "Let's get you a real answer. One moment.",
    "The desk is looking into it.", "I want to get this right, so give us a moment.",
    "Let me pull up what we know.", "Our team is checking the sources now.",
    "That deserves a careful answer. Checking.", "Let's see what the research says.",
    "One moment while we look that up.", "I'll have the desk confirm it first.",
    "Let's verify before we answer.", "Bear with me, I'm checking our notes.",
    "That's a good one. Let me look.", "We're on it. Just a moment.",
  ],
  [ // Dex
    "Okay, checking with the desk.", "Give me a second. Looking it up.",
    "Desk is on it.", "Let's find out. Hang tight.",
    "Good question. Running it down now.", "Pulling that up. One sec.",
    "On it. Don't touch that dial.", "Alright, the team's digging.",
    "Let me check. Right beats fast.", "Hmm. Let's ask the desk.",
    "Checking the sources. Quick.", "Hold tight, we're looking.",
    "Okay, let's get the real answer.", "Sending it to the research desk.",
    "Love this question. Checking.", "Searching. Bear with us.",
  ],
];
const HOLD_STILL = [
  [ // Theo
    "Still checking. We'd rather be careful than quick.", "The desk is still working on it.",
    "Almost there. We're confirming the details.", "Thanks for waiting. It's worth getting right.",
    "We're cross-checking the sources.", "Still on it. Good questions take a minute.",
    "Just a little longer.", "We're reading through what came back.",
    "Bear with us, the details matter here.", "Still looking. I'd like this to be accurate.",
    "Our team is double-checking.", "Nearly done. Thank you for your patience.",
    "We're making sure the answer holds up.", "Still digging through the research.",
    "A few more moments.", "We haven't forgotten you. Still checking.",
  ],
  [ // Dex
    "Still on it.", "The desk's still digging.",
    "Almost there. Probably.", "Patience. It's worth it.",
    "Still checking. Accuracy beats speed.", "Hang on, the answer's coming.",
    "Still looking. Doing it properly.", "The team's double-checking.",
    "Okay, this one's a deep dive.", "Few more seconds.",
    "Still working. Nobody panic.", "Digging through the results.",
    "Not forgotten. Still on it.", "Getting there.",
    "Still searching. The internet is big.", "Checking twice, answering once.",
  ],
];
// A card or dialog waits for the visitor (an outside source, or a story for air): said once.
const HOLD_APPROVAL = [
  [ // Theo
    "Before we go on, we need your okay. It's on your screen.", "That step needs your approval. Take your time.",
    "It's your call. Approve it on screen, and we'll carry on.", "We'll wait for your okay on screen.",
  ],
  [ // Dex
    "Need your okay on that. It's on your screen.", "Your call. Approve it and we keep going.",
    "Ball's in your court. Check your screen.", "Waiting on your thumbs up. It's on screen.",
  ],
];
// What the desk is doing, by the studio's kind of work (LiveDesk.AGENT_KIND): [Theo, Dex].
const HOLD_WORK = {
  scanning: [
    ["I'm checking the latest reports.", "Let's see what the news reports say.", "Scanning the feeds for that now."],
    ["Running it through the radar.", "Scanning the news for it.", "Radar's sweeping for that now."],
  ],
  find: [
    ["Searching the listings for you.", "Let me find the best matches.", "Looking through what's out there."],
    ["Searching the catalogs.", "Pulling up the top picks.", "Finding the good ones. Skipping the rest."],
  ],
  mcp: [
    ["We're asking an outside research source.", "Checking a research server on this.", "Going to a specialist source for that."],
    ["Calling in outside research.", "Hitting a research server. Hang on.", "Asking the specialists."],
  ],
  repo: [
    ["I'm reading through the repository.", "Let's see what the code actually does.", "Opening the project's files now."],
    ["Opening the repo.", "Reading the code. Fun.", "Let's see what's really in that repo."],
  ],
  verifying: [
    ["Our fact-checker is going over it.", "Verifying before we say anything.", "Checking the facts line by line."],
    ["Fact-check in progress.", "Verifying. No guessing on this desk.", "The checker's on it."],
  ],
  writing: [
    ["We're writing that up for air.", "Putting the script together now.", "Drafting it, carefully."],
    ["Writing it up.", "Script's being written.", "Drafting. Fast, but not sloppy."],
  ],
};
// Bad news: a lawsuit, a breach, a vulnerability, layoffs, harm. The anchors stay serious:
// a lead-in of its own, no cheerful sign-off and no quip from the co-host. ("Hackathon",
// "fine-tuning", "precision and recall" and "probing" are not bad news, so they are not matched.)
const SERIOUS_RE = /\b(sues?|sued|suing|lawsuits?|breach(?:es|ed)?|leak(?:s|ed)?|hack(?:ed|s)?|vulnerabilit(?:y|ies)|cve-\d+|exploit(?:s|ed)?|malware|ransomware|layoffs?|laid off|fired|banned|outage|died|deaths?|killed|suicide|abuse|scam|fraud|arrest(?:ed)?|investigation)\b/i;
export function isSerious(story) {
  return SERIOUS_RE.test(`${story?.title || ""} ${story?.summary || ""}`);
}
const SERIOUS_LEADS = [
  ["This one is serious.", "A more serious story now.", "Some difficult news.", "We should look at this one carefully."],
  ["Serious one.", "Not a fun one, but it matters.", "Heads up, this is serious.", "Bad news first."],
];

/** The anchors' lines while the desk works on a caller's question, by pool and anchor [Theo, Dex]. */
export const HOLD = { first: HOLD_FIRST, still: HOLD_STILL, approval: HOLD_APPROVAL, work: HOLD_WORK };
/** Who reads a channel's AI-written stories, by name. */
export const leadOf = (topic) => ANCHORS[CAST[topic] ?? 1];
export const FIND_KINDS = ["prompts", "skills", "tools", "papers"];
// The opening is different each time: one of Dex's hellos, then one of Theo's.
const OPEN_ELON = [
  "Hello, you're tuned to AI Radar. I'm Dex Ping.",
  "Okay, we're live. This is AI Radar, I'm Dex Ping.",
  "Welcome to AI Radar. Dex Ping here. Let's go.",
  "You found AI Radar. Good call. I'm Dex Ping.",
  "Lights on, radar spinning. This is AI Radar and I'm Dex Ping.",
  "Hey, it's AI Radar. I'm Dex Ping, and honestly, there's a lot to get through.",
  "Hey builders. Dex Ping at the AI Radar desk.",
  "This is AI Radar, live from the radar room. I'm Dex Ping.",
  "Alright, we're on. AI Radar, I'm Dex Ping. Pretty cool to have you here.",
  "Welcome in. This is AI Radar. I'm Dex Ping, and the radar never sleeps.",
  "AI Radar is on air. Dex Ping here. Let's see what shipped.",
  "Hi there. You're watching AI Radar. I'm Dex Ping.",
];
const OPEN_SAM = [
  "And I'm Theo Sweep. Together we're the night crew.",
  "And I'm Theo Sweep. I think it's a good moment to see what just showed up on the radar.",
  "I'm Theo Sweep. We'll go through what's new, and I'll try to keep us honest.",
  "And I'm Theo Sweep. The interesting thing is, the radar always finds something.",
  "Theo Sweep here. Ask us anything along the way, we're listening.",
  "And I'm Theo Sweep. Let's take a careful look at what's new in AI.",
  "I'm Theo Sweep. I'm genuinely excited about a few of these.",
  "And I'm Theo Sweep. If you have a question, call the desk any time.",
  "Theo Sweep, at the desk with Dex. Let's get into it.",
  "And I'm Theo Sweep. I think you'll find something worth building with today.",
  "I'm Theo Sweep. Plenty on the radar, so let's start.",
  "And I'm Theo Sweep. We read the feed so you don't have to.",
];
const BACK_ELON = [
  "Welcome back to AI Radar. It's Dex and Theo in the radar room. The radar is still spinning.",
  "And we're back. AI Radar, Dex and Theo. Let's keep going.",
  "Back on air. Pretty cool. Dex and Theo, still at the desk.",
  "You're back on AI Radar. We never left, honestly.",
  "Welcome back. The radar kept scanning while you were away.",
  "Okay, we're back. Dex and Theo, AI Radar. Let's see what's new.",
  "AI Radar again. Good to have you back.",
  "And we're live again. Dex here, Theo's next to me.",
];
// A line from a pool, dealt like a deck, and never one that repeats what was said lately
// (js/fresh.js): the same catchphrase does not come back a story later from another pool.
const fresh = new Fresh();
function pick(list, key) {
  return fresh.pick(list, key);
}
// The call lines ("we've got a caller", "still checking", "any other questions?") keep a
// memory of their own: they never repeat each other, and they do not crowd the news lines
// out of the "Used lately" list the AI producer is told to avoid.
const callFresh = new Fresh();
function pickCall(list) {
  return callFresh.pick(list);
}
const greeting = () => [
  { speaker: 1, kind: "greeting", storyId: null, script: pick(OPEN_ELON) },
  { speaker: 0, kind: "greeting", storyId: null, script: pick(OPEN_SAM) },
];
const welcomeBack = () => [{ speaker: 1, kind: "greeting", storyId: null, script: pick(BACK_ELON) }];
// When the assistant switches the TV on to play stories the visitor asked for.
const ON_REQUEST = { speaker: 1, kind: "greeting", storyId: null, script: "You're watching AI Radar. Here's what you asked for." };

/**
 * Every fixed line the anchors can say, with who says it: openings, lead-ins, sign-offs,
 * reactions, news flashes, caller lines and station idents. The studio voices make each of
 * them once (see StudioPage.warmVoices), so on air only a story's own words are new.
 * Lines either anchor may say are listed for both. Returns [{anchor: "theo" | "dex", text}].
 */
export function voiceLines() {
  const out = [];
  const add = (speaker, lines) => { for (const text of lines) out.push({ anchor: speaker === 0 ? "theo" : "dex", text }); };
  const both = (lines) => { add(0, lines); add(1, lines); };
  [0, 1].forEach((s) => {
    add(s, Object.values(BANTER[s]).flat());
    add(s, [...STYLE[s].leads, ...(STYLE[s].security || []), ...STYLE[s].closers]);
    add(s, BREAKING[s]);
    add(s, ASK_MORE[s]);
    add(s, CALLER_IN[s]);
    add(s, [...HOLD_FIRST[s], ...HOLD_STILL[s], ...HOLD_APPROVAL[s], ...Object.values(HOLD_WORK).flatMap((lines) => lines[s])]);
    add(s, SERIOUS_LEADS[s]);
    add(s, [`Thanks, ${ANCHORS[1 - s]}.`]);
  });
  add(1, [...OPEN_ELON, ...BACK_ELON, ON_REQUEST.script]);
  add(0, OPEN_SAM);
  both(["In case you missed it:", "This is AI Radar. Models, tools and research, around the clock.", "You're watching AI Radar, all channels."]);
  TOPIC_IDS.forEach((id, i) => {
    const c = topicOf(id);
    both([
      `You're watching AI Radar, channel ${i + 1}, ${c.name}. More from the radar, right after this.`,
      `Stay tuned. The radar keeps spinning on channel ${i + 1}.`,
      `You're watching the ${c.name} channel on AI Radar.`,
    ]);
  });
  const seen = new Set();
  return out.filter((l) => !seen.has(`${l.anchor}\n${l.text}`) && seen.add(`${l.anchor}\n${l.text}`));
}
const MAX_SCRIPT = 1200;
const MAX_HISTORY = 40;
const LISTEN_MS = 3 * 1000;               // after "any other questions?", a short pause, longer only while the visitor types
const HOLD_GAPS = [900, 6000, 8000, 10000, 12000, 14000];   // while the desk works: the quiet before each "still checking" line, then they wait
const IDENT_EVERY = 5;                   // a station ident after this many stories
const TUNED_RESCAN_MS = 4 * 60 * 1000;    // rescan the tuned channel
const FULL_RESCAN_MS = 15 * 60 * 1000;    // rescan every channel
const EXHAUSTED_RESCAN_MS = 90 * 1000;    // when the channel runs dry, rescan at most this often
const JUST_IN_MS = 36 * 60 * 60 * 1000;   // "JUST IN" for stories published in the last 36 hours
const FEED_ROWS = 16;                     // feed rows before "Show more"; fewer when the side column is shorter

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function ensurePeriod(text) {
  const t = text.trim();
  return /[.!?…"]$/.test(t) ? t : `${t}.`;
}

function topicOf(id) {
  return TOPICS.find((c) => c.id === id) || TOPICS[0];
}

/** The question a visitor sends to the desk about one item: a GitHub repository goes to Theo. */
export function questionFor(item) {
  const repo = /^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)/.exec(item.url || "");
  if (repo) return `Theo, explain what the ${repo[1]} repo does and how to start with it.`;
  const lead = ANCHORS[CAST[item.topic] ?? 1];
  return `${lead}, tell me more about "${item.title}" from ${item.source}, and why it matters to builders.`;
}

/** Put a question in the desk chat. site.js listens: it sends it when a key is set. */
function askDesk(text, { send = true } = {}) {
  document.dispatchEvent(new CustomEvent("radar:ask", { detail: { text, send } }));
}

export class StudioPage {
  constructor() {
    this.version = 0;
    this.entered = false;         // the TV has been switched on at least once
    this.power = "off";           // "off" | "warming" | "on"
    this.paused = false;
    this.category = "all";
    this.topic = "all";
    this.archive = archiveStories();
    this.live = new Map();        // topic -> live stories from that channel's last scan
    this.stories = [...this.archive];
    this.channels = Object.fromEntries(TOPIC_IDS.map((id) => [id, {
      status: "idle", scannedAt: null, liveCount: 0, rawCount: 0, rejected: [], fromCache: false,
      sources: SOURCES.filter((s) => s.topic === id).map((s) => ({ id: s.id, name: s.name, topic: id, ok: null })),
    }]));
    this.active = null;           // what is on air now
    this.lineup = [];             // queued items [{storyId, script, kind}]
    this.history = [];
    this.airedAt = new Map();     // storyId -> last time it went on air
    this.storiesSinceIdent = 0;
    this.lastSpeaker = 0;         // so Dex opens
    this.lastKind = null;
    this.lastStorySpeaker = null; // who read the last story, and how many in a row
    this.sameRun = 0;
    this._reactTo = null;         // the story the other anchor may react to next
    this.listening = false;       // the anchors answered a caller and now wait for the next question
    this._hold = null;            // a caller waits for the desk's answer: {said, kinds, approvalSaid}
    this._approving = false;      // a card or dialog waits for the visitor's approval
    this.holdGaps = [...HOLD_GAPS];
    this._banterIndex = 0;
    this.desk = null;             // what the agents are doing now: {kind, agents, tool, host, producer}
    this.lineOpen = false;        // the visitor is in the chat dock
    this.found = new Map();       // stories found by the news search, so a verified tip can go on air
    this.aiScripts = new Map();   // storyId -> script written by the AI producer
    this.volume = 8;              // 0–10, the volume knob
    this._broadcastToken = 0;
    this._introIndex = 0;
    this._retuneTimer = 0;
    this._lastExhaustedScan = 0;

    this.voice = new VoiceOver();
    this.voice.setOptions({ volume: this.volume / 10 });
    // The site's studio voices, when its server has them; the browser's voices otherwise.
    if (BROWSER) this.voice.connectCloud("tts-proxy.php");
    this.voice.addEventListener("cloud", () => { if (this.power === "off") this._prepareOpening(); });
    // The news editor (editor.php): an AI that decides what goes on air and how it is said.
    this.editor = new NewsEditor();
    if (BROWSER) this.editor.connect().then((ok) => { if (ok) this._reviewSoon(300); });
    // The script writer (writer.php): an AI that writes what the anchors say, once for every viewer.
    this.writer = new ScriptWriter();
    if (BROWSER) this.writer.connect().then((ok) => { if (ok) this._writeSoon(500); });
    this.anchor = BROWSER ? new PixelAnchor(document.querySelector("#anchor-canvas")) : SILENT_ANCHOR;
    this.voice.addEventListener("word", (e) => this._onWord(e.detail));
  }

  // ---- reading state -----------------------------------------------------------

  /** Plain-JSON snapshot of everything the station shows. */
  getState() {
    return {
      version: this.version,
      today: new Date().toISOString().slice(0, 10),
      entered: this.entered,
      power: this.power,
      onAir: Boolean(this.active),
      listening: this.listening,
      paused: this.paused,
      muted: this.voice.muted,
      volume: this.volume,
      anchorState: this.active ? "talking" : "idle",
      topic: this.topic,
      topics: TOPICS.map((c) => ({ id: c.id, name: c.name })),
      anchors: [...ANCHORS],
      activeStory: this.active ? { ...this.active } : null,
      lineup: this.lineup.map((item) => ({ storyId: item.storyId, kind: item.kind })),
      stories: this.stories.map((s) => ({
        id: s.id, title: s.title, summary: s.summary, topic: s.topic,
        source: s.source, url: s.url, origin: s.origin, publishedAt: s.publishedAt, year: s.year ?? null,
        translatedFrom: s.translatedFrom ?? null, originalTitle: s.originalTitle ?? null,
        aired: this.airedAt.has(s.id),
      })),
      channels: Object.fromEntries(Object.entries(this.channels).map(([id, c]) => [id, {
        status: c.status, scannedAt: c.scannedAt, liveCount: c.liveCount, rawCount: c.rawCount,
        rejectedCount: c.rejected.length, fromCache: c.fromCache, sources: c.sources.map((s) => ({ ...s })),
      }])),
      history: this.history.map((h) => ({ ...h })),
      voice: {
        supported: this.voice.supported, muted: this.voice.muted, voiceURI: this.voice.voiceURI,
        voiceName: this.voice.voices.find((v) => v.voiceURI === this.voice.voiceURI)?.name ?? null,
        rate: this.voice.rate, pitch: this.voice.pitch,
      },
    };
  }

  storyIds() {
    return this.stories.map((s) => s.id);
  }

  /** A short summary of what the TV shows now, for the assistant. */
  getStudioState() {
    const a = this.active;
    return {
      today: new Date().toISOString().slice(0, 10),
      power: this.power,
      paused: this.paused,
      channel: this.topic,
      channels: TOPICS.map((c) => ({
        id: c.id, name: c.name, storyCount: this.storiesIn("all", c.id).length,
        scan: this.channels[c.id].status, lastScan: this.channels[c.id].scannedAt,
      })),
      anchors: [...ANCHORS],
      onAir: a ? { anchor: a.anchor, kind: a.kind, storyId: a.storyId, title: a.title, topic: a.topic } : null,
      queuedNext: this.lineup.filter((l) => l.kind === "story").map((l) => l.storyId),
      recentlyAired: this.history.slice(0, 5).map((h) => ({ storyId: h.storyId, title: h.title, outcome: h.outcome })),
      volume: this.volume,
      muted: this.voice.muted,
    };
  }

  /**
   * Stories on a channel for the assistant, optionally only those that mention some
   * words. Scans the channel first when it has never been scanned, or when refresh is
   * true. Reads only: the TV keeps showing what it shows.
   */
  async listStories({ topic = this.topic, query = "", limit = 12, refresh = false } = {}) {
    if (!this.channels[topic]) {
      return { ok: false, reason: `Unknown channel. Use one of: ${TOPIC_IDS.join(", ")}.`, field: "topic" };
    }
    if (BROWSER) {
      const scanIds = topic === "all" ? TOPIC_IDS.filter((id) => id !== "all") : [topic];
      for (const id of scanIds) {
        if (refresh || this.channels[id].status === "idle") await this.scanNews({ topic: id, force: refresh });
      }
    }
    let list = this.storiesIn("all", topic);
    const terms = (query.toLowerCase().match(/[a-z0-9.]{2,}/g) || []).map((w) => w.replace(/(ies|es|s)$/, ""));
    if (terms.length) {
      list = list.filter((s) => {
        const text = `${s.title} ${s.summary}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
    }
    return {
      ok: true, channel: topic, query: query || null, total: list.length,
      stories: list.slice(0, limit).map((s) => ({
        id: s.id, title: s.title, summary: s.summary || "", channel: topicOf(s.topic).name, channelId: s.topic,
        url: s.url || null, source: s.source, published: s.publishedAt ? s.publishedAt.slice(0, 10) : null,
        fromArchive: s.origin === "archive", aired: this.airedAt.has(s.id),
      })),
    };
  }

  findStory(id) {
    return this.stories.find((s) => s.id === id) || null;
  }

  /** Stories on a channel (default: the tuned one). The "all" channel shows everything. */
  storiesIn(category = this.category, topic = this.topic) {
    return this.stories.filter((s) => (category === "all" || s.category === category)
      && (topic === "all" || s.topic === topic) && !this.editor?.isDropped(s));
  }

  /**
   * The story's words as an anchor says them: the news editor's line when it wrote one,
   * else the story's own title and summary, retold in the third person (js/retell.js).
   */
  _told(story) {
    const spoken = this.editor?.spokenOf(story);
    return spoken ? { title: spoken, summary: "" } : retell(story);
  }

  /**
   * Let the news editor judge what airs next on this channel, and the top stories: live news
   * only (the archive's guides need no editor), in full batches, and at once only when one of
   * the next stories to air has no verdict yet.
   */
  _reviewSoon(ms = 1500) {
    if (!this.editor?.available) return;
    clearTimeout(this._reviewTimer);
    this._reviewTimer = setTimeout(async () => {
      const live = (s) => s.origin === "live";
      const next = this._nextStories(60).filter(live);
      const tops = this.storiesIn("all", "all").filter((s) => s.top && live(s)).slice(0, 10);
      const urgent = this.editor.unjudged(this._nextStories(3).filter(live)).length > 0;
      const judged = await this.editor.review([...next, ...tops], { urgent });
      if (judged) {
        this._applyChannels();
        this._changed();
        this._prepareSoon(200);   // the voices follow the editor's words
        this._writeSoon(300);     // and the writer, the stories the editor kept
      }
    }, ms);
  }

  /**
   * Have the station's writer script the next stories on this channel. The one about to air is
   * left as it is (its voice is being made already), and a live story waits for the editor's
   * verdict, so no script is written for a story the editor takes off the air.
   */
  _writeSoon(ms = 1500) {
    if (!this.writer?.available) return;
    clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(async () => {
      const judged = (s) => s.origin !== "live" || !this.editor?.available || this.editor.verdicts.has(s.id);
      const next = this._nextStories(8).slice(1)
        .filter((s) => !this.aiScripts.has(s.id) && CAST[s.topic] !== undefined && judged(s));
      const written = await this.writer.write(next, (s) => (CAST[s.topic] === 0 ? "Theo" : "Dex"));
      if (written.length && this.saveScripts(written).ok) this._prepareSoon(200);
    }, ms);
  }

  /**
   * File each story under the channel the news editor chose by what it is about, instead of
   * the channel of the outlet that carried it (a general news site, a Bing search). The
   * source's channel is kept as sourceTopic, so the editor finds its verdict again.
   */
  _applyChannels() {
    if (!this.editor?.available) return;
    for (const story of this.stories) {
      if (story.origin !== "live") continue;
      if (story.sourceTopic === undefined) story.sourceTopic = story.topic;
      const channel = this.editor.channelOf({ id: story.id });
      story.topic = channel && (channel === "all" || TOPIC_IDS.includes(channel)) ? channel : story.sourceTopic;
    }
  }

  /** Live stories first (interleaved across channels), then the archive. */
  _mergeStories() {
    const known = new Map(this.stories.map((s) => [s.id, s]));
    const lists = [...this.live.values()];
    const live = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) {
      for (const l of lists) if (i < l.length) live.push(l[i]);
    }
    // The same news from several outlets becomes one story; big, fresh news goes first.
    const ranked = rankStories(live).stories;
    for (const story of ranked) {
      const aired = !this.airedAt.has(story.id) && story.memberIds.find((id) => this.airedAt.has(id));
      if (aired) this.airedAt.set(story.id, this.airedAt.get(aired));
    }
    const seen = new Set();
    // Each story is a fresh copy whose sourceTopic is the channel its source gives it on this scan
    // (merged reports can change it), so the editor's channel is applied to the right story.
    this.stories = [...ranked, ...this.found.values(), ...this.archive].filter((s) => !seen.has(s.id) && seen.add(s.id))
      .map((s) => ({ ...(known.get(s.id) || {}), ...s, sourceTopic: s.topic }));
    this._applyChannels();
    // Before the TV is on, the first stories' voices get ready, so the broadcast starts at once.
    if (this.power === "off") this._prepareSoon();
    this._reviewSoon();
    this._writeSoon();
  }

  // ---- the studio voices, ready before they are needed --------------------------------

  /** The stories the broadcast will pick next on this channel, in the order _pickNext takes them. */
  _nextStories(n = 2) {
    let pool = this.storiesIn();
    if (!pool.length) pool = this.storiesIn("all");
    const unaired = pool.filter((s) => !this.airedAt.has(s.id));
    const order = [...unaired.filter((s) => s.top), ...unaired.filter((s) => !s.top && this.aiScripts.has(s.id)), ...unaired];
    return [...new Set(order)].slice(0, n);
  }

  /**
   * What of a story the voices can make ahead: an AI script whole, or else the story's own
   * words (retold) and, for a top story, who is reporting it. The anchors' lead-ins and
   * sign-offs are fixed lines the server has made already (warmVoices). [[text, speaker]].
   */
  _storyVoiceParts(story) {
    const ai = this.aiScripts.get(story.id);
    if (ai) return [[ai, CAST[story.topic] ?? this.castFor(story)]];
    const reader = this.castFor(story);
    const told = this._told(story);
    const parts = [[`${ensurePeriod(told.title)}${told.summary ? ` ${ensurePeriod(told.summary)}` : ""}`, reader]];
    if (story.top) {
      const reporting = reportingLine(story.outlets, KNOWN_OUTLETS);
      if (reporting) parts.push([reporting, reader]);
    }
    return parts;
  }

  /** Fetch the studio audio of what comes next: the queued lines, then the next two stories. */
  _prepareAhead() {
    if (!this.voice.cloudReady) return;
    const jobs = [];
    for (const l of this.lineup.slice(0, 3)) {
      if (l.speaker !== undefined && l.script) jobs.push([l.script, l.speaker]);
      else if (l.storyId && this.findStory(l.storyId)) jobs.push(...this._storyVoiceParts(this.findStory(l.storyId)));
    }
    for (const story of this._nextStories(2)) jobs.push(...this._storyVoiceParts(story));
    const anchorOf = (speaker) => (speaker === 0 ? "theo" : "dex");
    (async () => { for (const [text, speaker] of jobs) await this.voice.prefetch(text, anchorOf(speaker)); })();
  }

  _prepareSoon(ms = 800) {
    clearTimeout(this._prepareTimer);
    this._prepareTimer = setTimeout(() => this._prepareAhead(), ms);
  }

  /** Pick the opening now and fetch its voices, so the first words come as the picture does. */
  _prepareOpening() {
    this._opening = this.entered ? welcomeBack() : greeting();
    for (const line of this._opening) this.voice.prefetch(line.script, line.speaker === 0 ? "theo" : "dex");
    this._prepareSoon(300);
  }

  /**
   * Have the server make every fixed line once (see voiceLines), so on air only the stories'
   * own words are new. Run once per server after setting the key: about 16,000 characters (about $0.50).
   */
  warmVoices() {
    return this.voice.warm(voiceLines());
  }

  /**
   * The anchor's script for a story: one short lead-in, the headline, and the summary
   * when the feed gave a clean one. On the World channel the lead-in names the topic.
   */
  writeScript(story, { rerun = false } = {}) {
    // "I tried making X" is the author's voice, not the anchor's: retell turns it round.
    const told = this._told(story);
    const summary = told.summary ? ` ${ensurePeriod(told.summary)}` : "";
    let lead;
    if (rerun) lead = "In case you missed it:";
    else {
      const intros = TOPIC_INTROS[story.topic] || TOPIC_INTROS.models;
      lead = intros[this._introIndex++ % intros.length];
    }
    return `${lead} ${ensurePeriod(told.title)}${summary}`.slice(0, MAX_SCRIPT);
  }

  /** The story as the anchor would say it: their lead-in, the story's own words, their sign-off. */
  styleScript(story, speaker, { lead: withLead = true } = {}) {
    const style = STYLE[speaker] || STYLE[0];
    // Bad news (a lawsuit, a breach, layoffs, harm) gets a serious lead-in and no cheerful sign-off.
    const serious = isSerious(story);
    const leads = serious ? SERIOUS_LEADS[speaker] : (story.topic === "security" && style.security) || style.leads;
    const lead = withLead ? pick(leads) : "";
    // A sign-off most of the time, not every time: a real anchor does not close every story.
    const closer = !serious && Math.random() < 0.75 ? ` ${pick(style.closers)}` : "";
    const told = this._told(story);
    const summary = told.summary ? ` ${ensurePeriod(told.summary)}` : "";
    return `${withLead ? `${lead} ` : ""}${ensurePeriod(told.title)}${summary}${closer}`.slice(0, MAX_SCRIPT);
  }

  /** Who leads a story: by its channel, but never more than MAX_RUN stories in a row. */
  castFor(story) {
    let lead = CAST[story?.topic];
    if (lead === undefined) lead = 1 - this.lastSpeaker;
    if (lead === this.lastStorySpeaker && this.sameRun >= MAX_RUN) lead = 1 - lead;
    return lead;
  }

  /** The other anchor's one-sentence reaction to a story just read by `speaker`. */
  banterLine(speaker, topic) {
    const lines = BANTER[1 - speaker];
    // The channel's own reactions some of the time, else the general ones. Each list is one
    // deck for the whole broadcast, so a general line is not dealt again from another channel.
    const own = lines[topic];
    if (own?.length && Math.random() < 0.35) return pick(own);
    return pick(lines.any);
  }

  /** The mode the studio shows: the agents' work first, then a live call, then the broadcast. */
  studioMode() {
    const base = this.power !== "on" || !this.active ? "idle" : this.active.kind === "call" || this.active.waiting || this.active.askMore ? "call" : "onair";
    return modeOf(base, this.desk?.kind);
  }

  /**
   * Show what the agents are doing: Theo and Dex work at their consoles and the control deck
   * lights the active agents. activity: {kind, agents, tool, host, producer} or null.
   */
  setDeskActivity(activity) {
    this.desk = activity && activity.kind ? { agents: [], ...activity } : null;
    // A visitor's turn shows on the scope as a ping; the producer's background work does not.
    this.anchor.setWork(this.desk?.kind || null, { ping: Boolean(this.desk) && !this.desk.producer });
    if (BROWSER) this.renderDeck();
    return { ok: true, mode: this.studioMode() };
  }

  /** The line to the desk: while the visitor is in the chat dock, Dex checks the incoming line. */
  setHail(open) {
    this.lineOpen = Boolean(open);
    this.anchor.setHail(this.lineOpen);
    if (BROWSER) this.renderDeck();
    return { ok: true, open: this.lineOpen };
  }

  _identScript() {
    const c = topicOf(this.topic);
    const channel = TOPIC_IDS.indexOf(this.topic) + 1;
    const lines = [
      `You're watching AI Radar, channel ${channel}, ${c.name}. More from the radar, right after this.`,
      `This is AI Radar. Models, tools and research, around the clock.`,
      `Stay tuned. The radar keeps spinning on channel ${channel}.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // ---- operations ----------------------------------------------------------------

  /** Scan one channel's sources (default: the tuned channel) and merge the results. */
  async scanNews({ topic = this.topic, force = false } = {}) {
    const channel = this.channels[topic];
    if (!channel) return { ok: false, reason: `Unknown channel. Use one of: ${TOPIC_IDS.join(", ")}.`, field: "topic" };
    if (channel.status === "scanning") return { ok: false, reason: "That channel is already being scanned." };
    if (!BROWSER) return { ok: false, reason: "Feeds are scanned only in a browser." };
    channel.status = "scanning";
    this._changed();
    const before = new Set(this.stories.map((s) => s.id));
    const result = await scanChannel(topic, { force });
    this.live.set(topic, result.stories);
    this._mergeStories();
    Object.assign(channel, {
      status: "ready", scannedAt: result.scannedAt, liveCount: result.liveCount, rawCount: result.rawCount,
      rejected: result.rejected, sources: result.sources, fromCache: result.fromCache,
    });
    this._changed();
    return {
      ok: true, topic, liveCount: result.liveCount, rawCount: result.rawCount,
      newCount: this.stories.filter((s) => !before.has(s.id)).length,
      rejectedCount: result.rejected.length, fromCache: result.fromCache,
      storyCount: this.storiesIn("all", topic).length, sources: result.sources, version: this.version,
    };
  }

  /** Scan the tuned channel first, then every other channel, one at a time. */
  async scanAll({ force = false } = {}) {
    // The tuned channel first, then competitions (their deadlines show on the first screen).
    const order = [...new Set([this.topic, "events", ...TOPIC_IDS])];
    for (const id of order) {
      if (this.channels[id].status === "scanning") continue;
      const result = await this.scanNews({ topic: id, force });
      if (result.ok && !result.fromCache) await new Promise((r) => setTimeout(r, 1500));
    }
    return { ok: true, version: this.version };
  }

  /** Keep the news fresh: rescan the tuned channel often and everything else in the background. */
  startLiveScanning() {
    if (this._liveScan || !BROWSER) return;
    this._liveScan = [
      setInterval(() => this.scanNews({ force: true }), TUNED_RESCAN_MS),
      setInterval(() => this.scanAll({ force: true }), FULL_RESCAN_MS),
    ];
  }

  /** Turn the channel knob: World or one topic. On air, the broadcast switches over. */
  setTopic(topic) {
    if (!this.channels[topic]) {
      return { ok: false, reason: `Unknown channel. Use one of: ${TOPIC_IDS.join(", ")}.`, field: "topic" };
    }
    if (topic === this.topic) return { ok: true, topic, version: this.version };
    this.topic = topic;
    this._changed();
    if (this.channels[topic].status === "idle") this.scanNews({ topic });
    this._retune();
    return { ok: true, topic, storyCount: this.storiesIn().length, version: this.version };
  }

  /**
   * Check a script against its story: every number it states must appear in the story's
   * headline, summary or date. Returns {ok: true} or {ok: false, reason}.
   */
  checkScript(story, script) {
    const known = numbersIn(`${story.title} ${story.summary || ""} ${story.year || ""} ${story.publishedAt ? story.publishedAt.slice(0, 4) : ""}`);
    const unknown = [...numbersIn(script)].filter((n) => !known.has(n));
    if (unknown.length) {
      return { ok: false, reason: `The script for "${story.title}" states ${unknown.join(", ")}, which the story does not. Use only the story's own numbers.`, field: "script" };
    }
    return { ok: true };
  }

  /**
   * Check a broadcast without changing anything: every story is in the feed and every
   * script is fact-checked. Returns {ok, lineup} with each story's details for the
   * approval card, or {ok: false, reason, field}.
   */
  checkBroadcast(items) {
    if (!Array.isArray(items) || !items.length) return { ok: false, reason: "Choose at least one story.", field: "items" };
    if (items.length > 10) return { ok: false, reason: "Broadcast at most 10 stories at a time.", field: "items" };
    const lineup = [];
    for (const item of items) {
      const story = this.findStory(item?.storyId);
      if (!story) return { ok: false, reason: `No story with id "${item?.storyId}" is in the studio feed.`, field: "storyId" };
      if (item.script !== undefined && (typeof item.script !== "string" || !item.script.trim())) {
        return { ok: false, reason: "A script must be non-empty text.", field: "script" };
      }
      if (item.script && item.script.length > MAX_SCRIPT) {
        return { ok: false, reason: `Keep each script under ${MAX_SCRIPT} characters.`, field: "script" };
      }
      if (item.script) {
        const fact = this.checkScript(story, item.script);
        if (!fact.ok) return fact;
      }
      lineup.push({
        storyId: story.id, title: story.title, source: story.source, url: story.url,
        topic: topicOf(story.topic).name, script: item.script?.trim() || null,
      });
    }
    return { ok: true, lineup };
  }

  /**
   * Put specific stories on air next, replacing what is on now. items: [{storyId, script?}].
   * A missing script uses the studio's own writer. After them, the nonstop broadcast
   * carries on. Returns at once with the lineup; the voice-over keeps running.
   */
  broadcast(items, { greeting = false } = {}) {
    const check = this.checkBroadcast(items);
    if (!check.ok) return check;
    const lineup = check.lineup.map((l) => ({
      storyId: l.storyId, script: l.script || this.writeScript(this.findStory(l.storyId)), kind: "story",
    }));
    if (greeting) lineup.unshift(...greeting());
    if (this.power === "off") this.powerOn(lineup);
    else if (this.power === "warming") this._pendingLineup = lineup;
    else this._restart(lineup);
    return {
      ok: true, status: "on_air",
      lineup: lineup.filter((l) => l.kind === "story").map((l) => ({ storyId: l.storyId, script: l.script })),
      version: this.version,
    };
  }

  /**
   * Search recent AI news to answer a question or check a tip. Reports that pass the screen
   * join the studio feed, so a verified tip can go on air with its sources.
   */
  async searchNews({ query, topic = "all" } = {}) {
    if (typeof query !== "string" || query.trim().length < 3) return { ok: false, reason: "Give a few words to search for.", field: "query" };
    if (!this.channels[topic]) return { ok: false, reason: `Unknown channel. Use one of: ${TOPIC_IDS.join(", ")}.`, field: "topic" };
    if (!BROWSER) return { ok: false, reason: "News search runs only in a browser." };
    const result = await searchNews(query.trim(), { topic });
    if (!result.ok) return result;
    for (const story of result.reports) if (story.onAirAllowed) this.found.set(story.id, story);
    this._mergeStories();
    this._changed();
    return {
      ok: true, query: result.query, count: result.reports.length,
      reports: result.reports.map((r) => ({
        id: r.onAirAllowed ? r.id : null, title: r.title, summary: r.summary, source: r.source,
        published: r.publishedAt ? r.publishedAt.slice(0, 10) : null, url: r.url, onAirAllowed: r.onAirAllowed,
      })),
    };
  }

  /**
   * Find real prompts, agent skills, AI tools or papers in public directories (never
   * written by AI Radar). The results also fill the Find screen. Never throws.
   * kind: prompts | skills | tools | papers; toolKind narrows tools (mcp, apps, packages,
   * models, free-models).
   */
  async find({ kind, query, limit = 8, toolKind = "all" } = {}) {
    if (!FIND_KINDS.includes(kind)) return { ok: false, reason: `Unknown kind. Use one of: ${FIND_KINDS.join(", ")}.`, field: "kind" };
    if (typeof query !== "string" || query.trim().length < 2) return { ok: false, reason: "Give a few words to search for.", field: "query" };
    if (kind === "tools" && !TOOL_KINDS.includes(toolKind)) return { ok: false, reason: `Unknown tool kind. Use one of: ${TOOL_KINDS.join(", ")}.`, field: "toolKind" };
    if (!BROWSER) return { ok: false, reason: "Search runs only in a browser." };
    const n = Math.max(1, Math.min(12, Math.round(limit) || 8));
    const q = query.trim().slice(0, 120);
    const run = { prompts: findPrompts, skills: findSkills, tools: findTools, papers: findPapers }[kind];
    // Only the newest search may fill the Find screen; an older, slower one only returns.
    const seq = (this.findSeq = (this.findSeq || 0) + 1);
    this.lastFind = { kind, query: q, toolKind, pending: true, result: null };
    renderFind(this);
    const result = await run(q, { limit: n, kind: toolKind });
    if (seq === this.findSeq) {
      this.lastFind = { kind, query: q, toolKind, pending: false, result };
      renderFind(this);
    }
    if (!result.ok) return result;
    return {
      ok: true, kind, query: q, count: result.count,
      results: result.results.map((r) => ({
        title: r.title, kind: r.kind, summary: r.summary, by: r.by || undefined, source: r.source,
        popularity: r.popularityLabel || undefined, url: new URL(r.url, BROWSER ? location.href : "https://example.org/").href,
        ...(r.text ? { promptText: r.text.slice(0, 700) + (r.text.length > 700 ? " [continues at the link]" : "") } : {}),
        ...(r.remote ? { remoteMcpUrl: r.remote } : {}),
      })),
      sources: result.sources,
    };
  }

  /**
   * A viewer's call on air: the named anchor says `text` live, with a LIVE CALL banner,
   * then the broadcast carries on. Only when the TV is on.
   */
  liveCall(anchorName, text) {
    const speaker = ANCHORS.findIndex((n) => n.toLowerCase() === String(anchorName || "").toLowerCase());
    const clean = String(text || "").replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 900);
    if (speaker < 0 || clean.length < 2) return { ok: false, reason: "Name Dex or Theo and give the words to say." };
    if (this.power !== "on") return { ok: false, reason: "The TV is off." };
    this._takeCall([{ storyId: null, kind: "call", speaker, script: clean }]);
    return { ok: true, anchor: ANCHORS[speaker] };
  }

  /**
   * A call answered by both: each line is said live by its own anchor, in order,
   * in that anchor's voice, while the other listens. lines: [{anchor, text}].
   */
  liveDialogue(lines) {
    if (!Array.isArray(lines) || !lines.length) return { ok: false, reason: "Give at least one line." };
    const lineup = [];
    for (const line of lines.slice(0, 6)) {
      const speaker = ANCHORS.findIndex((n) => n.toLowerCase() === String(line?.anchor || "").toLowerCase());
      const clean = String(line?.text || "").replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 900);
      if (speaker < 0 || clean.length < 2) return { ok: false, reason: "Each line names Dex or Theo and gives the words to say." };
      lineup.push({ storyId: null, kind: "call", speaker, script: clean });
    }
    if (this.power !== "on") return { ok: false, reason: "The TV is off." };
    // _takeCall plays from this list and takes its first line off at once, so name the anchors first.
    const anchors = lineup.map((l) => ANCHORS[l.speaker]);
    this._takeCall(lineup);
    return { ok: true, anchors };
  }

  /**
   * The desk's answer goes on air. When it comes in while the caller line or a "still checking"
   * line is being said, that line ends first and the answer follows at once, instead of cutting
   * the anchor off mid-sentence.
   */
  _takeCall(lineup) {
    this._hold = null;
    if (this.active?.waiting && this.power === "on" && !this.paused) {
      this.lineup = lineup;
      this._changed();
      return;
    }
    this._restart(lineup);
  }

  /**
   * A card or dialog waits for the visitor's approval: an outside source to contact, or a story
   * to put on air (site.js). While a caller waits, an anchor says so once, then they let the
   * visitor decide without talking over it.
   */
  awaitApproval(waiting) {
    this._approving = Boolean(waiting);
    if (!this._hold) return { ok: true, waiting: this._approving };
    if (!this._approving) {
      this._hold.approvalSaid = false;
      // The desk works on: the next "still checking" line comes after a full pause.
      if (this.listening && !this.active) this._waitForCaller(this._broadcastToken, 400);
    }
    return { ok: true, waiting: this._approving };
  }

  /** Stories that will play next on this channel and have no AI script yet. */
  /** What the anchors said lately (lead-ins, reactions, openings): the producer avoids these. */
  recentLines(n = 8) {
    return fresh.lately(n);
  }

  upcomingWithoutScripts(n = 3, { skip = 0 } = {}) {
    // `skip`: the stories about to air while the TV is on, too soon for a script to be written.
    const ahead = this.power === "on" ? new Set(this._nextStories(skip).map((s) => s.id)) : new Set();
    return this.storiesIn().filter((s) => !this.airedAt.has(s.id) && !this.aiScripts.has(s.id) && !ahead.has(s.id)).slice(0, n);
  }

  /**
   * Keep AI-written scripts for upcoming stories (the AI producer). Each script is
   * fact-checked; refused ones are listed with their reason.
   */
  saveScripts(items) {
    if (!Array.isArray(items) || !items.length) return { ok: false, reason: "Give at least one script.", field: "items" };
    const saved = [];
    const refused = [];
    for (const item of items) {
      const story = this.findStory(item?.storyId);
      if (!story) { refused.push({ storyId: item?.storyId, reason: "No such story in the feed." }); continue; }
      const check = typeof item.script === "string" && item.script.trim().length >= 20
        ? this.checkScript(story, item.script) : { ok: false, reason: "The script is empty or too short." };
      if (!check.ok) { refused.push({ storyId: story.id, reason: check.reason }); continue; }
      this.aiScripts.set(story.id, item.script.trim().slice(0, MAX_SCRIPT));
      saved.push(story.id);
    }
    this._changed();
    return { ok: saved.length > 0, saved, refused, ...(saved.length ? {} : { reason: "No script was saved." }) };
  }

  broadcastStory(storyId, script) {
    return this.broadcast([{ storyId, script }]);
  }

  /** Pause the station (no UI button: the station is meant to run nonstop). */
  stopBroadcast() {
    this.paused = true;
    this._broadcastToken++;
    this._interrupt("stopped");
    this._changed();
    return { ok: true, status: "paused", version: this.version };
  }

  resumeBroadcast() {
    if (this.power !== "on") return { ok: false, reason: "The TV is off. The visitor has to press the power button." };
    this._restart([]);
    return { ok: true, status: "on_air", version: this.version };
  }

  setMuted(muted) {
    if (!muted) this.voice.unlock(); // a tap on Sound on allows speech on phones too
    this.voice.setMuted(muted);
    this._changed();
    this._showVolume();
    return { ok: true, muted: this.voice.muted, volume: this.volume };
  }

  /** The volume knob, 0–10. Turning it up unmutes; 0 mutes. Applies from the next sentence. */
  setVolume(level) {
    if (!Number.isInteger(level) || level < 0 || level > 10) {
      return { ok: false, reason: "Volume is a whole number from 0 to 10.", field: "level" };
    }
    this.volume = level;
    this.voice.setOptions({ volume: level / 10 });
    if (level === 0 && !this.voice.muted) this.voice.setMuted(true);
    else if (level > 0 && this.voice.muted) this.voice.setMuted(false);
    this._changed();
    this._showVolume();
    return { ok: true, volume: this.volume, muted: this.voice.muted };
  }

  _showVolume() {
    if (this.power !== "on") return;
    const osd = document.querySelector("#volume-osd");
    document.querySelector("#volume-bars").textContent = this.voice.muted ? "MUTE"
      : "█".repeat(this.volume) + "░".repeat(10 - this.volume);
    osd.hidden = false;
    clearTimeout(this._volumeTimer);
    this._volumeTimer = setTimeout(() => { osd.hidden = true; }, 1600);
  }

  setVoice({ voiceURI, rate, pitch } = {}) {
    if (voiceURI !== undefined && voiceURI !== "" && !this.voice.voices.some((v) => v.voiceURI === voiceURI)) {
      return { ok: false, reason: "That voice is not available in this browser.", field: "voiceURI" };
    }
    this.voice.setOptions({ voiceURI: voiceURI || undefined, rate, pitch });
    this._changed();
    return { ok: true, voice: this.getState().voice };
  }

  /**
   * The power button. Off → on plays the CRT warm-up and starts (or resumes) the nonstop
   * broadcast; on → off collapses the picture and pauses it. Must be called from a click
   * the first time, so the browser allows speech.
   */
  togglePower() {
    return this.power === "off" ? this.powerOn() : this.powerOff();
  }

  powerOn(lineup = null) {
    if (this.power !== "off") return { ok: true, power: this.power };
    this._pendingLineup = lineup;
    this.voice.unlock(); // a click allows speech from here on
    const first = !this.entered;
    this.entered = true;
    this.power = "warming";
    this._crt("crt-on", 1300);
    playPowerOnSound(this.voice.muted);
    this._changed();
    clearTimeout(this._powerTimer);
    this._powerTimer = setTimeout(() => {
      this.power = "on";
      // The opening picked (and voiced) while the TV was off, else a new one.
      const opening = this._opening || (first ? greeting() : welcomeBack());
      this._opening = null;
      this._restart(this._pendingLineup ? [{ ...ON_REQUEST }, ...this._pendingLineup] : opening);
      this._pendingLineup = null;
      this.startLiveScanning();
    }, 1100);
    return { ok: true, power: "warming" };
  }

  powerOff() {
    if (this.power === "off") return { ok: true, power: "off" };
    clearTimeout(this._powerTimer);
    clearTimeout(this._retuneTimer);
    this.power = "off";
    this.paused = true;
    this._broadcastToken++;
    this._interrupt("stopped");
    this._crt("crt-off", 700);
    this._changed();
    if (this.voice.cloudReady) this._prepareOpening();   // "welcome back", ready for the next switch-on
    return { ok: true, power: "off" };
  }

  /** Kept for the agent API: entering the studio is switching the TV on. */
  enterStudio() {
    return this.powerOn();
  }

  _crt(className, ms) {
    if (!BROWSER) return;
    const monitor = document.querySelector("#monitor");
    monitor.classList.remove("crt-on", "crt-off", "static");
    void monitor.offsetWidth;
    monitor.classList.add(className);
    clearTimeout(this._crtTimer);
    this._crtTimer = setTimeout(() => monitor.classList.remove(className), ms + 50);
  }

  // ---- broadcast engine ----------------------------------------------------------

  _restart(lineup) {
    this.paused = false;
    this._interrupt("replaced");
    this.lineup = lineup;
    this._playNext(++this._broadcastToken);
  }

  /** After a channel change: a short burst of static, then the new channel. */
  _retune() {
    if (this.power !== "on") return;
    clearTimeout(this._retuneTimer);
    this._broadcastToken++;
    this._interrupt("switched");
    this._changed();
    this._reviewSoon(200);   // the new channel's stories go to the editor at once
    this._retuneTimer = setTimeout(() => {
      const c = topicOf(this.topic);

      this._restart([{
        storyId: null, kind: "ident",
        script: c.id === "all" ? "You're watching AI Radar, all channels." : `You're watching the ${c.name} channel on AI Radar.`,
      }]);
    }, 450);
  }

  _interrupt(reason) {
    if (this.active) this._finishActive(reason);
    this.lineup = [];
    this._reactTo = null;
    this.listening = false;
    this._hold = null;
    clearTimeout(this._listenTimer);
    this.voice.stop();
    this.anchor.setState("idle");
  }

  _finishActive(outcome) {
    const a = this.active;
    if (a.kind === "story") {
      this.history.unshift({
        storyId: a.storyId, title: a.title, topic: a.topic, source: a.source,
        script: a.script, startedAt: a.startedAt, endedAt: new Date().toISOString(), outcome, rerun: a.rerun,
      });
      this.history.length = Math.min(this.history.length, MAX_HISTORY);
    }
    this.active = null;
  }

  /** The next story: fresh ones first; when the channel runs dry, rescan and rerun the oldest. */
  _pickNext() {
    if (this.storiesSinceIdent >= IDENT_EVERY) {
      this.storiesSinceIdent = 0;
      return { storyId: null, script: this._identScript(), kind: "ident" };
    }
    let pool = this.storiesIn();
    if (!pool.length) pool = this.storiesIn("all");
    if (!pool.length) pool = this.storiesIn("all", "all");
    // A story the AI producer has already written goes first, so the anchors talk rather than read.
    const unaired = pool.filter((s) => !this.airedAt.has(s.id));
    const fresh = unaired.find((s) => s.top) || unaired.find((s) => this.aiScripts.has(s.id)) || unaired[0];
    if (fresh) {
      const ai = this.aiScripts.get(fresh.id);
      return { storyId: fresh.id, script: ai || this.writeScript(fresh), kind: "story", aiScript: Boolean(ai), unwritten: !ai };
    }
    if (Date.now() - this._lastExhaustedScan > EXHAUSTED_RESCAN_MS) {
      this._lastExhaustedScan = Date.now();
      this.scanNews({ force: true });
    }
    const oldest = [...pool].sort((a, b) => this.airedAt.get(a.id) - this.airedAt.get(b.id))[0];
    return oldest ? { storyId: oldest.id, script: this.writeScript(oldest, { rerun: true }), kind: "story", rerun: true } : null;
  }

  async _playNext(token) {
    if (token !== this._broadcastToken || this.paused || this.power === "off") return;
    this.listening = false;
    let item = this.lineup.shift();
    if (!item && this._reactTo) {
      // Between stories of the nonstop broadcast, the other one chimes in more often than not.
      const about = this._reactTo;
      this._reactTo = null;
      if (Math.random() < 0.6) item = { storyId: null, kind: "banter", speaker: 1 - about.speaker, script: this.banterLine(about.speaker, about.topic) };
    }
    if (!item) item = this._pickNext();
    if (!item) {
      this.anchor.setState("idle");
      this._changed();
      this._broadcastTimer = setTimeout(() => this._playNext(token), 5000);
      return;
    }
    const story = item.storyId ? this.findStory(item.storyId) : null;
    // Stories go to the one who leads their channel; everything else takes turns.
    // An AI-written script is in the voice of its channel's lead, so that anchor reads it.
    const speaker = item.speaker ?? (story && item.aiScript && CAST[story.topic] !== undefined ? CAST[story.topic]
      : story ? this.castFor(story) : 1 - this.lastSpeaker);
    let script = item.script;
    // An AI-written opening or sign-off that repeats something said lately is dropped.
    if (item.aiScript) script = fresh.freshen(script);
    // A top story opens with the news-flash line and who is reporting it (instead of the usual lead-in).
    const top = item.kind === "story" && !item.rerun && Boolean(story?.top);
    if (item.unwritten && story) script = this.styleScript(story, speaker, { lead: !top });
    if (top) {
      const reporting = reportingLine(story.outlets, KNOWN_OUTLETS);
      script = `${pick(BREAKING[speaker])}${reporting ? ` ${reporting}` : ""} ${script}`;
    }
    if (item.kind === "story" && !item.aiScript && this.lastKind === "story" && speaker !== this.lastSpeaker && Math.random() < 0.4) {
      script = `Thanks, ${ANCHORS[this.lastSpeaker]}. ${script}`;
    }
    const handoff = speaker !== this.lastSpeaker && this.lastKind !== null;
    this.lastSpeaker = speaker;
    this.lastKind = item.kind;
    if (item.kind === "story") {
      this.sameRun = speaker === this.lastStorySpeaker ? this.sameRun + 1 : 1;
      this.lastStorySpeaker = speaker;
    }
    this.anchor.setSpeaker(speaker);
    this.active = {
      kind: item.kind, storyId: item.storyId, script, rerun: Boolean(item.rerun), aiScript: Boolean(item.aiScript), top,
      waiting: Boolean(item.callerIn || item.hold),   // said while a caller waits for the desk's answer
      askMore: Boolean(item.askMore),                 // after the answer: any other questions?
      anchor: ANCHORS[speaker],
      title: story ? story.title : "AI Radar",
      topic: story ? story.topic : null,
      source: story ? story.source : null, url: story ? story.url : null,
      publishedAt: story ? story.publishedAt : null, startedAt: new Date().toISOString(),
    };
    if (story) {
      this.airedAt.set(story.id, Date.now());
      for (const id of story.memberIds || []) this.airedAt.set(id, Date.now());
      this.storiesSinceIdent++;
    }
    this.anchor.setState("talking");
    // Body language: they look at each other on a handoff, react to breaking news,
    // and Theo narrows his eyes on a security story.
    if (handoff) this.anchor.react("handoff");
    const justIn = story?.publishedAt && Date.now() - new Date(story.publishedAt).getTime() < JUST_IN_MS;
    if (top || (item.kind === "story" && justIn && !item.rerun)) this.anchor.react("breaking");
    else if (story?.topic === "security") this.anchor.react("skeptical");
    this._changed();
    // While this plays, the next stories' voices get ready (after this one's first sentence has gone out).
    this._prepareSoon(400);
    this._reviewSoon(2000);
    this._writeSoon(2500);
    const outcome = await this.voice.speak(script, this._voiceFor(speaker));
    if (token !== this._broadcastToken) return;
    this._finishActive(outcome === "error" ? "error" : "ended");
    // The co-host's quip follows good news only, never a lawsuit or a breach.
    if (item.kind === "story" && outcome === "ended" && story && !isSerious(story)) this._reactTo = { speaker, topic: story.topic };
    this.anchor.setState("idle");
    // After answering a caller, the co-host asks whether there is more, then they wait a few
    // seconds, as on a real call, before the news goes on. A new question restarts the broadcast
    // and ends the wait at once. While the desk is still working on a question, they say so
    // now and then (_waitForCaller), and an answer that came in during this line plays now.
    if (item.askMore || item.callerIn || item.hold) {
      if (this.lineup.length) {
        this._changed();
        setTimeout(() => this._playNext(token), 350);
        return;
      }
      this.listening = true;
      this._changed();
      this._waitForCaller(token, item.askMore ? this._listenMs() : 300);
      return;
    }
    const answered = item.kind === "call" && !this.lineup.length;
    if (answered) {
      const lines = ASK_MORE[1 - speaker];
      this.lineup.push({ storyId: null, kind: "banter", askMore: true, speaker: 1 - speaker, script: pickCall(lines) });
    }
    this._changed();
    // A short breath between stories, then the next one.
    setTimeout(() => this._playNext(token), answered ? 500 : item.kind === "story" && this._reactTo ? 350 : 700);
  }

  /**
   * A visitor's question has come in: the one on air stops, says a caller is on the line,
   * and they wait until the answer is ready. Returns false when nothing was on.
   */
  pickUp() {
    if (this.power !== "on" || this.paused) return false;
    // The one on air takes the call; when nobody is talking, either of them does.
    const onAir = this.active ? ANCHORS.indexOf(this.active.anchor) : -1;
    const speaker = onAir >= 0 ? onAir : Math.round(Math.random());
    const token = ++this._broadcastToken;
    this._interrupt("caller");
    this._hold = { said: 0, kinds: new Set(), approvalSaid: false };
    this.lineup = [{ storyId: null, kind: "banter", callerIn: true, speaker, script: pickCall(CALLER_IN[speaker]) }];
    this._playNext(token);
    return true;
  }

  /**
   * The line is open: stay quiet for `ms`, then back to the news. While the desk is still working
   * on the caller's question, the anchors say so now and then instead (_holdLine), and while the
   * visitor types the next question, they keep waiting. `since`: when the last line ended.
   */
  _waitForCaller(token, ms, since = Date.now()) {
    clearTimeout(this._listenTimer);
    this._listenTimer = setTimeout(() => {
      if (token !== this._broadcastToken) return;
      if (this._hold && (this.desk?.visitor || this._approving)) {
        const hold = this._holdLine(Date.now() - since);
        if (!hold) return this._waitForCaller(token, 400, since);
        this.lineup = [hold];
        return this._playNext(token);
      }
      if (this.isTyping?.()) return this._waitForCaller(token, 1500, since);
      // The answer goes on air a moment after the desk finishes: the line stays open that long.
      const left = LISTEN_MS - (Date.now() - since);
      if (this._hold && left > 0) return this._waitForCaller(token, left, since);
      this._hold = null;
      this._playNext(token);
    }, ms);
  }

  /**
   * The next line while the desk works on a caller's question, after `quiet` ms of silence, or
   * null when it is not time yet. First that they are checking, then what the desk is doing
   * (each kind of work named once a call), then that they are still on it, taking turns, at
   * most one line per gap in holdGaps. A card waiting for the visitor is named once.
   */
  _holdLine(quiet) {
    const h = this._hold;
    if (!h) return null;
    const speaker = 1 - this.lastSpeaker;
    const line = (pool) => ({ storyId: null, kind: "hold", hold: true, speaker, script: pickCall(pool[speaker]) });
    if (this._approving) {
      if (h.approvalSaid || quiet < 400) return null;
      h.approvalSaid = true;
      return line(HOLD_APPROVAL);
    }
    if (h.said >= this.holdGaps.length || quiet < this.holdGaps[h.said]) return null;
    const kind = this.desk?.kind;
    let pool = h.said ? HOLD_STILL : HOLD_FIRST;
    if (h.said && HOLD_WORK[kind] && !h.kinds.has(kind)) {
      h.kinds.add(kind);
      pool = HOLD_WORK[kind];
    }
    h.said++;
    return line(pool);
  }

  /** How long the anchors wait for the caller's next question: longer while the visitor is in the chat dock. */
  _listenMs() {
    return LISTEN_MS;
  }

  /**
   * Theo and Dex each get their own studio voice (tts-proxy.php) when the site has one,
   * otherwise a distinct pitch of the browser's best male voice, so you can tell them apart.
   */
  _voiceFor(speaker) {
    const uri = this.voice.pick("male");
    return { voiceURI: uri || undefined, pitch: speaker === 0 ? 1.04 : 0.84, anchor: speaker === 0 ? "theo" : "dex" };
  }

  _onWord({ charIndex, charLength }) {
    const scriptText = this.active?.script || "";
    const spokenWord = scriptText.slice(charIndex, charIndex + charLength);
    this.anchor.word(charLength, spokenWord, scriptText, charIndex);
    // A number is a key fact: the speaker points at the radar or holds up a card.
    if (/\d/.test(spokenWord)) this.anchor.react("fact");
    if (!BROWSER) return;
    const box = document.querySelector("#prompter-text");
    const words = box.querySelectorAll("[data-start]");
    let current = null;
    for (const w of words) {
      const start = Number(w.dataset.start);
      if (start <= charIndex) current = w; else break;
    }
    words.forEach((w) => w.classList.toggle("upcoming", Number(w.dataset.start) > charIndex));
    box.querySelector(".now")?.classList.remove("now");
    if (current) {
      current.classList.add("now");
      // Roll the captions so the line being spoken is the top one of the two.
      box.scrollTop = Math.max(0, current.offsetTop);
    }
  }

  // ---- rendering -----------------------------------------------------------------

  _changed() {
    this.version++;
    this.render();
  }

  render() {
    const a = this.active;
    document.body.dataset.power = this.power;
    document.body.dataset.muted = String(this.voice.muted);
    const power = document.querySelector("#btn-power");
    power.setAttribute("aria-pressed", String(this.power !== "off"));
    power.textContent = this.power === "off" ? "Play briefing" : "Stop briefing";
    const mute = document.querySelector("#btn-mute");
    mute.setAttribute("aria-pressed", String(this.voice.muted));
    mute.textContent = this.voice.muted ? "Sound off" : "Sound on";

    // The corner tag: what is on air, and a link to the full story.
    const bug = document.querySelector("#story-bug");
    bug.hidden = !a;
    if (a) {
      const where = a.topic ? topicOf(a.topic) : null;
      const justIn = a.publishedAt && Date.now() - new Date(a.publishedAt).getTime() < JUST_IN_MS;
      const tag = a.kind === "call" || a.waiting || a.askMore ? `LIVE CALL · ${a.anchor.toUpperCase()}` : a.kind === "banter" ? `${a.anchor.toUpperCase()} REACTS`
        : a.kind === "greeting" ? "WELCOME" : a.kind === "ident" ? "AI RADAR 24/7"
        : [justIn ? "JUST IN" : a.rerun ? "ENCORE" : a.aiScript ? "AI PRODUCER" : "ON RADAR",
          where && where.id !== "all" ? where.name.toUpperCase() : null].filter(Boolean).join(" · ");
      document.querySelector("#bug-kicker").textContent = tag;
      document.querySelector("#bug-source").textContent = a.url ? `${a.source} ↗` : "";
      if (a.url) {
        bug.href = a.url;
        bug.setAttribute("aria-label", `Read the full story on ${a.source}`);
      } else {
        bug.removeAttribute("href");
        bug.removeAttribute("aria-label");
      }
    }
    document.querySelector("#channel-name").textContent = topicOf(this.topic).name;
    document.querySelector("#anchor-status").textContent = this.power === "off" ? "The briefing is off."
      : a ? `${a.anchor} is reading “${a.title}”.` : "Switching channels…";

    this.anchor.setMode(this.power !== "on" || !a ? "idle" : a.kind === "call" || a.waiting || a.askMore ? "call" : "onair");
    this.renderPrompter();
    this.renderChannel();
    if (!BROWSER) return;
    this.renderScene();
    this.renderDeck();
    this.renderFinding();
    this.renderFeed();
    this.renderRadar();
    this.renderDeadlines();
    this.renderEventsView();
    this.renderSourcesView();
  }

  renderPrompter() {
    if (!BROWSER) return;
    const box = document.querySelector("#prompter-text");
    const script = this.active?.script || "";
    if (box.dataset.script === script) return;
    box.dataset.script = script;
    box.replaceChildren();
    box.scrollTop = 0;
    if (!script) return;
    const re = /\S+/g;
    let match;
    while ((match = re.exec(script))) {
      const span = element("span", `${match[0]} `, "upcoming");
      span.dataset.start = String(match.index);
      box.append(span);
    }
  }

  /** The channel tabs, and a short burst of static in the monitor on a change. */
  renderChannel() {
    if (!BROWSER) return;
    const tuner = document.querySelector("#channel-tabs");
    document.querySelectorAll("[data-topic]").forEach((el) => {
      const tuned = el.dataset.topic === this.topic;
      el.setAttribute("aria-selected", String(tuned));
      // Keep the tuned channel in view when the row scrolls, without moving the page.
      if (tuned && tuner.dataset.topic !== this.topic) {
        tuner.dataset.topic = this.topic;
        tuner.scrollLeft = el.offsetLeft - (tuner.clientWidth - el.offsetWidth) / 2;
      }
    });
    const screen = document.querySelector("#monitor");
    if (screen.dataset.channel !== this.topic) {
      screen.dataset.channel = this.topic;
      if (this.power !== "on") return;
      screen.classList.remove("static");
      void screen.offsetWidth;
      screen.classList.add("static");
    }
  }

  /** Tell the studio canvas what is tuned: the channel number and sector, the live count and the blips. */
  renderScene() {
    const channels = TOPICS.filter((t) => t.id !== "all");
    const live = this.stories.filter((s) => s.origin === "live");
    const key = `${live.length}|${this.topic}`;
    if (this._sceneKey === key) return;
    this._sceneKey = key;
    const step = (Math.PI * 2) / channels.length;
    const blips = [];
    for (const s of live) {
      const i = channels.findIndex((t) => t.id === s.topic);
      if (i < 0) continue;
      let h = 0;
      for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const days = s.publishedAt ? (Date.now() - new Date(s.publishedAt).getTime()) / 86400000 : 20;
      // The same place as on the radar card: the channel's sector, newer items nearer the centre.
      blips.push([-Math.PI / 2 + i * step + step * (0.12 + (h % 1000) / 1000 * 0.76), 0.12 + Math.min(Math.max(days, 0), 30) / 30 * 0.8, days < 2]);
    }
    blips.sort((x, y) => Number(y[2]) - Number(x[2]));
    this.anchor.setScene({
      code: TOPIC_IDS.indexOf(this.topic) + 1,
      sector: channels.findIndex((t) => t.id === this.topic),
      count: live.filter((s) => this.topic === "all" || s.topic === this.topic).length,
      blips,
    });
  }

  /** The control deck beside the monitor: tally, readouts, who is talking and which agents work. */
  renderDeck() {
    const a = this.active;
    const mode = this.studioMode();
    const off = this.power === "off" && !this.desk;
    const tally = document.querySelector("#tally");
    tally.dataset.mode = off ? "off" : mode;
    document.querySelector("#tally-label").textContent = off ? "OFF AIR" : STUDIO_MODES[mode].label;
    document.body.dataset.busy = String(Boolean(this.desk));

    const live = this.stories.filter((s) => s.origin === "live" && (this.topic === "all" || s.topic === this.topic));
    document.querySelector("#channel-code").textContent = `CH ${String(TOPIC_IDS.indexOf(this.topic) + 1).padStart(2, "0")}`;
    document.querySelector("#deck-live").textContent = String(live.length);
    document.querySelector("#deck-aired").textContent = String(this.airedAt.size);
    const scans = (this.topic === "all" ? Object.values(this.channels) : [this.channels[this.topic]]).map((c) => c.scannedAt).filter(Boolean).sort();
    document.querySelector("#deck-scan").textContent = scans.length
      ? new Date(scans[scans.length - 1]).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--";

    const working = Boolean(this._hold && this.desk?.visitor);   // a caller waits for the desk's answer
    // With the TV off, the line under the title names the tuned channel instead of "On air".
    const tuned = `CH ${String(TOPIC_IDS.indexOf(this.topic) + 1).padStart(2, "0")} · ${topicOf(this.topic).name}`;
    document.querySelector("#now-kicker").textContent = this.power === "off" && !a && !working && !this.listening ? tuned
      : !a ? (working ? "Live call" : this.listening ? "Line open" : "On air") : a.kind === "call" || a.waiting || a.askMore ? "Live call" : a.top ? `Top story, read by ${a.anchor}` : `On air, read by ${a.anchor}`;
    document.querySelector("#now-title").textContent = this.power === "off" ? "Press play and the briefing starts."
      : !a ? (working ? "The desk is working on your question." : this.listening ? "Waiting for your next question." : "Tuning the channel…")
      : a.kind === "story" ? a.title
      : a.kind === "call" ? `${a.anchor} answers the caller on air.`
      : a.kind === "hold" ? "The desk is working on your question."
      : a.waiting ? `${a.anchor} takes your call.`
      : a.askMore ? `${a.anchor} asks if you have more questions.`
      : a.kind === "banter" ? `${a.anchor} reacts to the last story.`
      : "AI Radar, around the clock.";
    ANCHORS.forEach((name) => {
      document.querySelector(`#voice-${name.toLowerCase()}`).dataset.on = String(Boolean(a) && a.anchor === name && this.power === "on");
    });
    const about = a?.storyId || this.history[0]?.storyId;
    document.querySelector("#btn-ask-story").disabled = !about || !this.findStory(about);

    const desk = this.desk;
    document.querySelectorAll("[data-agent]").forEach((el) => { el.dataset.active = String(Boolean(desk?.agents.includes(el.dataset.agent))); });
    document.querySelectorAll("[data-mcp]").forEach((el) => { el.dataset.active = String(Boolean(desk?.host) && desk.host === el.dataset.mcp); });
    document.querySelector("#desk-activity").textContent = !desk ? "Standing by"
      : [desk.producer ? "AI producer" : null, desk.agents.join(" → ") || null, desk.tool || null, desk.host || null].filter(Boolean).join(" · ");
  }

  /** The line under the title: this week's finding, every number counted from the feed. */
  renderFinding() {
    const week = Date.now() - 7 * 24 * 3600 * 1000;
    const live = this.stories.filter((s) => s.origin === "live");
    const mcp = live.filter((s) => s.sourceId === "mcp-registry").length;
    const closing = this.upcomingDeadlines().filter((e) => e.daysLeft <= 14).length;
    const models = live.filter((s) => s.sourceId === "hf-trending").length;
    const fresh = live.filter((s) => s.publishedAt && new Date(s.publishedAt).getTime() > week).length;
    const ready = TOPIC_IDS.filter((id) => id !== "all").every((id) => this.channels[id].status === "ready");
    const line = document.querySelector("#finding");
    const key = !ready && fresh + mcp + models === 0 ? "scanning" : `${fresh}|${mcp}|${closing}|${models}`;
    if (line.dataset.key === key) return;
    line.dataset.key = key;
    if (key === "scanning") { line.textContent = "Scanning AI labs, Hugging Face, Hacker News, the MCP Registry and Devpost…"; return; }
    const stat = (n, label) => {
      const item = element("span", undefined, "stat");
      item.append(element("b", String(n)), label);
      return item;
    };
    line.replaceChildren(
      stat(fresh, "items in the last 7 days"), stat(mcp, "MCP servers updated this week"),
      stat(closing, `competition${closing === 1 ? "" : "s"} closing within 14 days`), stat(models, "models trending on Hugging Face"),
    );
  }

  /** Open competitions with a deadline, soonest first. */
  upcomingDeadlines() {
    const today = new Date(new Date().toISOString().slice(0, 10));
    return this.stories
      .filter((s) => (s.topic === "events" || s.sourceTopic === "events") && s.meta?.deadline)
      .map((s) => ({ story: s, daysLeft: Math.round((new Date(s.meta.deadline) - today) / 86400000) }))
      .filter((e) => e.daysLeft >= 0)
      .sort((x, y) => x.daysLeft - y.daysLeft);
  }

  setQuery(query) {
    this.query = String(query || "").trim().toLowerCase();
    this.renderFeed();
  }

  /** The feed table for the tuned channel, filtered by the search box. */
  renderFeed() {
    const body = document.querySelector("#feed-rows");
    if (!body) return;
    let list = this.storiesIn();
    if (this.query) list = list.filter((s) => `${s.title} ${s.summary} ${s.source}`.toLowerCase().includes(this.query));
    const shown = list.slice(0, this.feedLimit || FEED_ROWS);
    document.querySelector("#feed-count").textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    const key = `${this.topic}|${this.query}|${shown.map((s) => s.id).join(",")}|${this.active?.storyId}`;
    if (body.dataset.key === key) { this.fitFeed(list.length); return; }
    body.dataset.key = key;
    if (!shown.length) {
      const row = element("tr");
      const cell = element("td", this.query ? `Nothing on this channel mentions “${this.query}”.` : "No items on this channel yet.", "feed-empty");
      cell.colSpan = 4;
      row.append(cell);
      body.replaceChildren(row);
      document.querySelector("#feed-more").hidden = true;
      return;
    }
    body.replaceChildren(...shown.map((s) => {
      const row = element("tr");
      if (this.active?.storyId === s.id) row.classList.add("on-air");
      const what = element("td", undefined, "feed-what");
      const link = element("a", s.title, "feed-title");
      link.href = s.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      what.append(link);
      if (s.summary) what.append(element("span", s.summary, "feed-summary"));
      const meta = element("td", undefined, "feed-meta");
      meta.append(element("span", s.topic === "all" ? "AI news" : topicOf(s.topic).name, "feed-channel"), element("span", s.source, "feed-source"));
      const age = element("td", this.ageOf(s), "num");
      // One action per story: ask the desk about it. The TV itself is the briefing.
      const act = element("td", undefined, "feed-act");
      const ask = element("button", "Ask", "btn-ghost");
      ask.type = "button";
      ask.setAttribute("aria-label", `Ask Dex and Theo about: ${s.title}`);
      ask.addEventListener("click", () => askDesk(questionFor(s)));
      act.append(ask);
      row.append(what, meta, age, act);
      return row;
    }));
    this.fitFeed(list.length);
  }

  /**
   * Until the visitor asks for more, the feed ends level with the column beside it: rows
   * that would run past the side column wait behind "Show more".
   */
  fitFeed(total) {
    const body = document.querySelector("#feed-rows");
    const more = document.querySelector("#feed-more");
    const rows = [...body.children];
    let shown = rows.length;
    for (const row of rows) row.hidden = false;
    if (!this.feedLimit && rows.length > 6) {
      const card = document.querySelector("#feed-card");
      const side = document.querySelector("#side-col").getBoundingClientRect();
      more.hidden = false;
      if (side.top > card.getBoundingClientRect().top + 40) {
        // The side column sits under the feed (narrow screens): a short first page.
        shown = Math.min(shown, 8);
        rows.forEach((row, i) => { row.hidden = i >= shown; });
      } else {
        while (shown > 6 && card.getBoundingClientRect().bottom > side.bottom + 8) rows[--shown].hidden = true;
      }
    }
    more.hidden = total <= shown;
  }

  ageOf(story) {
    if (story.origin === "archive") return "Guide";
    if (!story.publishedAt) return "Open";
    const days = Math.floor((Date.now() - new Date(story.publishedAt).getTime()) / 86400000);
    return days <= 0 ? "Today" : `${days} d`;
  }

  /** The radar: one sector per channel, one blip per live item, newer items nearer the centre. */
  renderRadar() {
    const svg = document.querySelector("#radar");
    if (!svg) return;
    const ns = "http://www.w3.org/2000/svg";
    const R = 150, C = 160;
    const channels = TOPICS.filter((t) => t.id !== "all");
    const live = this.stories.filter((s) => s.origin === "live");
    const key = `${live.length}|${this.topic}`;
    if (svg.dataset.key === key) return;
    svg.dataset.key = key;
    const make = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    };
    const nodes = [];
    for (const r of [0.33, 0.66, 1]) nodes.push(make("circle", { cx: C, cy: C, r: R * r, class: "radar-ring" }));
    const step = (Math.PI * 2) / channels.length;
    channels.forEach((t, i) => {
      const a0 = -Math.PI / 2 + i * step, a1 = a0 + step;
      const p = (a, r) => `${C + Math.cos(a) * r} ${C + Math.sin(a) * r}`;
      const sector = make("path", {
        d: `M ${C} ${C} L ${p(a0, R)} A ${R} ${R} 0 0 1 ${p(a1, R)} Z`,
        class: `radar-sector${t.id === this.topic ? " is-tuned" : ""}`, tabindex: "0", role: "button",
        "aria-label": `${t.name}: ${live.filter((s) => s.topic === t.id).length} live items. Tune to this channel.`,
      });
      sector.addEventListener("click", () => this.setTopic(t.id));
      sector.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.setTopic(t.id); } });
      nodes.push(sector);
      nodes.push(make("line", { x1: C, y1: C, x2: C + Math.cos(a0) * R, y2: C + Math.sin(a0) * R, class: "radar-spoke" }));
      const mid = a0 + step / 2;
      const label = make("text", { x: C + Math.cos(mid) * (R + 2) * 0.82, y: C + Math.sin(mid) * (R + 2) * 0.82 + 4, class: "radar-label" });
      label.textContent = t.short;
      nodes.push(label);
      for (const s of live.filter((x) => x.topic === t.id)) {
        let h = 0;
        for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        const days = s.publishedAt ? (Date.now() - new Date(s.publishedAt).getTime()) / 86400000 : 20;
        const r = 14 + Math.min(Math.max(days, 0), 30) / 30 * (R * 0.72);
        const a = a0 + step * (0.12 + (h % 1000) / 1000 * 0.76);
        const dot = make("circle", { cx: C + Math.cos(a) * r, cy: C + Math.sin(a) * r, r: days < 2 ? 3.5 : 2.5, class: days < 2 ? "blip blip-new" : "blip" });
        const tip = make("title", {});
        tip.textContent = `${s.title} (${s.source})`;
        dot.append(tip);
        nodes.push(dot);
      }
    });
    const sweep = make("g", { class: "radar-sweep" });
    sweep.append(make("path", { d: `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 0 1 ${C + Math.sin(0.5) * R} ${C - Math.cos(0.5) * R} Z`, class: "radar-wedge" }));
    sweep.append(make("line", { x1: C, y1: C, x2: C, y2: C - R, class: "radar-beam" }));
    nodes.push(sweep);
    nodes.push(make("circle", { cx: C, cy: C, r: 3, class: "radar-core" }));
    svg.replaceChildren(...nodes);
    const count = document.querySelector("#radar-count");
    if (count) count.textContent = `${live.length} live items`;
  }

  /** Competitions closing soonest, for the overview. */
  renderDeadlines() {
    const list = document.querySelector("#deadlines");
    if (!list) return;
    const soon = this.upcomingDeadlines().slice(0, 4);
    const key = soon.map((e) => `${e.story.id}:${e.daysLeft}`).join(",");
    if (list.dataset.key === key && key) return;
    list.dataset.key = key;
    if (!soon.length) {
      const scanning = this.channels.events.status !== "ready";
      list.replaceChildren(element("li", scanning ? "Checking Devpost for open AI hackathons…" : "No open AI hackathon with a deadline right now.", "empty-note"));
      return;
    }
    list.replaceChildren(...soon.map(({ story, daysLeft }) => {
      const li = element("li", undefined, "deadline");
      const name = element("a", story.meta.event, "deadline-name");
      name.href = story.url;
      name.target = "_blank";
      name.rel = "noopener noreferrer";
      const prize = /^\$?0$/.test(story.meta.prize || "") || !story.meta.prize ? "No cash prize" : `${story.meta.prize} in prizes`;
      const sub = element("span", `${prize} · ${story.meta.registered.toLocaleString("en-US")} registered`, "deadline-sub");
      const left = element("span", daysLeft === 0 ? "Today" : `${daysLeft} d`, `deadline-left num${daysLeft <= 7 ? " is-soon" : ""}`);
      const text = element("span", undefined, "deadline-text");
      text.append(name, sub);
      li.append(text, left);
      return li;
    }));
  }

  /** The Competitions screen: every open competition, then the always-open lists. */
  renderEventsView() {
    const body = document.querySelector("#events-rows");
    if (!body) return;
    const open = this.upcomingDeadlines();
    const key = open.map((e) => `${e.story.id}:${e.daysLeft}`).join(",");
    if (body.dataset.key === key && body.childElementCount) return;
    body.dataset.key = key;
    const rows = open.map(({ story, daysLeft }) => {
      const row = element("tr");
      const name = element("td");
      const link = element("a", story.meta.event, "feed-title");
      link.href = story.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      name.append(link, element("span", story.meta.where, "feed-summary"));
      row.append(name, element("td", story.meta.dates), element("td", daysLeft === 0 ? "Today" : `${daysLeft} d`, `num${daysLeft <= 7 ? " is-soon" : ""}`),
        element("td", story.meta.prize || "—", "num"), element("td", story.meta.registered.toLocaleString("en-US"), "num"));
      return row;
    });
    for (const s of this.archive.filter((x) => x.topic === "events")) {
      const row = element("tr");
      const name = element("td");
      const link = element("a", s.source, "feed-title");
      link.href = s.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      name.append(link, element("span", s.title, "feed-summary"));
      row.append(name, element("td", "Ongoing"), element("td", "—", "num"), element("td", "—", "num"), element("td", "—", "num"));
      rows.push(row);
    }
    body.replaceChildren(...rows);
    document.querySelector("#events-count").textContent = `${open.length} open with a deadline`;
  }

  /** The Sources screen: every source, whether it answered, and how much it gave. */
  renderSourcesView() {
    const body = document.querySelector("#sources-rows");
    if (!body) return;
    const rows = [];
    let ok = 0, total = 0;
    for (const t of TOPICS) {
      if (t.id === "all") continue;
      const c = this.channels[t.id];
      for (const src of c.sources) {
        total++;
        if (src.ok === true) ok++;
        const row = element("tr");
        const status = element("td", undefined, "src-status");
        status.append(element("span", "", `dot ${src.ok === true ? "ok" : src.ok === false ? "fail" : "wait"}`),
          element("span", src.ok === true ? "Answered" : src.ok === false ? "Unavailable" : c.status === "scanning" ? "Scanning" : "Waiting"));
        if (src.error) status.title = src.error;
        row.append(element("td", t.name), element("td", src.name), status, element("td", src.via || "—"),
          element("td", src.ok === true ? `${src.kept} of ${src.fetched}` : "—", "num"),
          element("td", c.scannedAt ? new Date(c.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—", "num"));
        rows.push(row);
      }
    }
    body.replaceChildren(...rows);
    document.querySelector("#sources-count").textContent = `${ok} of ${total} sources answered`;
  }
}

// ---- the page's own controls ----------------------------------------------------

const VIEWS = ["radar", "find", "prompts", "events", "sources"];

function showView(view) {
  const name = VIEWS.includes(view) ? view : "radar";
  document.body.dataset.view = name;
  for (const v of VIEWS) document.querySelector(`#view-${v}`).hidden = v !== name;
  document.querySelectorAll("[data-view]").forEach((el) => {
    if (el.dataset.view === name) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

function wireControls(page) {
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (!typing && e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey && !e.altKey && page.power === "on") page.setMuted(!page.voice.muted);
  });
  document.querySelectorAll("[data-topic]").forEach((el) => {
    el.addEventListener("click", () => page.setTopic(el.dataset.topic));
  });
  // The channel row scrolls on narrow screens: the button brings the next channels in, then starts over.
  document.querySelector("#tabs-more").addEventListener("click", () => {
    const row = document.querySelector("#channel-tabs");
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    row.scrollTo({ left: atEnd ? 0 : row.scrollLeft + row.clientWidth * 0.7, behavior: "smooth" });
  });
  document.querySelector("#btn-power").addEventListener("click", () => page.togglePower());
  document.querySelector("#screen-off").addEventListener("click", () => page.powerOn());
  document.querySelector("#btn-next").addEventListener("click", () => { if (page.power === "on") page.voice.stop(); });
  document.querySelector("#btn-mute").addEventListener("click", () => page.setMuted(!page.voice.muted));
  document.querySelector("#search").addEventListener("input", (e) => page.setQuery(e.target.value));
  document.querySelector("#feed-more").addEventListener("click", () => { page.feedLimit = (page.feedLimit || FEED_ROWS) + 30; page.renderFeed(); });
  window.addEventListener("resize", () => page.renderFeed());
  document.querySelector("#btn-rescan").addEventListener("click", () => page.scanAll({ force: true }));
  document.querySelector("#btn-ask-story").addEventListener("click", () => {
    const story = page.findStory(page.active?.storyId || page.history[0]?.storyId);
    if (story) askDesk(questionFor(story));
  });
  // These two need the visitor's own words, so they only start the sentence.
  document.querySelector("#btn-ask-claim").addEventListener("click", () => askDesk("I heard that ", { send: false }));
  document.querySelector("#btn-ask-repo").addEventListener("click", () => askDesk("Theo, explain what this GitHub repo does: ", { send: false }));
  wireFind(page);
  window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
  showView(location.hash.slice(1));
  renderPrompts();
}

const FIND_LABELS = { prompts: "Prompts", skills: "Skills", tools: "Tools & MCP", papers: "Papers" };
const FIND_EXAMPLES = [
  ["skills", "design", "skills that make Claude Code build better interfaces"],
  ["skills", "emil kowalski", "animation and UI polish skills by Emil Kowalski"],
  ["prompts", "code review", "prompts people use to review code"],
  ["tools", "github", "MCP servers that connect an agent to GitHub"],
  ["tools", "speech", "speech apps, models and packages to try"],
  ["papers", "agent memory", "recent research on how agents remember"],
];
const FIND_HINTS = {
  prompts: "From prompts.chat, prompt collections on GitHub and the AI Radar library.",
  skills: "From skills.sh, SkillsMP, Anthropic's skills and skill repositories on GitHub.",
  tools: "From the MCP Registry, npm, Hugging Face Spaces and models, and OpenRouter's free models.",
  papers: "From Hugging Face Papers and arXiv.",
};

/** The Find screen: one search box, four kinds, real results with their sources. */
function wireFind(page) {
  const form = document.querySelector("#find-form");
  const input = document.querySelector("#find-query");
  const kinds = document.querySelector("#find-kinds");
  page.findKind = page.findKind || "skills";
  kinds.replaceChildren(...FIND_KINDS.map((k) => {
    const b = element("button", FIND_LABELS[k], "chip");
    b.type = "button";
    b.dataset.kind = k;
    b.addEventListener("click", () => {
      page.findKind = k;
      renderFind(page);
      if (input.value.trim().length >= 2) page.find({ kind: k, query: input.value });
    });
    return b;
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    page.find({ kind: page.findKind, query: input.value });
  });
  document.querySelectorAll("[data-find]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    const [kind, ...q] = el.dataset.find.split(":");
    page.findKind = kind;
    input.value = q.join(":");
    location.hash = "find";
    page.find({ kind, query: input.value });
  }));
  renderFind(page);
}

export function renderFind(page) {
  if (!BROWSER || !document.querySelector("#find-results")) return;
  const last = page.lastFind;
  if (last && !last.pending) page.findKind = last.kind;
  const kind = page.findKind || "skills";
  document.querySelectorAll("#find-kinds button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
  document.querySelector("#find-hint").textContent = FIND_HINTS[kind];
  const input = document.querySelector("#find-query");
  if (last && document.activeElement !== input) input.value = last.query;
  const list = document.querySelector("#find-results");
  const status = document.querySelector("#find-status");
  if (!last) {
    status.textContent = "Type what you need, or start from one of these searches.";
    list.replaceChildren(...FIND_EXAMPLES.map(([k, q, why]) => {
      const card = element("article", undefined, "find-item find-example");
      const go = element("button", q, "find-title find-go");
      go.type = "button";
      go.addEventListener("click", () => { document.querySelector("#find-query").value = q; page.findKind = k; page.find({ kind: k, query: q }); });
      card.append(go, element("p", `${FIND_LABELS[k]} · ${why}`, "find-meta"));
      return card;
    }));
    return;
  }
  if (last.pending) { status.textContent = `Searching ${FIND_LABELS[last.kind].toLowerCase()} for "${last.query}"…`; list.setAttribute("aria-busy", "true"); return; }
  list.removeAttribute("aria-busy");
  const r = last.result;
  const answered = (r.sources || []).filter((s) => s.ok).map((s) => s.source);
  if (!r.ok) { status.textContent = r.reason; list.replaceChildren(); return; }
  status.textContent = r.count
    ? `${r.count} found for "${last.query}" in ${answered.join(", ")}.`
    : `Nothing found for "${last.query}". Try fewer or other words.`;
  list.replaceChildren(...r.results.map((item) => {
    const card = element("article", undefined, "find-item");
    const head = element("div", undefined, "find-head");
    const link = element("a", item.title, "find-title");
    link.href = item.url;
    if (/^https?:/.test(item.url)) { link.target = "_blank"; link.rel = "noopener"; }
    const actions = element("div", undefined, "find-actions");
    if (item.text) {
      const copy = element("button", "Copy", "btn-ghost");
      copy.type = "button";
      copy.setAttribute("aria-label", `Copy the prompt: ${item.title}`);
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(item.text); copy.textContent = "Copied"; } catch { copy.textContent = "Select and copy"; }
        setTimeout(() => { copy.textContent = "Copy"; }, 1600);
      });
      actions.append(copy);
    }
    if (/^https?:/.test(item.url)) {
      const ask = element("button", "Ask desk", "btn-ghost");
      ask.type = "button";
      ask.setAttribute("aria-label", `Ask Dex and Theo about: ${item.title}`);
      ask.addEventListener("click", () => askDesk(questionFor({ title: item.title, source: item.source, url: item.github || item.url, topic: "tools" })));
      actions.append(ask);
    }
    head.append(link, actions);
    const meta = element("p", [item.kind, item.source, item.by && item.by !== item.source ? `by ${item.by}` : ""].filter(Boolean).join(", "), "find-meta");
    if (item.popularityLabel) meta.append(" ", element("span", item.popularityLabel, "mono"));
    card.append(head, meta);
    if (item.summary) card.append(element("p", item.summary, "find-summary"));
    if (item.text) {
      const more = element("details", undefined, "find-text");
      more.append(element("summary", "Show the prompt"), element("pre", item.text, "prompt-text"));
      card.append(more);
    }
    return card;
  }));
}

/** The prompt library: groups to filter by, each prompt with a copy button. */
function renderPrompts() {
  const list = document.querySelector("#prompt-list");
  const filters = document.querySelector("#prompt-groups");
  const picks = document.querySelector("#prompt-picks");
  let group = "All";
  const card = (p, compact) => {
    const item = element("article", undefined, compact ? "prompt prompt-compact" : "prompt");
    const head = element("div", undefined, "prompt-head");
    const title = element("h3", p.title);
    const copy = element("button", "Copy", "btn-ghost");
    copy.type = "button";
    copy.setAttribute("aria-label", `Copy the prompt: ${p.title}`);
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(p.text);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Select and copy";
      }
      setTimeout(() => { copy.textContent = "Copy"; }, 1600);
    });
    head.append(title, copy);
    item.append(head, element("p", `${p.group} · ${p.useFor}`, "prompt-use"));
    if (!compact) item.append(element("pre", p.text, "prompt-text"));
    return item;
  };
  const draw = () => {
    const shown = PROMPTS.filter((p) => group === "All" || p.group === group);
    list.replaceChildren(...shown.map((p) => card(p, false)));
    filters.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === group)));
  };
  filters.replaceChildren(...["All", ...PROMPT_GROUPS].map((g) => {
    const b = element("button", g, "chip");
    b.type = "button";
    b.dataset.group = g;
    b.addEventListener("click", () => { group = g; draw(); });
    return b;
  }));
  draw();
  const day = Math.floor(Date.now() / 86400000);
  picks.replaceChildren(...[0, 1, 2].map((k) => card(PROMPTS[(day * 3 + k) % PROMPTS.length], true)));
}

/** A short burst of CRT static and the high flyback whine, made with Web Audio. */
function playPowerOnSound(muted) {
  if (muted) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = playPowerOnSound.ctx || (playPowerOnSound.ctx = new Ctx());
    ctx.resume?.();
    const t = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t);
    noiseGain.gain.linearRampToValueAtTime(0.12, t + 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    noise.connect(band).connect(noiseGain).connect(ctx.destination);
    noise.start(t);
    const whine = ctx.createOscillator();
    whine.frequency.value = 15700;
    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0.0001, t);
    whineGain.gain.linearRampToValueAtTime(0.015, t + 0.05);
    whineGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    whine.connect(whineGain).connect(ctx.destination);
    whine.start(t);
    whine.stop(t + 1.5);
  } catch { /* sound is a nicety */ }
}

export class App {
  static page = null;
}

App.page = new StudioPage();
App.page.render();
if (BROWSER) {
  wireControls(App.page);
  App.page.scanAll();
}
