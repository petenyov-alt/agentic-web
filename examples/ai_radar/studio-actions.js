// Registers AI Radar's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names in
// "actions.agentTools" become model tools, called website_<name>.
//
// Each action wraps a method of the page object the screen's own controls use (App.page in
// script.js), so the assistant and the visitor follow one set of rules. Import the page
// script by the same URL index.html uses, or the actions get a second, separate studio.
import { App } from "./script.js";
import { TOPIC_IDS } from "./js/scanner.js";
import { TOOL_KINDS } from "./js/finder.js";

const CHANNEL_HELP = "Channel id: all, models (new models and labs), local (local and open-weight AI), tools (tools, agent skills, MCP servers), projects (new open-source AI projects on GitHub), free (free and open resources), prompts, security (AI security, prompt injection), research (papers), events (hackathons and competitions), agentic (the open agentic web).";

/**
 * The studio's operations as actions the agents can call.
 *
 * Putting AI-written words on air asks the visitor first: broadcast_story is marked
 * "irreversible" so the runtime opens site.js's approval card before it runs. The other
 * changes (tuning a channel, pausing, saving draft scripts) are undone on the screen itself.
 */
class StudioActions {
  static registerActions(actions) {
    actions.register(StudioActions.getStudioStateAction());
    actions.register(StudioActions.scanRawNewsAction());
    actions.register(StudioActions.searchNewsAction());
    actions.register(StudioActions.broadcastStoryAction());
    actions.register(StudioActions.setChannelAction());
    actions.register(StudioActions.stopBroadcastAction());
    actions.register(StudioActions.saveScriptsAction());
    for (const kind of ["prompts", "skills", "tools", "papers"]) actions.register(StudioActions.findAction(kind));
  }

  /**
   * find_prompts, find_skills, find_tools, find_papers: real items from public directories,
   * so the agents can point visitors to things that exist instead of writing their own.
   */
  static findAction(kind) {
    const about = {
      prompts: "Find real prompts people wrote and shared, in prompts.chat (the open prompt library), prompt collections on GitHub and AI Radar's own library. Each result has the title, the author, votes, a link and the prompt text (cut at 700 characters).",
      skills: "Find real agent skills (SKILL.md folders for Claude Code, Codex and other agents) in skills.sh, SkillsMP, Anthropic's official skills and skill repositories on GitHub. Each result has the name, the author, installs or stars, and a link.",
      tools: "Find real AI tools to try: MCP servers (the official MCP Registry, npm), apps and demos (Hugging Face Spaces), libraries (npm), open models (Hugging Face) and free hosted models (OpenRouter's $0 models). Each result has the name, what it is, popularity and a link.",
      papers: "Find research papers in Hugging Face Papers (with short summaries and upvotes) and arXiv (newest first). Each result has the title, authors, a summary and a link.",
    }[kind];
    const examples = {
      prompts: "\"code review\", \"product requirements\", \"SQL tutor\"",
      skills: "\"design\", \"emil kowalski\", \"pdf\", \"testing\"",
      tools: "\"github\", \"speech to text\", \"qwen\"",
      papers: "\"agent memory\", \"prompt injection\"",
    }[kind];
    const properties = {
      query: { type: "string", minLength: 2, maxLength: 120, description: `2 to 6 key words for what the visitor needs, such as ${examples}.` },
      limit: { type: "integer", minimum: 1, maximum: 12, description: "How many results. Default 8." },
    };
    if (kind === "tools") properties.toolKind = { type: "string", enum: TOOL_KINDS, description: "Narrow the search: mcp (MCP servers), apps (Hugging Face Spaces), packages (npm), models (open models and free hosted ones), free-models (only $0 hosted models), all (default)." };
    return {
      name: `find_${kind}`,
      description: `${about} Results come from those directories, not from AI Radar, and also appear on the site's Find screen. Returns ok false with a reason when no directory answers.`,
      effect: "read",
      inputSchema: { type: "object", additionalProperties: false, required: ["query"], properties },
      execute: ({ query, limit, toolKind }) => App.page.find({ kind, query, limit, toolKind }),
    };
  }

  static getStudioStateAction() {
    return {
      name: "get_studio_state",
      description: "Read what the station shows now: whether the briefing plays, the tuned channel, each channel's story count, which anchor (Elon or Sam) is reading which story, what is queued, the last 5 stories aired, volume. No story texts: use website_scan_raw_news for those.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getStudioState(),
    };
  }

  static scanRawNewsAction() {
    return {
      name: "scan_raw_news",
      description: "Read the AI stories the studio's scanner holds for one channel: id, headline, summary, channel name and channelId, url, source, date, whether it is from the studio archive and whether it already aired. Optionally only stories that mention some words. Does not change what the screen shows.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["channel"],
        properties: {
          channel: { type: "string", enum: TOPIC_IDS, description: CHANNEL_HELP },
          query: { type: "string", maxLength: 60, description: "Optional words a story must mention, such as \"Qwen\" or \"speech\". Leave out for all stories." },
          limit: { type: "integer", minimum: 1, maximum: 20, description: "How many stories to return. Default 12." },
          refresh: { type: "boolean", description: "True to fetch the sources again first (slower). Only when the visitor asks for the very latest." },
        },
      },
      execute: ({ channel, ...rest }) => App.page.listStories({ topic: channel, ...rest }),
    };
  }

  static searchNewsAction() {
    return {
      name: "search_news",
      description: "Search recent AI news on the web (Hacker News and Bing News): to answer a question about something not in the channels, or to check something the visitor heard. Returns up to 12 reports with headline, summary, outlet, date and link; reports about AI that are safe for air also get an id, which website_broadcast_story accepts. Does not change what the screen shows.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: { type: "string", minLength: 3, maxLength: 120, description: "3 to 8 key words, such as \"Llama 4 release\" or \"free speech to text API\"." },
          channel: { type: "string", enum: TOPIC_IDS, description: `Optional, to file the results under a channel. ${CHANNEL_HELP}` },
        },
      },
      execute: ({ query, channel }) => App.page.searchNews({ query, topic: channel || "all" }),
    };
  }

  static broadcastStoryAction() {
    return {
      name: "broadcast_story",
      description: "Put stories on air now, replacing the current story. The visitor sees an approval card with each story and script first. Every number in a script must appear in its story, or the call is refused. Elon and Sam take turns reading aloud with captions; the briefing starts if it is off; afterwards the nonstop broadcast carries on. Returns the lineup, or ok false with a reason.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: {
          items: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            description: "Stories in the order to read them.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["storyId"],
              properties: {
                storyId: { type: "string", minLength: 1, maxLength: 40, description: "A story id from website_scan_raw_news or website_search_news." },
                script: { type: "string", minLength: 20, maxLength: 900, description: "What the anchor says: 2-3 spoken sentences using only that story's facts. Leave out to use the studio's own script." },
              },
            },
          },
        },
      },
      execute: ({ items }) => App.page.broadcast(items),
    };
  }

  static setChannelAction() {
    return {
      name: "set_channel",
      description: "Tune a channel: the feed and the radar switch to it, and when the briefing plays, the broadcast switches at once (and resumes if it was paused). Returns the channel and its story count.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["channel"],
        properties: {
          channel: { type: "string", enum: TOPIC_IDS, description: CHANNEL_HELP },
        },
      },
      execute: ({ channel }) => App.page.setTopic(channel),
    };
  }

  static stopBroadcastAction() {
    return {
      name: "stop_broadcast",
      description: "Pause the briefing: Elon and Sam stop reading. website_broadcast_story or website_set_channel starts it again.",
      effect: "write",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.stopBroadcast(),
    };
  }

  static saveScriptsAction() {
    return {
      name: "save_scripts",
      description: "AI producer: keep scripts for upcoming stories; Elon and Sam read them when those stories come up in the nonstop broadcast. Each script is fact-checked against its story's numbers. Returns the saved story ids and any refused with a reason. Does not interrupt the broadcast.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["items"],
        properties: {
          items: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["storyId", "script"],
              properties: {
                storyId: { type: "string", minLength: 1, maxLength: 40, description: "The story id from the PRODUCER MODE message." },
                script: { type: "string", minLength: 20, maxLength: 900, description: "The script from broadcast_script_writer." },
              },
            },
          },
        },
      },
      execute: ({ items }) => App.page.saveScripts(items),
    };
  }
}

// The runtime calls the module's registerActions export.
export const registerActions = StudioActions.registerActions;
