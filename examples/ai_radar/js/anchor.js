// AI Radar's studio: South Park construction-paper cutout TV news studio at night.
// Hierarchical SVG cutout rig (1280x720 vector stage, native 60-FPS dt-smoothed cutout motion):
//
//   THEO   ("Theo Sweep", right, index 0): Unbuttoned tailored deep navy blazer over a
//         minimalist heather-grey crewneck tee (with subtle white undershirt rim), tousled
//         wavy brown hair, emerald hex lapel pin, silver smartwatch, and "NO HYPE" ceramic mug.
//   DEX  ("Dex Ping", left, index 1): Sleek matte-black minimalist bomber jacket over
//         a plain charcoal-black crewneck tee, sculpted dark widow's-peak hair, subtle
//         brushed silver "R" lapel pin (AI Radar), and matte-black "SHIP" ceramic mug.
//
// Between them hangs the center studio monitor combining live topic cutout artwork and a
// live sweeping radar scope. Desk blotter items render behind the foreground arms layer so
// hands always sit above notes/tablets and obey physical object permanence when held.

export const W = 1280;
export const H = 720;

const GREEN = ["#b8ffd6", "#3ddc97", "#1f9a63", "#0f5a3a"];
const AMBER = ["#ffe2a0", "#ffb347", "#b8741f", "#5e3a10"];
const CYAN = ["#d6feff", "#3df5ff", "#1f9aa6", "#0f505a"];

/** The studio's modes: the label on the board, its colour and how busy the room looks. */
export const STUDIO_MODES = {
  idle: { label: "IDLE", color: "#43619c", textColor: "#ffffff", sweep: GREEN, rate: 0.55, busy: 1 },
  onair: { label: "ON AIR", color: "#c81e1e", textColor: "#ffffff", sweep: GREEN, rate: 0.8, busy: 1.4 },
  call: { label: "LIVE CALL", color: "#c81e1e", textColor: "#ffffff", sweep: GREEN, rate: 1.1, busy: 1.8 },
  scanning: { label: "SCANNING", color: "#3ddc97", textColor: "#052e16", sweep: GREEN, rate: 2.4, busy: 3 },
  verifying: { label: "VERIFYING", color: "#ffb347", textColor: "#451a03", sweep: AMBER, rate: 1.5, busy: 2.4 },
  mcp: { label: "MCP SEARCH", color: "#3df5ff", textColor: "#083344", sweep: CYAN, rate: 2.1, busy: 3 },
  writing: { label: "WRITING", color: "#c8ffe0", textColor: "#052e16", sweep: GREEN, rate: 0.9, busy: 2 },
};

const WORK_MODE = {
  thinking: "call",
  scanning: "scanning",
  find: "scanning",
  verifying: "verifying",
  mcp: "mcp",
  repo: "mcp",
  writing: "writing",
};
const WORKER = { thinking: 0, scanning: 0, verifying: 0, repo: 0, mcp: 1, find: 1, writing: 1 };

// Shuffle-bag habit repertoires (8 solo habits each + 4 duo interactions, never repeating back-to-back).
export const THEO_HABITS = ["espresso", "write", "flip_page", "check_watch", "chin_rest", "tablet", "type_note", "stretch"];
export const DEX_HABITS = ["sip", "headset", "tuck_hair", "tap_pen", "check_slate", "write", "trace_scope", "stretch"];
export const DUO_HABITS = ["duo_share", "duo_toast", "duo_glance", "duo_scope"];

// Calm habits performed by the non-speaking co-anchor while listening to the speaker.
const THEO_LISTEN_HABITS = ["chin_rest", "write", "espresso", "check_watch", "tablet", "flip_page"];
const DEX_LISTEN_HABITS = ["chin_rest", "tap_pen", "sip", "check_slate", "write", "headset"];

const HABIT_MS = {
  espresso: 3600, write: 3400, flip_page: 2600, check_watch: 2200, chin_rest: 3600, tablet: 3200, type_note: 2600, stretch: 2400,
  sip: 3600, headset: 2200, tuck_hair: 2000, tap_pen: 3200, check_slate: 3400, trace_scope: 2600,
  duo_share: 3400, duo_toast: 3600, duo_glance: 2400, duo_scope: 2800,
};

// ============================================================================
// 108 NAMED FACS FACIAL EXPRESSIONS DATABASE (9 Families x 12 Expressions)
// Baseline open-eye states keep lidTop=0, lidBot=0 so no bars ever appear across wide-open eyes.
// ============================================================================
const EXPR_FAMILIES = [
  { family: "analytical", names: ["analytical_focus", "deep_reasoning", "calculating_odds", "evaluating_claim", "pattern_recognition", "architectural_thought", "hypothesis_forming", "data_correlation", "critical_review", "logical_deduction", "inference_check", "abstract_pondering"], browL: [-1, -2], browR: [-1, 2], lidTop: 0, lidBot: 0, restMouth: "neutral", gazeBiasY: -1 },
  { family: "skeptical", names: ["skeptical_left_brow", "skeptical_right_brow", "doubtful_squint", "fact_checking", "wait_a_second", "probing_question", "unconvinced_smirk", "scrutinizing_code", "suspicious_glint", "press_doubt", "benchmark_disbelief", "cautious_reserve"], browL: [-6, -10], browR: [3, -12], lidTop: 0.22, lidBot: 0.14, restMouth: "smug", gazeBiasY: 0 },
  { family: "warmth", names: ["warm_duchenne_smile", "earnest_agreement", "empathetic_listen", "proud_of_builders", "welcoming_host", "appreciative_nod_face", "gentle_encouragement", "shared_understanding", "fond_amusement", "reassuring_calm", "kind_acknowledgment", "grateful_handoff"], browL: [-3, -4], browR: [-3, 4], lidTop: 0, lidBot: 0, restMouth: "slightSmile", gazeBiasY: 0 },
  { family: "excitement", names: ["breakthrough_awe", "wide_eyed_surprise", "impressed_whistle", "mind_blown", "eureka_moment", "thrilled_launch", "astonished_gasp", "delighted_discovery", "hyped_release", "enthusiastic_pitch", "pleasant_shock", "electric_anticipation"], browL: [-7, -9], browR: [-7, 9], lidTop: 0, lidBot: 0, restMouth: "slightSmile", gazeBiasY: -2 },
  { family: "security", names: ["breaking_news_alert", "cve_security_grave", "urgent_warning", "high_stakes_tension", "incident_response", "zero_day_focus", "protective_caution", "red_alert_scan", "serious_advisory", "containment_focus", "vulnerability_concern", "stern_directive"], browL: [4, 18], browR: [4, -18], lidTop: 0.16, lidBot: 0.1, restMouth: "concerned", gazeBiasY: 0 },
  { family: "banter", names: ["wry_silicon_smirk", "playful_tease", "inside_joke_grin", "dry_humor_deadpan", "knowing_side_glance", "cheeky_rejoinder", "amused_chuckle", "banter_challenge", "lighthearted_shrug_face", "friendly_rivalry", "ironic_eyebrow", "witty_comeback"], browL: [-5, -8], browR: [1, -4], lidTop: 0, lidBot: 0, restMouth: "smug", gazeBiasY: 0 },
  { family: "listening", names: ["engaged_listener", "fascinated_lean_in", "nodding_comprehension", "tracking_partner_point", "absorbing_details", "anticipating_turn", "ready_to_jump_in", "empathetic_concern", "validating_smile", "curious_head_tilt", "reflective_pause", "mutual_respect_gaze"], browL: [-2, -3], browR: [-2, 3], lidTop: 0, lidBot: 0, restMouth: "neutral", gazeBiasY: 0 },
  { family: "technical", names: ["terminal_code_scan", "rapid_typing_focus", "radar_sweep_track", "equalizer_monitoring", "slate_inspection", "clipboard_reading", "headset_incoming_transmission", "glasses_fine_print", "latency_profiling", "repo_diff_review", "packet_trace_squint", "compile_waiting"], browL: [1, 6], browR: [1, -6], lidTop: 0.14, lidBot: 0.08, restMouth: "neutral", gazeBiasY: 4 },
  { family: "vitality", names: ["deep_inhale_prep", "soft_exhale_relief", "thoughtful_lip_purse", "upward_memory_recall", "micro_squint_focus", "double_blink_reset", "subtle_jaw_shift", "caffeine_satisfaction", "note_taking_focus", "late_night_cozy", "post_stretch_refresh", "studio_pride"], browL: [-2, -2], browR: [-2, 2], lidTop: 0, lidBot: 0, restMouth: "slightSmile", gazeBiasY: -2 },
];

export const FACIAL_EXPRESSIONS_DB = [];
EXPR_FAMILIES.forEach((fam) => {
  fam.names.forEach((name, idx) => {
    const jitter = (idx % 3) - 1;
    FACIAL_EXPRESSIONS_DB.push({
      id: FACIAL_EXPRESSIONS_DB.length + 1,
      name,
      family: fam.family,
      browL: [fam.browL[0] + jitter * 0.7, fam.browL[1] + jitter * 1.5],
      browR: [fam.browR[0] - jitter * 0.7, fam.browR[1] - jitter * 1.5],
      lidTop: fam.lidTop > 0 ? Math.max(0.1, Math.min(0.42, fam.lidTop + jitter * 0.03)) : 0,
      lidBot: fam.lidBot > 0 ? Math.max(0.06, Math.min(0.32, fam.lidBot + jitter * 0.02)) : 0,
      restMouth: fam.restMouth,
      gazeBiasY: fam.gazeBiasY,
    });
  });
});

// ============================================================================
// 120 NAMED CALM, NATURAL CUTOUT MOVEMENTS DATABASE (10 Categories x 12)
// Wrists align with forearm angle so deskRest hands lie cleanly flat along the blotter.
// ============================================================================
const MOVE_TEMPLATES = {
  groundedRest:     { waist: 0,    neck: 0,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -22, elR: 62,   wrR: -20, hR: "deskRest", gazeP: 0 },
  steepleCenter:    { waist: 1,    neck: 1,   shL: 24,  elL: -112, wrL: 16,  hL: "palmUp",     shR: -24, elR: 112,  wrR: -16, hR: "palmUp",   gazeP: 0.5 },
  openExplainInner: { waist: 2.5,  neck: 3,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -44, elR: -20,  wrR: 10,  hR: "palmUp",   gazeP: 0.6 },
  openExplainBoth:  { waist: 0,    neck: 2,   shL: 28,  elL: -88,  wrL: 18,  hL: "palmUp",     shR: -28, elR: 88,   wrR: -18, hR: "palmUp",   gazeP: 0.7 },
  countTwoInner:    { waist: 2,    neck: 2.5, shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -42, elR: -34,  wrR: -8,  hR: "countTwo", gazeP: 0.4 },
  pointInner:       { waist: 4.5,  neck: 4.5, shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -56, elR: -18,  wrR: -6,  hR: "point",    gazeP: 1.0 },
  pointScreenUp:    { waist: -2,   neck: -3,  shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -62, elR: -56,  wrR: -10, hR: "point",    gazeP: -0.3 },
  cautionPalm:      { waist: -1.5, neck: 1,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -40, elR: -58,  wrR: -12, hR: "spread",   gazeP: 0.6 },
  spreadVision:     { waist: 0,    neck: 1.5, shL: 34,  elL: -82,  wrL: 16,  hL: "spread",     shR: -34, elR: 82,   wrR: -16, hR: "spread",   gazeP: 0.5 },
  firmFistDesk:     { waist: 3,    neck: 3,   shL: 24,  elL: -60,  wrL: 20,  hL: "fist",       shR: -24, elR: 60,   wrR: -20, hR: "fist",     gazeP: 0.8 },
  chinThink:        { waist: -2,   neck: -4,  shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -28, elR: 156,  wrR: -12, hR: "palmUp",   gazeP: 0.9 },
  writeNotes:       { waist: 1.5,  neck: 4,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -24, elR: 62,   wrR: -14, hR: "holdPen",  gazeP: 0.3, prop: "pen" },
  sipMug:           { waist: 0,    neck: -1,  shL: 34,  elL: -176, wrL: 46,  hL: "holdMug",    shR: -22, elR: 62,   wrR: -20, hR: "deskRest", gazeP: 0.8, prop: "mug" },
  inspectTablet:    { waist: 1,    neck: 3.5, shL: 32,  elL: -120, wrL: -12, hL: "holdTablet", shR: -22, elR: 62,   wrR: -20, hR: "deskRest", gazeP: 0.4, prop: "tablet" },
  checkNotepad:     { waist: 1,    neck: 3,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -32, elR: 120,  wrR: 12,  hR: "holdPad",  gazeP: 0.5, prop: "pad" },
  leanListen:       { waist: 3,    neck: 5,   shL: 22,  elL: -62,  wrL: 20,  hL: "deskRest",   shR: -24, elR: 60,   wrR: -20, hR: "deskRest", gazeP: 1.0 },
  typeKeyboard:     { waist: 0,    neck: 2.5, shL: 24,  elL: -60,  wrL: 20,  hL: "deskRest",   shR: -24, elR: 60,   wrR: -20, hR: "deskRest", gazeP: 0.2 },
};

const MOVE_CATEGORIES = [
  { cat: "rhetorical", names: ["signature_steeple", "high_steeple_ponder", "open_palms_reveal", "weighing_two_sides", "precision_pinch_point", "expanding_horizon_wide", "containing_scope_box", "layered_stack_levels", "rolling_forward_momentum", "slicing_distinction", "gathering_concepts_in", "framing_architecture"], tpl: ["steepleCenter", "steepleCenter", "openExplainBoth", "openExplainInner", "countTwoInner", "spreadVision", "openExplainBoth", "openExplainInner", "openExplainBoth", "pointInner", "steepleCenter", "openExplainBoth"] },
  { cat: "metrics", names: ["count_point_one", "count_point_two", "count_point_three", "count_point_four", "count_all_five", "chart_spike_trace", "percentage_slash_air", "clipboard_hold_and_tap", "slate_hold_and_scroll", "tiny_margin_pinch", "massive_scale_spread", "timeline_step_left_right"], tpl: ["countTwoInner", "countTwoInner", "countTwoInner", "countTwoInner", "openExplainInner", "pointScreenUp", "countTwoInner", "checkNotepad", "inspectTablet", "countTwoInner", "spreadVision", "openExplainInner"] },
  { cat: "partner", names: ["warm_handoff_right", "warm_handoff_left", "point_to_partner_idea", "two_hand_offer_partner", "lean_in_conspire", "mutual_nod_salute", "toast_mugs_together", "shared_clipboard_look", "shared_radar_point", "yielding_the_floor", "building_on_partner_point", "friendly_wave_across_desk"], tpl: ["openExplainInner", "openExplainInner", "pointInner", "openExplainBoth", "leanListen", "leanListen", "sipMug", "checkNotepad", "pointScreenUp", "openExplainInner", "openExplainInner", "cautionPalm"] },
  { cat: "hardware", names: ["burst_mechanical_typing", "one_hand_shortcut_macro", "terminal_crt_point", "equalizer_slider_tune", "radar_bezel_calibrate", "mouse_drag_select", "stylus_write_notes", "stylus_tap_desk_rhythm", "page_flip_script", "lamp_shade_adjust", "mic_boom_check", "dual_console_cross_type"], tpl: ["typeKeyboard", "typeKeyboard", "pointScreenUp", "typeKeyboard", "pointScreenUp", "typeKeyboard", "writeNotes", "writeNotes", "checkNotepad", "typeKeyboard", "openExplainInner", "typeKeyboard"] },
  { cat: "security", names: ["caution_halt_palm", "double_palm_slow_down", "slip_on_blue_glasses", "adjust_glasses_bridge", "press_headset_earcup", "shield_guard_chest", "red_flag_raise_finger", "verify_checklist_tick", "lock_down_fist", "inspect_closely_lean", "filter_noise_wave_off", "alert_point_radar"], tpl: ["cautionPalm", "openExplainBoth", "chinThink", "chinThink", "chinThink", "firmFistDesk", "countTwoInner", "checkNotepad", "firmFistDesk", "leanListen", "cautionPalm", "pointScreenUp"] },
  { cat: "listening", names: ["chin_rest_right_hand", "chin_rest_left_hand", "index_on_cheek_listen", "stroke_jaw_thinking", "crossed_wrists_attentive", "folded_hands_desk", "temple_touch_concentrate", "head_tilt_palm_support", "nod_with_open_palm", "take_quick_note_listen", "verify_slate_listening", "lean_back_absorb"], tpl: ["chinThink", "chinThink", "chinThink", "chinThink", "groundedRest", "steepleCenter", "chinThink", "chinThink", "leanListen", "writeNotes", "inspectTablet", "groundedRest"] },
  { cat: "beats", names: ["single_beat_left", "single_beat_right", "double_beat_symmetric", "alternating_syllable_beat", "emphatic_fist_tap_desk", "upward_optimism_lift", "downward_grounding_press", "outward_sweep_dismiss", "inward_self_chest", "spiral_elaboration", "quick_shrug_palms_up", "decisive_chop_hand"], tpl: ["openExplainInner", "openExplainInner", "openExplainBoth", "openExplainInner", "firmFistDesk", "openExplainBoth", "groundedRest", "openExplainInner", "steepleCenter", "openExplainInner", "openExplainBoth", "pointInner"] },
  { cat: "habits", names: ["sip_espresso_savored", "sip_tea_mug_warm", "stir_cup_thoughtful", "warm_hands_on_mug", "pet_sleeping_cat_gentle", "chin_scratch_cat_purr", "check_chronograph_watch", "tuck_hair_behind_ear", "shoulder_roll_stretch", "neck_tilt_relax", "straighten_lapel_collar", "organize_paper_stack"], tpl: ["sipMug", "sipMug", "writeNotes", "sipMug", "groundedRest", "chinThink", "inspectTablet", "chinThink", "groundedRest", "leanListen", "steepleCenter", "checkNotepad"] },
  { cat: "emotional", names: ["mind_blown_hands_head", "pleasant_surprise_back", "heartfelt_hand_on_chest", "excited_double_fist_pump", "relieved_chest_exhale", "skeptical_chin_rub_tilt", "amused_cover_laugh", "intense_forward_lean", "confident_open_posture", "urgent_lean_toward_mic", "curious_peer_at_scope", "celebratory_open_arms"], tpl: ["spreadVision", "openExplainBoth", "steepleCenter", "firmFistDesk", "groundedRest", "chinThink", "chinThink", "leanListen", "steepleCenter", "pointInner", "leanListen", "spreadVision"] },
  { cat: "agentic", names: ["mcp_server_handshake", "agent_swarm_orchestrate", "deepwiki_repo_pull", "exa_web_sweep_arc", "huggingface_model_weigh", "context7_docs_lookup", "ping_incoming_receive", "ping_answered_dispatch", "channel_switch_dial", "live_feed_ingest", "verifying_claim_scales", "broadcast_sign_off_wave"], tpl: ["openExplainBoth", "spreadVision", "inspectTablet", "openExplainBoth", "openExplainInner", "checkNotepad", "leanListen", "openExplainInner", "typeKeyboard", "openExplainBoth", "steepleCenter", "openExplainInner"] },
];

export const MOVEMENTS_DB = [];
MOVE_CATEGORIES.forEach((group) => {
  group.names.forEach((name, idx) => {
    const tplName = group.tpl[idx] || "groundedRest";
    MOVEMENTS_DB.push({
      id: MOVEMENTS_DB.length + 1,
      name,
      category: group.cat,
      ...MOVE_TEMPLATES[tplName],
    });
  });
});

/** The mode the studio shows: the agents' work wins over what is on air. */
export function modeOf(base, work) {
  return (work && WORK_MODE[work]) || (STUDIO_MODES[base] ? base : "idle");
}

function lerp(a, b, k) {
  return a + (b - a) * k;
}

// =========================================================================
// 1. 14-VISEME PHONEME-ACCURATE SOUTH PARK MOUTH LIBRARY
// =========================================================================
export const VISEMES = {
  neutral: `
    <path d="M -10 1 Q 0 3 10 0" stroke="#090d16" stroke-width="2.8" stroke-linecap="round" fill="none" />
  `,
  slightSmile: `
    <path d="M -11 0 Q 0 6 11 -1" stroke="#090d16" stroke-width="2.8" stroke-linecap="round" fill="none" />
    <path d="M -12 -2 L -10 2 M 10 -2 L 12 1" stroke="#090d16" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
  `,
  smug: `
    <path d="M -11 2 Q 2 4 12 -3" stroke="#090d16" stroke-width="2.8" stroke-linecap="round" fill="none" />
    <path d="M 10 -5 L 14 -1" stroke="#090d16" stroke-width="2" stroke-linecap="round" />
  `,
  concerned: `
    <path d="M -10 3 Q 0 -2 10 3" stroke="#090d16" stroke-width="2.8" stroke-linecap="round" fill="none" />
  `,
  bmp: `
    <line x1="-11" y1="1" x2="11" y2="1" stroke="#090d16" stroke-width="3.2" stroke-linecap="round" />
    <path d="M -12 -2 L -10 4 M 12 -2 L 10 4" stroke="#090d16" stroke-width="1.8" stroke-linecap="round" />
  `,
  fv: `
    <polygon points="-11,-3 11,-3 9,5 -9,5" fill="#090d16" stroke-linejoin="round" />
    <rect x="-8.5" y="-2.5" width="17" height="4.5" fill="#ffffff" stroke="#090d16" stroke-width="0.7" />
    <line x1="-3" y1="-2.5" x2="-3" y2="2" stroke="#94a3b8" stroke-width="0.8" />
    <line x1="3" y1="-2.5" x2="3" y2="2" stroke="#94a3b8" stroke-width="0.8" />
  `,
  th_tongue: `
    <polygon points="-12,-4 12,-4 10,6 -10,6" fill="#090d16" stroke-linejoin="round" />
    <rect x="-9" y="-3.5" width="18" height="3.5" fill="#ffffff" />
    <ellipse cx="0" cy="2" rx="7" ry="3" fill="#fb7185" />
  `,
  l_alveolar: `
    <polygon points="-13,-5 13,-5 12,7 -12,7" fill="#090d16" stroke-linejoin="round" />
    <rect x="-10" y="-4.5" width="20" height="3.5" fill="#ffffff" />
    <path d="M -8 5 Q 0 -1 8 5" fill="#fb7185" stroke="#090d16" stroke-width="0.6" />
  `,
  s_teeth: `
    <polygon points="-13,-3.5 13,-3.5 12,3.5 -12,3.5" fill="#090d16" stroke-linejoin="round" />
    <rect x="-11" y="-3" width="22" height="6" fill="#ffffff" />
    <line x1="-11" y1="0" x2="11" y2="0" stroke="#94a3b8" stroke-width="1" />
    <line x1="-4" y1="-3" x2="-4" y2="3" stroke="#cbd5e1" stroke-width="0.8" />
    <line x1="4" y1="-3" x2="4" y2="3" stroke="#cbd5e1" stroke-width="0.8" />
  `,
  ee: `
    <path d="M -15 -4 L 15 -4 Q 14 8 0 8 Q -14 8 -15 -4 Z" fill="#090d16" stroke-linejoin="round" />
    <rect x="-12" y="-3.5" width="24" height="4" fill="#ffffff" />
    <rect x="-9" y="3.5" width="18" height="3" fill="#ffffff" />
    <line x1="-6" y1="-3.5" x2="-6" y2="0.5" stroke="#cbd5e1" stroke-width="0.8" />
    <line x1="0" y1="-3.5" x2="0" y2="0.5" stroke="#cbd5e1" stroke-width="0.8" />
    <line x1="6" y1="-3.5" x2="6" y2="0.5" stroke="#cbd5e1" stroke-width="0.8" />
  `,
  eh: `
    <polygon points="-13,-4.5 13,-4.5 14,5 8,9 -8,9 -14,5" fill="#090d16" stroke-linejoin="round" />
    <rect x="-10" y="-4" width="20" height="3.5" fill="#ffffff" />
    <ellipse cx="0" cy="6.5" rx="7" ry="2.2" fill="#f43f5e" />
  `,
  oh: `
    <polygon points="-8.5,-6 8.5,-6 10.5,2 7.5,11.5 -7.5,11.5 -10.5,2" fill="#090d16" stroke-linejoin="round" />
    <rect x="-6.5" y="-5" width="13" height="3.5" fill="#ffffff" />
    <ellipse cx="0" cy="7.8" rx="5.5" ry="2.8" fill="#f43f5e" />
  `,
  oo: `
    <ellipse cx="0" cy="2" rx="6.5" ry="7.2" fill="#090d16" />
    <ellipse cx="0" cy="5.5" rx="3.5" ry="2" fill="#f43f5e" />
  `,
  ah: `
    <polygon points="-15,-6 15,-6 18,7 10,13 -10,13 -18,7" fill="#090d16" stroke-linejoin="round" />
    <rect x="-12" y="-5.5" width="24" height="4.2" fill="#ffffff" />
    <line x1="-6" y1="-5.5" x2="-6" y2="-1.3" stroke="#cbd5e1" stroke-width="0.9" />
    <line x1="0" y1="-5.5" x2="0" y2="-1.3" stroke="#cbd5e1" stroke-width="0.9" />
    <line x1="6" y1="-5.5" x2="6" y2="-1.3" stroke="#cbd5e1" stroke-width="0.9" />
    <path d="M -10 8 Q 0 3 10 8 Q 8 12.5 0 12.5 Q -8 12.5 -10 8 Z" fill="#fb7185" />
  `,
  shout: `
    <polygon points="-18,-8 18,-8 21,9 12,16 -12,16 -21,9" fill="#090d16" stroke-linejoin="round" />
    <rect x="-15" y="-7.5" width="30" height="4.5" fill="#ffffff" />
    <ellipse cx="0" cy="9" rx="11" ry="4.8" fill="#f43f5e" />
    <rect x="-11" y="12" width="22" height="3" fill="#ffffff" />
  `,
};

/**
 * Convert an English word into an accurate timed sequence of phoneme visemes
 * so mouth articulation visibly tracks the actual syllables being pronounced.
 */
export function visemesForWord(word) {
  const clean = String(word || "").toLowerCase().replace(/[^a-z0-9%]/g, "");
  if (!clean) return ["neutral"];
  const seq = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1] || "";
    const pair = ch + next;
    if (pair === "th") { seq.push("th_tongue"); i++; continue; }
    if (pair === "sh" || pair === "ch") { seq.push("s_teeth"); i++; continue; }
    if (pair === "ph") { seq.push("fv"); i++; continue; }
    if (pair === "oo" || pair === "qu") { seq.push("oo"); i++; continue; }
    if (pair === "ee" || pair === "ea") { seq.push("ee"); i++; continue; }
    if (pair === "ou" || pair === "ow" || pair === "oh") { seq.push("oh"); i++; continue; }
    if (pair === "ai" || pair === "ay") { seq.push("eh"); i++; continue; }

    if ("bmp".includes(ch)) seq.push("bmp");
    else if ("fv".includes(ch)) seq.push("fv");
    else if ("lnd".includes(ch)) seq.push("l_alveolar");
    else if ("szct".includes(ch)) seq.push("s_teeth");
    else if ("i".includes(ch)) seq.push("ee");
    else if ("e".includes(ch)) seq.push(i === clean.length - 1 && clean.length > 2 ? "s_teeth" : "eh");
    else if ("a".includes(ch)) seq.push("ah");
    else if ("o0%".includes(ch)) seq.push("oh");
    else if ("uwq".includes(ch)) seq.push("oo");
    else if ("r".includes(ch)) seq.push("oh");
    else if ("y".includes(ch)) seq.push("ee");
    else if ("0123456789".includes(ch)) seq.push(["oh", "oo", "ah"][Number(ch) % 3]);
    else seq.push("eh");
  }
  const deduped = [];
  for (const v of seq) {
    if (!deduped.length || deduped[deduped.length - 1] !== v) deduped.push(v);
  }
  return deduped.slice(0, 7);
}

// =========================================================================
// 2. ATTACHED ANATOMICAL 5-FINGER HANDS & PHYSICALLY HELD STUDIO PROPS
// Every hand stem anchors inside the cuff (y=-1.5..+2) without poking out
// above the sleeve rim, with articulated finger silhouettes and thumb joints.
// =========================================================================
function buildCutoutHand(actorId, skinFill, strokeCol, pose, side) {
  const dir = side === "L" ? 1 : -1;

  if (pose === "holdMug") {
    const isDex = actorId === "dex";
    const mugFill = isDex ? "#090d16" : "#0284c7";
    const mugStroke = isDex ? "#52525b" : "#090d16";
    const rimFill = isDex ? "#27272a" : "#7dd3fc";
    const mugLabel = isDex ? "SHIP" : "CALM";
    return `
      <g stroke-linejoin="round" stroke-linecap="round">
        <path d="M -4.8 -1.5 L 4.8 -1.5 L 5.4 11 L -5.4 11 Z" fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        <g transform="translate(0, 16) rotate(${dir * 96})">
          <path d="M ${-dir * 10} -5 C ${-dir * 16.5} -5, ${-dir * 16.5} 7, ${-dir * 10} 7" stroke="${mugStroke}" stroke-width="2.6" fill="none" />
          <rect x="-10" y="-11" width="20" height="22" rx="3" fill="${mugFill}" stroke="${mugStroke}" stroke-width="1.6" />
          <ellipse cx="0" cy="-11" rx="10" ry="2.8" fill="${rimFill}" stroke="${mugStroke}" stroke-width="1.2" />
          <text x="0" y="-1.5" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="7" fill="#ffffff">${mugLabel}</text>
          <!-- Thumb bracing top of handle + 3 articulated wrapped fingers along lower mug -->
          <path d="M ${-dir * 10.5} -5.8 C ${-dir * 8} -6.5, ${-dir * 5.2} -5.5, ${-dir * 5.5} -3.5 C ${-dir * 5.8} -2.0, ${-dir * 8.8} -2.2, ${-dir * 10.5} -2.8 Z" fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
          <path d="M ${-dir * 10.2} 1.2 C ${-dir * 5} 1.0, ${-dir * 0.5} 1.4, ${dir * 2.5} 2.6 C ${dir * 3.8} 3.2, ${dir * 3.5} 5.0, ${dir * 1.6} 5.2
                   C ${dir * 3.2} 5.6, ${dir * 3.0} 7.4, ${dir * 0.8} 7.5
                   C ${dir * 2.0} 8.0, ${dir * 1.4} 9.8, ${-dir * 1.2} 9.6 L ${-dir * 9.8} 8.2 Z" fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.3" />
          <path d="M ${-dir * 5.5} 5.1 L ${dir * 1.5} 5.2 M ${-dir * 5.2} 7.4 L ${dir * 0.8} 7.5" stroke="${strokeCol}" stroke-width="1.0" fill="none" />
        </g>
      </g>
    `;
  }

  if (pose === "holdPen") {
    return `
      <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
        <!-- Back palm and curled ring/pinky behind stylus -->
        <path d="M -4.8 -1.5 L 4.8 -1.5 C 7.5 0.5, 8.8 4.2, 7.2 7.8 C 5.2 10.8, -1.2 11.2, -4.8 9.2 C -7.4 7.2, -7.0 2.4, -4.8 -1.5 Z"
              fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        <line x1="-2.5" y1="15.5" x2="14.5" y2="-9.5" stroke="#fbbf24" stroke-width="3.2" />
        <polygon points="-4.8,19.0 -3.8,14.5 -1.2,16.4" fill="#1e293b" />
        <!-- Index finger bracing upper barrel + pinching thumb pad + curled lower fingers -->
        <path d="M 3.2 0.2 C 6.8 -1.8, 10.4 -0.6, 9.2 3.0 C 8.0 5.6, 3.8 6.8, 0.8 5.2"
              fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.28" />
        <path d="M -3.0 2.0 C 0.6 1.8, 4.4 3.4, 4.8 6.2 C 5.0 8.6, 0.8 9.2, -3.2 7.2"
              fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.28" />
        <path d="M -4.5 7.6 C -2.0 8.8, 1.8 9.0, 3.8 8.0 M -4.2 9.4 C -1.5 10.4, 1.5 10.4, 3.2 9.5"
              stroke="${strokeCol}" stroke-width="1.0" fill="none" />
      </g>
    `;
  }

  if (pose === "holdTablet") {
    return `
      <g stroke-linejoin="round" stroke-linecap="round">
        <!-- Wrist stem + palm heel and supporting outer fingertips behind tablet -->
        <path d="M -4.8 -1.5 L 4.8 -1.5 L 5.4 14 L -5.4 14 Z" fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        <g transform="translate(0, 22) rotate(${dir * 90})">
          <!-- Back supporting finger tips peeking gently around far bezel -->
          <path d="M ${dir * 14.5} -5 C ${dir * 18.2} -5, ${dir * 18.2} -2.0, ${dir * 15} -2.0
                   M ${dir * 14.5} -1 C ${dir * 18.6} -1, ${dir * 18.6} 2.2, ${dir * 15} 2.2
                   M ${dir * 14.5} 3.2 C ${dir * 18.0} 3.2, ${dir * 18.0} 6.2, ${dir * 14.5} 6.2"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
          <rect x="-16" y="-19" width="32" height="38" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <rect x="-12" y="-14" width="24" height="28" rx="2" fill="#04101c" />
          <rect x="-8" y="-9" width="13" height="3" rx="1" fill="#34d399" />
          <rect x="-8" y="-2" width="16" height="3" rx="1" fill="#38bdf8" />
          <rect x="-8" y="5" width="10" height="3" rx="1" fill="#f59e0b" />
          <!-- Anatomically proportioned thumb resting cleanly along outer blue bezel + curled palm edge -->
          <path d="M ${-dir * 17.6} -3.2 C ${-dir * 14.2} -3.8, ${-dir * 11.8} -1.8, ${-dir * 12.0} 1.0
                   C ${-dir * 12.2} 3.2, ${-dir * 14.4} 3.6, ${-dir * 17.6} 3.0 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.3" />
          <path d="M ${-dir * 17.6} 3.6 C ${-dir * 14.2} 3.6, ${-dir * 13.6} 6.8, ${-dir * 17.6} 7.4"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
          <path d="M ${-dir * 17.6} 7.4 C ${-dir * 14.6} 7.4, ${-dir * 14.2} 10.2, ${-dir * 17.6} 10.6"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
        </g>
      </g>
    `;
  }

  if (pose === "holdPad") {
    return `
      <g stroke-linejoin="round" stroke-linecap="round">
        <path d="M -4.8 -1.5 L 4.8 -1.5 L 5.4 13 L -5.4 13 Z" fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        <g transform="translate(0, 21) rotate(${dir * 90})">
          <!-- Back fingers stabilizing opposite board edge -->
          <path d="M ${dir * 13.5} -4 C ${dir * 17.2} -4, ${dir * 17.2} -1.0, ${dir * 14} -1.0
                   M ${dir * 13.5} 0 C ${dir * 17.5} 0, ${dir * 17.5} 3.2, ${dir * 14} 3.2"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
          <rect x="-15" y="-18" width="30" height="36" rx="3" fill="#78350f" stroke="#451a03" stroke-width="1.6" />
          <rect x="-12" y="-13" width="24" height="27" fill="#f8fafc" />
          <rect x="-6" y="-20" width="12" height="5" rx="1.5" fill="#94a3b8" stroke="#334155" stroke-width="1" />
          <line x1="-8" y1="-6" x2="8" y2="-6" stroke="#64748b" stroke-width="1.8" />
          <line x1="-8" y1="1" x2="6" y2="1" stroke="#64748b" stroke-width="1.8" />
          <line x1="-8" y1="8" x2="7" y2="8" stroke="#64748b" stroke-width="1.8" />
          <!-- Anatomically proportioned thumb resting on clipboard margin -->
          <path d="M ${-dir * 16.6} -2.8 C ${-dir * 13.4} -3.4, ${-dir * 11.2} -1.4, ${-dir * 11.4} 1.2
                   C ${-dir * 11.6} 3.2, ${-dir * 13.8} 3.6, ${-dir * 16.6} 3.0 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.3" />
          <path d="M ${-dir * 16.6} 3.6 C ${-dir * 13.4} 3.6, ${-dir * 13.0} 6.8, ${-dir * 16.6} 7.4"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
          <path d="M ${-dir * 16.6} 7.4 C ${-dir * 13.8} 7.4, ${-dir * 13.4} 10.2, ${-dir * 16.6} 10.6"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.25" />
        </g>
      </g>
    `;
  }

  switch (pose) {
    case "deskRest":
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5
                   C 5.8 0.5, 8.2 1.6, 11.4 2.8 C 12.8 3.6, 12.4 6.2, 10.2 6.0 L 6.4 5.2
                   C 6.5 7.5, 6.2 10.2, 4.6 10.8 C 3.4 11.2, 2.7 9.8, 2.5 8.5
                   C 2.2 10.6, 1.5 12.5, -0.1 12.6 C -1.5 12.6, -2.0 10.8, -2.1 9.0
                   C -2.5 10.8, -3.5 12.0, -5.0 11.6 C -6.3 11.2, -6.5 9.4, -6.2 7.5
                   C -6.9 9.0, -8.3 9.4, -9.2 8.2 C -10.0 7.0, -8.5 2.4, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M -6.2 7.5 C -6.0 5.5, -5.5 4.2, -5.0 3.2
                   M -2.1 9.0 C -2.1 6.0, -2.0 4.5, -1.8 3.2
                   M 2.5 8.5 C 2.6 5.8, 2.7 4.2, 2.8 3.0
                   M 6.4 5.2 C 5.8 3.6, 5.2 2.6, 4.6 2.0"
                stroke="${strokeCol}" stroke-width="1.0" fill="none" />
          <path d="M 9.4 3.4 C 10.8 3.7, 11.1 4.9, 9.8 5.2" stroke="${strokeCol}" stroke-width="0.9" fill="none" opacity="0.65" />
        </g>
      `;
    case "point":
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5 L 20.5 -3.0 C 23.8 -3.2, 24.0 1.4, 20.2 2.0 L 5.8 3.6
                   C 6.0 6.4, 4.4 8.5, 2.0 8.5 C 0.8 10.5, -2.5 10.8, -4.0 9.4
                   C -6.5 9.8, -8.5 7.5, -7.8 4.2 C -7.2 1.8, -6.0 0.0, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M -3.5 5.2 C 0.0 5.5, 2.8 5.2, 4.5 4.2 M -4.2 7.5 C -1.2 8.0, 1.5 7.8, 3.0 7.0"
                stroke="${strokeCol}" stroke-width="1.0" fill="none" />
          <path d="M 1.5 -0.8 C 5.8 -2.4, 10.5 -0.6, 9.6 2.8 C 8.8 5.2, 3.5 5.2, 0.2 3.2"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        </g>
      `;
    case "countTwo":
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5 L 17.0 -6.4 C 20.0 -7.5, 21.4 -3.2, 18.0 -1.5 L 6.4 3.2
                   L 16.4 3.4 C 19.6 3.5, 19.8 7.6, 16.0 8.0 L 5.4 7.6
                   C 5.2 9.8, 2.5 11.4, -0.5 10.6 C -3.8 11.4, -7.8 9.2, -7.8 5.4
                   C -7.8 2.2, -6.2 0.2, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M -3.0 7.6 C -0.2 7.8, 2.4 7.6, 4.4 6.6" stroke="${strokeCol}" stroke-width="1.0" fill="none" />
          <path d="M 0.5 0.0 C 4.5 -1.5, 8.8 0.8, 7.6 4.4 C 6.6 6.8, 1.8 6.8, -1.2 4.2"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        </g>
      `;
    case "fist":
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5 C 7.5 1.0, 9.0 4.0, 8.2 7.5 C 7.5 10.2, 5.2 11.5, 3.8 10.6
                   C 2.8 12.0, 0.5 12.0, -0.2 10.6
                   C -1.2 12.0, -3.4 12.0, -4.2 10.4
                   C -5.4 11.6, -7.8 10.8, -8.2 8.2 C -8.6 4.5, -7.0 1.2, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M 3.8 10.6 C 4.2 7.8, 4.4 5.5, 4.4 4.2
                   M -0.2 10.6 C -0.1 7.8, 0.0 5.5, 0.0 4.2
                   M -4.2 10.4 C -4.2 7.8, -4.2 5.5, -4.0 4.4"
                stroke="${strokeCol}" stroke-width="1.1" fill="none" />
          <path d="M 5.4 0.5 C 7.5 1.8, 7.8 4.4, 5.0 5.2 L -2.2 5.4 C -4.4 5.4, -4.6 2.8, -2.0 2.5 L 3.8 2.2"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
        </g>
      `;
    case "spread":
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5
                   C 7.5 -2.0, 12.5 -3.8, 15.2 -2.0 C 16.6 -1.0, 15.6 1.6, 12.8 1.5 L 7.4 1.6
                   C 11.0 2.8, 15.5 4.0, 16.0 5.8 C 16.4 7.4, 13.0 7.6, 8.2 6.0
                   C 10.6 9.2, 13.2 12.8, 12.2 14.4 C 11.2 15.8, 8.6 14.0, 5.4 9.2
                   C 5.8 13.0, 6.2 16.2, 4.6 16.8 C 3.0 17.2, 1.8 14.0, 1.4 9.5
                   C 0.2 13.2, -0.8 15.8, -2.5 15.6 C -4.0 15.2, -3.8 11.8, -2.6 8.2
                   C -5.2 10.8, -7.2 12.2, -8.8 11.2 C -10.2 10.2, -8.6 5.2, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M -1.5 3.5 Q 2.0 6.2 4.5 4.2" stroke="${strokeCol}" stroke-width="1.0" fill="none" opacity="0.65" />
        </g>
      `;
    case "palmUp":
    default:
      return `
        <g transform="scale(${dir}, 1)" stroke-linejoin="round" stroke-linecap="round">
          <path d="M -4.8 -1.5 L 4.8 -1.5
                   C 6.5 -2.2, 10.5 -3.6, 13.0 -2.0 C 14.4 -1.0, 13.5 1.8, 11.2 1.8 L 6.5 1.4
                   C 10.4 2.4, 14.5 3.0, 14.8 4.8 C 15.0 6.5, 11.2 6.4, 6.8 5.6
                   C 10.8 6.8, 15.2 7.5, 15.0 9.4 C 14.8 11.2, 10.6 10.4, 6.2 9.0
                   C 9.6 10.4, 13.2 11.5, 12.6 13.2 C 12.0 14.7, 8.5 13.4, 4.8 11.4
                   C 6.8 12.8, 9.2 14.0, 8.4 15.4 C 7.6 16.8, 4.4 14.8, 1.0 12.4
                   C -5.2 11.0, -7.8 6.0, -4.8 -1.5 Z"
                fill="${skinFill}" stroke="${strokeCol}" stroke-width="1.35" />
          <path d="M 6.5 1.4 L 3.8 1.5 M 6.8 5.6 L 3.2 4.8 M 6.2 9.0 L 2.8 7.8 M 4.8 11.4 L 2.0 10.0 M -1.5 3.5 Q 1.5 6.5 0.5 9.5"
                stroke="${strokeCol}" stroke-width="0.95" fill="none" opacity="0.72" />
        </g>
      `;
  }
}

// =========================================================================
// 3. CENTER MONITOR CUTOUT ARTWORK + LIVE SWEEPING RADAR SCOPE
// =========================================================================
const MONITOR_TOPICS = {
  AGENTS: `
    <g>
      <!-- Central Orchestrator Hex Core & Radial Rings -->
      <g transform="translate(-74, 2)">
        <circle cx="0" cy="0" r="46" fill="#0ea5e9" opacity="0.10" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 4" />
        <circle cx="0" cy="0" r="30" fill="#090d16" stroke="#22d3ee" stroke-width="2" />
        <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="#0c2438" stroke="#38bdf8" stroke-width="1.8" />
        <circle cx="0" cy="0" r="7" fill="#34d399" />
        <circle cx="0" cy="-14" r="2.6" fill="#3df5ff" />
        <circle cx="12" cy="7" r="2.6" fill="#f59e0b" />
        <circle cx="-12" cy="7" r="2.6" fill="#c084fc" />
        <line x1="0" y1="-11" x2="0" y2="-4" stroke="#38bdf8" stroke-width="1.5" />
        <line x1="10" y1="6" x2="4" y2="2" stroke="#f59e0b" stroke-width="1.5" />
        <line x1="-10" y1="6" x2="-4" y2="2" stroke="#c084fc" stroke-width="1.5" />
        <text x="0" y="42" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#7dd3fc">MCP ORCHESTRATOR</text>
      </g>
      <!-- Curved Neural Bus Pipelines -->
      <g fill="none" stroke-width="2.2" stroke-linecap="round">
        <path d="M -42 -10 C -18 -10, -14 -38, 6 -38" stroke="#34d399" />
        <path d="M -42 2 C -16 2, -16 0, 6 0" stroke="#38bdf8" />
        <path d="M -42 14 C -18 14, -14 38, 6 38" stroke="#f59e0b" />
      </g>
      <!-- Stacked Telemetry Nodes -->
      <g transform="translate(74, 0)">
        <rect x="-68" y="-52" width="136" height="28" rx="6" fill="#090d16" fill-opacity="0.92" stroke="#34d399" stroke-width="1.5" />
        <circle cx="-52" cy="-38" r="4" fill="#34d399" />
        <text x="-40" y="-34" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#f8fafc">WEB SEARCH</text>
        <text x="58" y="-34" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#6ee7b7">EXA.AI</text>

        <rect x="-68" y="-14" width="136" height="28" rx="6" fill="#090d16" fill-opacity="0.92" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="-54" cy="0" r="4" fill="#38bdf8" />
        <text x="-43" y="4" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#f8fafc">GIT REPO</text>
        <text x="60" y="4" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#7dd3fc">DEEPWIKI</text>

        <rect x="-68" y="24" width="136" height="28" rx="6" fill="#090d16" fill-opacity="0.92" stroke="#f59e0b" stroke-width="1.5" />
        <circle cx="-52" cy="38" r="4" fill="#f59e0b" />
        <text x="-40" y="42" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#f8fafc">FACT CHECK</text>
        <text x="58" y="42" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#fcd34d">14ms</text>
      </g>
    </g>
  `,
  REASONING: `
    <g>
      <!-- Neural Attention Topology Graph -->
      <g transform="translate(-74, 2)">
        <rect x="-60" y="-50" width="120" height="104" rx="8" fill="#090d16" fill-opacity="0.88" stroke="#64748b" stroke-width="1.4" />
        <g stroke-width="1.5" fill="none" opacity="0.65">
          <path d="M -38 -26 C -15 -26, -15 -30, 0 -30" stroke="#c084fc" />
          <path d="M -38 -26 C -15 -26, -15 -10, 0 -10" stroke="#38bdf8" />
          <path d="M -38 2 C -15 2, -15 -10, 0 -10" stroke="#c084fc" />
          <path d="M -38 2 C -15 2, -15 12, 0 12" stroke="#34d399" />
          <path d="M -38 28 C -15 28, -15 12, 0 12" stroke="#38bdf8" />
          <path d="M -38 28 C -15 28, -15 32, 0 32" stroke="#f59e0b" />
          <path d="M 0 -30 C 16 -30, 18 -14, 36 -14" stroke="#34d399" />
          <path d="M 0 -10 C 16 -10, 18 -14, 36 -14" stroke="#c084fc" />
          <path d="M 0 12 C 16 12, 18 16, 36 16" stroke="#38bdf8" />
          <path d="M 0 32 C 16 32, 18 16, 36 16" stroke="#f59e0b" />
        </g>
        <circle cx="-38" cy="-26" r="5" fill="#c084fc" />
        <circle cx="-38" cy="2" r="5" fill="#38bdf8" />
        <circle cx="-38" cy="28" r="5" fill="#f59e0b" />
        <circle cx="0" cy="-30" r="4.5" fill="#e2e8f0" />
        <circle cx="0" cy="-10" r="4.5" fill="#e2e8f0" />
        <circle cx="0" cy="12" r="4.5" fill="#e2e8f0" />
        <circle cx="0" cy="32" r="4.5" fill="#e2e8f0" />
        <circle cx="36" cy="-14" r="6" fill="#34d399" stroke="#ffffff" stroke-width="1.2" />
        <circle cx="36" cy="16" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="1.2" />
        <text x="0" y="47" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#cbd5e1">ATTENTION MATRIX</text>
      </g>
      <!-- Chain-of-Thought Trace Card -->
      <g transform="translate(68, 2)">
        <rect x="-68" y="-50" width="136" height="104" rx="8" fill="#090d16" fill-opacity="0.92" stroke="#38bdf8" stroke-width="1.6" />
        <text x="0" y="-31" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#7dd3fc">DEEP REASONING TRACE</text>
        <text x="-54" y="-12" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#e2e8f0">01 PERCEIVE</text>
        <rect x="-54" y="-6" width="108" height="6" rx="3" fill="#1e293b" />
        <rect x="-54" y="-6" width="104" height="6" rx="3" fill="#34d399" />
        <text x="-54" y="13" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#e2e8f0">02 VERIFY</text>
        <rect x="-54" y="19" width="108" height="6" rx="3" fill="#1e293b" />
        <rect x="-54" y="19" width="90" height="6" rx="3" fill="#38bdf8" />
        <text x="-54" y="38" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#fde047">03 SYNTHESIZE</text>
        <rect x="-54" y="43" width="108" height="5" rx="2.5" fill="#1e293b" />
        <rect x="-54" y="43" width="76" height="5" rx="2.5" fill="#f59e0b" />
      </g>
    </g>
  `,
  ROBOTS: `
    <g>
      <!-- Silicon Edge NPU Package -->
      <g transform="translate(-72, 2)">
        <g stroke="#f59e0b" stroke-width="2" stroke-linecap="round">
          <line x1="-22" y1="-40" x2="-22" y2="40" />
          <line x1="-8" y1="-40" x2="-8" y2="40" />
          <line x1="8" y1="-40" x2="8" y2="40" />
          <line x1="22" y1="-40" x2="22" y2="40" />
          <line x1="-42" y1="-22" x2="42" y2="-22" />
          <line x1="-42" y1="-8" x2="42" y2="-8" />
          <line x1="-42" y1="8" x2="42" y2="8" />
          <line x1="-42" y1="22" x2="42" y2="22" />
        </g>
        <rect x="-34" y="-34" width="68" height="68" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="2" />
        <rect x="-22" y="-22" width="44" height="44" rx="5" fill="#041524" stroke="#38bdf8" stroke-width="1.8" />
        <rect x="-12" y="-12" width="10" height="10" rx="1.5" fill="#22d3ee" />
        <rect x="2" y="-12" width="10" height="10" rx="1.5" fill="#34d399" />
        <rect x="-12" y="2" width="10" height="10" rx="1.5" fill="#f59e0b" />
        <rect x="2" y="2" width="10" height="10" rx="1.5" fill="#38bdf8" />
        <text x="0" y="54" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#fcd34d">LOCAL NPU DIE</text>
      </g>
      <!-- Edge Weights Metrics Panel -->
      <g transform="translate(68, 2)">
        <rect x="-68" y="-48" width="136" height="100" rx="8" fill="#090d16" fill-opacity="0.92" stroke="#f59e0b" stroke-width="1.6" />
        <text x="0" y="-28" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="10" fill="#fbbf24">LOCAL AI &amp; BOTS</text>
        <text x="-54" y="-9" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#cbd5e1">WEIGHTS</text>
        <text x="54" y="-9" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#34d399">ON-DEVICE</text>
        <line x1="-54" y1="-2" x2="54" y2="-2" stroke="#1e293b" stroke-width="1" />
        <text x="-54" y="13" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#cbd5e1">QUANT</text>
        <text x="54" y="13" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#38bdf8">INT4 / FP8</text>
        <line x1="-54" y1="20" x2="54" y2="20" stroke="#1e293b" stroke-width="1" />
        <rect x="-54" y="29" width="108" height="16" rx="4" fill="#0c2438" />
        <text x="0" y="40" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#7dd3fc">ZERO CLOUD LATENCY</text>
      </g>
    </g>
  `,
  VIDEO: `
    <g>
      <!-- Cryptographic Verification Shield -->
      <g transform="translate(-74, 2)">
        <polygon points="0,-46 38,-28 32,20 0,44 -32,20 -38,-28" fill="#0f172a" stroke="#ec4899" stroke-width="2.2" />
        <polygon points="0,-34 26,-20 22,14 0,32 -22,14 -26,-20" fill="#1e1b4b" stroke="#38bdf8" stroke-width="1.5" />
        <path d="M -12 0 L -3 10 L 14 -10" stroke="#34d399" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <text x="0" y="54" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#f9a8d4">VERIFIED CITATIONS</text>
      </g>
      <!-- Signal & Claim Guardrails Console -->
      <g transform="translate(66, 2)">
        <rect x="-68" y="-48" width="136" height="100" rx="8" fill="#090d16" fill-opacity="0.92" stroke="#ec4899" stroke-width="1.6" />
        <text x="0" y="-28" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#f472b6">SECURITY &amp; VERIFY</text>
        <line x1="-54" y1="6" x2="54" y2="6" stroke="#334155" stroke-width="1" stroke-dasharray="3 3" />
        <path d="M -52 6 C -42 -18, -32 22, -22 2 C -12 -22, -2 20, 8 -6 C 18 -20, 28 18, 38 -4 C 44 -14, 50 4, 54 6"
              stroke="#22d3ee" stroke-width="2.6" fill="none" stroke-linecap="round" />
        <rect x="-54" y="24" width="108" height="18" rx="4" fill="#052e16" stroke="#34d399" stroke-width="1" />
        <text x="0" y="36" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#6ee7b7">GUARDRAILS PASS 100%</text>
      </g>
    </g>
  `,
  ENERGY: `
    <g>
      <!-- Liquid-Cooled Compute Cluster Array -->
      <g transform="translate(-74, 2)">
        <rect x="-52" y="-42" width="30" height="72" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.6" />
        <rect x="-15" y="-48" width="30" height="78" rx="4" fill="#0f172a" stroke="#34d399" stroke-width="1.8" />
        <rect x="22" y="-42" width="30" height="72" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.6" />
        <!-- Rack Blade Status Bars -->
        <g stroke-width="3" stroke-linecap="round">
          <line x1="-44" y1="-28" x2="-30" y2="-28" stroke="#38bdf8" />
          <line x1="-44" y1="-16" x2="-30" y2="-16" stroke="#34d399" />
          <line x1="-44" y1="-4" x2="-30" y2="-4" stroke="#38bdf8" />
          <line x1="-44" y1="8" x2="-30" y2="8" stroke="#f59e0b" />
          <line x1="-7" y1="-34" x2="7" y2="-34" stroke="#34d399" />
          <line x1="-7" y1="-22" x2="7" y2="-22" stroke="#34d399" />
          <line x1="-7" y1="-10" x2="7" y2="-10" stroke="#38bdf8" />
          <line x1="-7" y1="2" x2="7" y2="2" stroke="#34d399" />
          <line x1="-7" y1="14" x2="7" y2="14" stroke="#34d399" />
          <line x1="30" y1="-28" x2="44" y2="-28" stroke="#38bdf8" />
          <line x1="30" y1="-16" x2="44" y2="-16" stroke="#34d399" />
          <line x1="30" y1="-4" x2="44" y2="-4" stroke="#38bdf8" />
          <line x1="30" y1="8" x2="44" y2="8" stroke="#34d399" />
        </g>
        <path d="M -37 30 Q -37 44 0 44 Q 37 44 37 30" stroke="#38bdf8" stroke-width="3" fill="none" />
        <text x="0" y="55" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#6ee7b7">LIQUID CLUSTER</text>
      </g>
      <!-- Power Grid Gauge Card -->
      <g transform="translate(68, 2)">
        <rect x="-66" y="-48" width="132" height="100" rx="8" fill="#090d16" fill-opacity="0.92" stroke="#4ade80" stroke-width="1.6" />
        <text x="0" y="-31" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#4ade80">COMPUTE CAPACITY</text>
        <path d="M -34 21 A 34 34 0 0 1 34 21" stroke="#1e293b" stroke-width="7.5" fill="none" stroke-linecap="round" />
        <path d="M -34 21 A 34 34 0 0 1 24 -4" stroke="#22c55e" stroke-width="7.5" fill="none" stroke-linecap="round" />
        <text x="0" y="17" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="14" fill="#fde047">1.2 GW</text>
        <text x="0" y="40" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8.5" fill="#e2e8f0">100K GPUS ONLINE</text>
      </g>
    </g>
  `,
  OPEN_SOURCE: `
    <g>
      <!-- Git Branch Merge Graph -->
      <g transform="translate(-68, 2)">
        <rect x="-64" y="-48" width="128" height="100" rx="8" fill="#090d16" fill-opacity="0.92" stroke="#f97316" stroke-width="1.6" />
        <text x="0" y="-29" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#fb923c">OPEN WEIGHTS DAG</text>
        <line x1="-36" y1="-16" x2="-36" y2="28" stroke="#4ade80" stroke-width="3" stroke-linecap="round" />
        <path d="M -36 -10 C -12 -10, -4 -2, -4 8 C -4 18, -14 22, -36 24" stroke="#fb923c" stroke-width="2.8" fill="none" />
        <circle cx="-36" cy="-14" r="4.5" fill="#4ade80" stroke="#ffffff" stroke-width="1.2" />
        <circle cx="-4" cy="6" r="4.5" fill="#fb923c" stroke="#ffffff" stroke-width="1.2" />
        <circle cx="-36" cy="24" r="4.5" fill="#4ade80" stroke="#ffffff" stroke-width="1.2" />
        <text x="8" y="9" text-anchor="start" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="7.5" fill="#fed7aa">PR MERGED</text>
        <text x="0" y="42" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#fde047">MIT / APACHE 2.0</text>
      </g>
      <!-- Closed Enterprise Vault -->
      <g transform="translate(72, 2)">
        <rect x="-60" y="-48" width="120" height="100" rx="8" fill="#0f172a" fill-opacity="0.92" stroke="#38bdf8" stroke-width="1.6" />
        <text x="0" y="-29" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9.5" fill="#38bdf8">CLOSED VAULT</text>
        <path d="M -10 -4 V -11 A 10 10 0 0 1 10 -11 V -4" stroke="#94a3b8" stroke-width="3.2" fill="none" />
        <rect x="-15" y="-4" width="30" height="24" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.8" />
        <circle cx="0" cy="6" r="3" fill="#38bdf8" />
        <line x1="0" y1="8" x2="0" y2="14" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
        <text x="0" y="42" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="700" font-size="8" fill="#cbd5e1">HOSTED API ONLY</text>
      </g>
    </g>
  `,
};

const CHANNEL_TO_MONITOR = {
  1: { key: "AGENTS", title: "LIVE AI RADAR FEED" },
  2: { key: "REASONING", title: "MODELS & BENCHMARKS" },
  3: { key: "ROBOTS", title: "LOCAL AI & ON-DEVICE" },
  4: { key: "AGENTS", title: "TOOLS, SKILLS & MCP" },
  5: { key: "OPEN_SOURCE", title: "GITHUB REPOSITORIES" },
  6: { key: "OPEN_SOURCE", title: "FREE & OPEN WEIGHTS" },
  7: { key: "REASONING", title: "SYSTEM PROMPTS" },
  8: { key: "VIDEO", title: "SECURITY & GUARDRAILS" },
  9: { key: "ENERGY", title: "RESEARCH & PAPERS" },
  10: { key: "ENERGY", title: "AI COMPETITIONS" },
  11: { key: "AGENTS", title: "OPEN AGENTIC WEB" },
};

// =========================================================================
// 4. WARM URBAN PANORAMIC OFFICE STUDIO SVG STAGE (60-FPS VECTOR STAGE)
// =========================================================================
function buildStudioSvgMarkup() {
  const slatXs = [];
  for (let x = 418; x <= 858; x += 14) {
    slatXs.push(`<rect x="${x}" y="26" width="8" height="454" fill="${x % 28 === 0 ? "#6b442d" : "#5a3824"}" opacity="0.92" />`);
  }
  const cedarSlats = slatXs.join("");

  return `
    <svg id="broadcastSvg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI Radar urban office studio with Dex Ping and Theo Sweep" style="position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;">
      <defs>
        <!-- Warm Architectural Timber & Espresso Studio Wall -->
        <linearGradient id="wallBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#352822" />
          <stop offset="55%" stop-color="#44332a" />
          <stop offset="100%" stop-color="#291f1a" />
        </linearGradient>

        <!-- Warm Golden-Hour Dusk Urban Metropolis Sky -->
        <linearGradient id="windowSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#19335c" />
          <stop offset="38%" stop-color="#3b5284" />
          <stop offset="68%" stop-color="#9a5256" />
          <stop offset="88%" stop-color="#d97742" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>

        <!-- Soft Sunset Horizon City Haze -->
        <linearGradient id="horizonGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0" />
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.34" />
        </linearGradient>

        <!-- Cozy 3000K Warm Keylight Wash -->
        <linearGradient id="spotConeGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#fde68a" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#fde68a" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="deskTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <linearGradient id="deskFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>

        <linearGradient id="monitorScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#074d78" />
          <stop offset="100%" stop-color="#090f1c" />
        </linearGradient>

        <!-- Full Panoramic Left & Right Window Clips -->
        <clipPath id="leftWindowClip">
          <rect x="0" y="0" width="394" height="436" rx="8" />
        </clipPath>
        <clipPath id="rightWindowClip">
          <rect x="0" y="0" width="394" height="436" rx="8" />
        </clipPath>

        <!-- Exact Clipped Eye Apertures (Zero Stray Bars When Open!) -->
        <clipPath id="dex-eye-clip">
          <ellipse cx="-19" cy="0" rx="19" ry="22" transform="rotate(-10 -19 0)" />
          <ellipse cx="19" cy="0" rx="19" ry="22" transform="rotate(10 19 0)" />
        </clipPath>
        <clipPath id="theo-eye-clip">
          <ellipse cx="-19" cy="0" rx="19" ry="22.5" transform="rotate(-8 -19 0)" />
          <ellipse cx="19" cy="0" rx="19" ry="22.5" transform="rotate(8 19 0)" />
        </clipPath>
      </defs>

      <g id="masterScene" opacity="1">
        <!-- 1. WARM URBAN PANORAMIC OFFICE STUDIO ARCHITECTURE -->
        <g id="layerStudioBack" opacity="1">
          <rect x="0" y="0" width="1280" height="720" fill="url(#wallBgGrad)" />

          <!-- Warm Recessed Architectural Acoustic Center Wall with Cedar Slats -->
          <rect x="412" y="26" width="456" height="456" fill="#2a1d16" />
          ${cedarSlats}
          <rect x="412" y="26" width="456" height="456" fill="none" stroke="#85583a" stroke-width="2" opacity="0.55" />

          <!-- HUGE PANORAMIC LEFT URBAN CITY WINDOW (394x436) -->
          <g transform="translate(18, 38)">
            <rect x="0" y="0" width="394" height="436" rx="8" fill="url(#windowSkyGrad)" stroke="#3a2f29" stroke-width="5" />
            <g clip-path="url(#leftWindowClip)">
              <!-- Dusk Sunset Horizon Glow & Soft Evening Clouds -->
              <rect x="0" y="200" width="394" height="236" fill="url(#horizonGlowGrad)" />
              <ellipse cx="82" cy="86" rx="68" ry="12" fill="#fde68a" opacity="0.14" />
              <ellipse cx="290" cy="112" rx="84" ry="14" fill="#fdba74" opacity="0.16" />
              <circle cx="48" cy="48" r="1.8" fill="#ffffff" opacity="0.7" />
              <circle cx="198" cy="36" r="1.5" fill="#ffffff" opacity="0.65" />

              <!-- Distant Suspension Bridge & Bay Skyline Layer -->
              <path d="M 0 326 Q 92 268 184 326 Q 276 268 368 326" stroke="#334155" stroke-width="2.4" fill="none" opacity="0.85" />
              <rect x="88" y="254" width="8" height="92" fill="#334155" opacity="0.9" />
              <rect x="272" y="254" width="8" height="92" fill="#334155" opacity="0.9" />
              <line x1="0" y1="326" x2="394" y2="326" stroke="#475569" stroke-width="3.2" />
              <g fill="#fde68a" opacity="0.85">
                <circle cx="28" cy="324" r="1.6" />
                <circle cx="62" cy="324" r="1.6" />
                <circle cx="116" cy="324" r="1.6" />
                <circle cx="152" cy="324" r="1.6" />
                <circle cx="212" cy="324" r="1.6" />
                <circle cx="246" cy="324" r="1.6" />
                <circle cx="312" cy="324" r="1.6" />
              </g>

              <!-- Background Atmospheric Skyscrapers -->
              <g fill="#2b3d59">
                <rect x="14" y="218" width="44" height="218" />
                <rect x="118" y="192" width="48" height="244" />
                <rect x="202" y="210" width="42" height="226" />
                <rect x="308" y="182" width="52" height="254" />
              </g>

              <!-- Foreground Crisp Metropolitan Towers + Spire + Lit Office Windows -->
              <g fill="#1d2b40" stroke="#334a66" stroke-width="1">
                <rect x="46" y="198" width="56" height="238" rx="1" />
                <rect x="58" y="184" width="32" height="14" />
                <!-- Tapering Obelisk / Tech Tower -->
                <polygon points="154,436 164,148 186,124 208,148 218,436" fill="#23334b" />
                <line x1="186" y1="124" x2="186" y2="96" stroke="#94a3b8" stroke-width="2" />
                <circle cx="186" cy="95" r="2.2" fill="#f87171" />
                <!-- Stepped Financial Tower & Slanted Highrise -->
                <rect x="234" y="172" width="60" height="264" rx="1" />
                <rect x="246" y="152" width="36" height="20" />
                <polygon points="326,436 326,162 378,136 378,436" fill="#1a2639" />
              </g>

              <!-- Warm Lit Urban Office Windows -->
              <g fill="#fcd34d" opacity="0.82">
                <rect x="56" y="214" width="7" height="5" /><rect x="69" y="214" width="7" height="5" /><rect x="82" y="214" width="7" height="5" />
                <rect x="56" y="230" width="7" height="5" /><rect x="82" y="230" width="7" height="5" />
                <rect x="56" y="250" width="7" height="5" /><rect x="69" y="250" width="7" height="5" />
                <rect x="56" y="274" width="7" height="5" /><rect x="69" y="274" width="7" height="5" /><rect x="82" y="274" width="7" height="5" />
                <rect x="172" y="168" width="6" height="5" /><rect x="184" y="168" width="6" height="5" /><rect x="196" y="168" width="6" height="5" />
                <rect x="172" y="190" width="6" height="5" /><rect x="196" y="190" width="6" height="5" />
                <rect x="172" y="218" width="6" height="5" /><rect x="184" y="218" width="6" height="5" />
                <rect x="172" y="250" width="6" height="5" /><rect x="184" y="250" width="6" height="5" /><rect x="196" y="250" width="6" height="5" />
                <rect x="244" y="188" width="8" height="5" /><rect x="260" y="188" width="8" height="5" /><rect x="276" y="188" width="8" height="5" />
                <rect x="244" y="208" width="8" height="5" /><rect x="276" y="208" width="8" height="5" />
                <rect x="244" y="234" width="8" height="5" /><rect x="260" y="234" width="8" height="5" />
                <rect x="336" y="176" width="8" height="5" /><rect x="352" y="176" width="8" height="5" />
                <rect x="336" y="202" width="8" height="5" /><rect x="352" y="202" width="8" height="5" />
              </g>
              <g fill="#7dd3fc" opacity="0.68">
                <rect x="69" y="230" width="7" height="5" /><rect x="82" y="250" width="7" height="5" />
                <rect x="184" y="190" width="6" height="5" /><rect x="196" y="218" width="6" height="5" />
                <rect x="260" y="208" width="8" height="5" /><rect x="276" y="234" width="8" height="5" />
                <rect x="336" y="226" width="8" height="5" /><rect x="352" y="252" width="8" height="5" />
              </g>

              <!-- Sunset Glare Reflection on Glass Pane -->
              <polygon points="18,0 64,0 24,360 0,360" fill="#ffffff" opacity="0.06" />
              <polygon points="164,0 186,0 144,360 124,360" fill="#ffffff" opacity="0.04" />
            </g>

            <!-- Sleek Architectural Mullions + Warm Interior Timber Sill -->
            <line x1="132" y1="0" x2="132" y2="436" stroke="#3a2f29" stroke-width="4" />
            <line x1="264" y1="0" x2="264" y2="436" stroke="#3a2f29" stroke-width="4" />
            <line x1="0" y1="342" x2="394" y2="342" stroke="#3a2f29" stroke-width="4" />
            <rect x="0" y="0" width="394" height="436" rx="8" fill="none" stroke="#8c7564" stroke-width="2" />
            <rect x="-4" y="424" width="402" height="16" rx="3" fill="#6e472f" stroke="#2c1d14" stroke-width="2" />
          </g>

          <!-- HUGE PANORAMIC RIGHT URBAN CITY WINDOW (394x436) -->
          <g transform="translate(868, 38)">
            <rect x="0" y="0" width="394" height="436" rx="8" fill="url(#windowSkyGrad)" stroke="#3a2f29" stroke-width="5" />
            <g clip-path="url(#rightWindowClip)">
              <rect x="0" y="200" width="394" height="236" fill="url(#horizonGlowGrad)" />
              <ellipse cx="120" cy="108" rx="76" ry="13" fill="#fdba74" opacity="0.15" />
              <ellipse cx="305" cy="76" rx="64" ry="11" fill="#fde68a" opacity="0.14" />
              <circle cx="152" cy="44" r="1.8" fill="#ffffff" opacity="0.68" />
              <circle cx="348" cy="54" r="1.5" fill="#ffffff" opacity="0.65" />

              <!-- Background Urban Skyline -->
              <g fill="#2b3d59">
                <rect x="26" y="196" width="48" height="240" />
                <rect x="134" y="210" width="44" height="226" />
                <rect x="234" y="186" width="52" height="250" />
                <rect x="336" y="214" width="46" height="222" />
              </g>

              <!-- Foreground Financial Highrises & Communication Spire -->
              <g fill="#1d2b40" stroke="#334a66" stroke-width="1">
                <polygon points="16,436 16,154 70,132 70,436" fill="#1a2639" />
                <rect x="86" y="178" width="58" height="258" rx="1" />
                <rect x="98" y="160" width="34" height="18" />
                <polygon points="178,436 186,144 214,118 242,144 248,436" fill="#23334b" />
                <line x1="214" y1="118" x2="214" y2="88" stroke="#94a3b8" stroke-width="2" />
                <circle cx="214" cy="87" r="2.2" fill="#f87171" />
                <rect x="278" y="194" width="60" height="242" rx="1" />
                <rect x="290" y="178" width="36" height="16" />
              </g>

              <!-- Warm Lit City Office Windows -->
              <g fill="#fcd34d" opacity="0.82">
                <rect x="26" y="168" width="8" height="5" /><rect x="44" y="168" width="8" height="5" />
                <rect x="26" y="194" width="8" height="5" /><rect x="44" y="194" width="8" height="5" />
                <rect x="96" y="196" width="8" height="5" /><rect x="112" y="196" width="8" height="5" /><rect x="128" y="196" width="8" height="5" />
                <rect x="96" y="218" width="8" height="5" /><rect x="128" y="218" width="8" height="5" />
                <rect x="196" y="164" width="6" height="5" /><rect x="210" y="164" width="6" height="5" /><rect x="224" y="164" width="6" height="5" />
                <rect x="196" y="188" width="6" height="5" /><rect x="224" y="188" width="6" height="5" />
                <rect x="196" y="214" width="6" height="5" /><rect x="210" y="214" width="6" height="5" />
                <rect x="288" y="210" width="7" height="5" /><rect x="304" y="210" width="7" height="5" /><rect x="320" y="210" width="7" height="5" />
                <rect x="288" y="232" width="7" height="5" /><rect x="304" y="232" width="7" height="5" />
              </g>
              <g fill="#7dd3fc" opacity="0.68">
                <rect x="44" y="220" width="8" height="5" /><rect x="112" y="218" width="8" height="5" />
                <rect x="210" y="188" width="6" height="5" /><rect x="224" y="214" width="6" height="5" />
                <rect x="320" y="232" width="7" height="5" /><rect x="288" y="254" width="7" height="5" />
              </g>

              <polygon points="330,0 374,0 334,360 294,360" fill="#ffffff" opacity="0.06" />
            </g>

            <!-- Sleek Architectural Mullions + Warm Timber Sill -->
            <line x1="130" y1="0" x2="130" y2="436" stroke="#3a2f29" stroke-width="4" />
            <line x1="262" y1="0" x2="262" y2="436" stroke="#3a2f29" stroke-width="4" />
            <line x1="0" y1="342" x2="394" y2="342" stroke="#3a2f29" stroke-width="4" />
            <rect x="0" y="0" width="394" height="436" rx="8" fill="none" stroke="#8c7564" stroke-width="2" />
            <rect x="-4" y="424" width="402" height="16" rx="3" fill="#6e472f" stroke="#2c1d14" stroke-width="2" />
          </g>

          <!-- INDOOR OFFICE TERRACOTTA PLANTERS & LUSH GREENERY (Outer Sill Corners) -->
          <g transform="translate(56, 444)">
            <path d="M -2 -8 C -18 -26, -26 -42, -16 -52 C -6 -58, 0 -32, 0 -10 Z" fill="#16a34a" stroke="#14532d" stroke-width="1.5" />
            <path d="M 2 -10 C 18 -30, 26 -46, 14 -56 C 4 -60, 0 -34, 0 -12 Z" fill="#22c55e" stroke="#14532d" stroke-width="1.5" />
            <path d="M 0 -12 C -6 -38, -8 -62, 0 -68 C 8 -62, 6 -38, 0 -12 Z" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
            <polygon points="-16,-12 16,-12 12,18 -12,18" fill="#c26d43" stroke="#7c2d12" stroke-width="1.8" />
            <rect x="-18" y="-15" width="36" height="6" rx="2" fill="#d98254" stroke="#7c2d12" stroke-width="1.6" />
          </g>
          <g transform="translate(1224, 444)">
            <path d="M -2 -8 C -18 -26, -26 -42, -16 -52 C -6 -58, 0 -32, 0 -10 Z" fill="#22c55e" stroke="#14532d" stroke-width="1.5" />
            <path d="M 2 -10 C 18 -30, 26 -46, 14 -56 C 4 -60, 0 -34, 0 -12 Z" fill="#16a34a" stroke="#14532d" stroke-width="1.5" />
            <path d="M 0 -12 C -6 -38, -8 -62, 0 -68 C 8 -62, 6 -38, 0 -12 Z" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
            <polygon points="-16,-12 16,-12 12,18 -12,18" fill="#c26d43" stroke="#7c2d12" stroke-width="1.8" />
            <rect x="-18" y="-15" width="36" height="6" rx="2" fill="#d98254" stroke="#7c2d12" stroke-width="1.6" />
          </g>

          <!-- COMPACT SMOKED-GLASS CREDENZA PLAQUES (Positioned cleanly above desk mugs!) -->
          <g transform="translate(88, 330)">
            <rect x="0" y="0" width="142" height="94" rx="6" fill="#0b1220" fill-opacity="0.88" stroke="#64748b" stroke-width="1.6" />
            <text x="10" y="16" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8" fill="#94a3b8">MODEL CLUSTER // WEST</text>
            <g transform="translate(16, 33)">
              <circle cx="0" cy="-3.5" r="2.4" fill="#38bdf8" />
              <circle cx="3.5" cy="0" r="2.4" fill="#22c55e" />
              <circle cx="0" cy="3.5" r="2.4" fill="#38bdf8" />
              <circle cx="-3.5" cy="0" r="2.4" fill="#22c55e" />
              <text x="11" y="3" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.5" fill="#e2e8f0">OPEN MODELS</text>
              <circle cx="110" cy="0" r="2.8" fill="#22c55e" />
            </g>
            <g transform="translate(16, 55)">
              <rect x="-5" y="-5" width="10" height="10" rx="2" fill="#18181b" stroke="#94a3b8" stroke-width="1.1" />
              <text x="0" y="3" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="7.5" fill="#ffffff">A</text>
              <text x="11" y="3" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.5" fill="#f8fafc">AGENT DESK</text>
              <circle cx="110" cy="0" r="2.8" fill="#38bdf8" />
            </g>
            <g transform="translate(16, 77)">
              <ellipse cx="0" cy="0" rx="5.5" ry="3.2" fill="none" stroke="#38bdf8" stroke-width="1.6" />
              <text x="11" y="3" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.5" fill="#cbd5e1">LOCAL GPU</text>
              <circle cx="110" cy="0" r="2.8" fill="#fbbf24" />
            </g>
          </g>

          <g transform="translate(1050, 330)">
            <rect x="0" y="0" width="142" height="94" rx="6" fill="#0b1220" fill-opacity="0.88" stroke="#64748b" stroke-width="1.6" />
            <text x="10" y="16" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8" fill="#94a3b8">MODEL CLUSTER // EAST</text>
            <g transform="translate(16, 33)">
              <polygon points="0,-5 4.8,-2.5 4.8,2.5 0,5 -4.8,2.5 -4.8,-2.5" fill="none" stroke="#10b981" stroke-width="1.6" />
              <text x="11" y="3" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.5" fill="#e2e8f0">MCP SERVERS</text>
              <circle cx="110" cy="0" r="2.8" fill="#10b981" />
            </g>
            <g transform="translate(16, 53)">
              <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="none" stroke="#f97316" stroke-width="1.6" />
              <text x="11" y="3" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.5" fill="#fed7aa">SKILLS LIBRARY</text>
              <circle cx="110" cy="0" r="2.8" fill="#f97316" />
            </g>
            <g transform="translate(10, 66) rotate(-1.2)">
              <rect x="0" y="0" width="122" height="20" rx="2" fill="#fef08a" stroke="#ca8a04" stroke-width="1.1" />
              <text x="61" y="13" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="7.8" fill="#713f12">TODO: SOLVE AGI</text>
            </g>
          </g>

          <!-- TRANSLUCENT TOP-RIGHT WALL TELEMETRY BAR (Cycles AI Lab Status) -->
          <g transform="translate(1078, 52)">
            <rect id="easterScreenBorder" x="0" y="0" width="170" height="52" rx="7" fill="#090f1d" fill-opacity="0.88" stroke="#38bdf8" stroke-width="2" />
            <circle id="easterScreenLed" cx="13" cy="14" r="3.4" fill="#22c55e" />
            <text id="easterScreenLine1" x="24" y="17" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="8.2" fill="#38bdf8">AI TELEMETRY</text>
            <text id="easterScreenLine2" x="10" y="38" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-weight="700" font-size="9" fill="#e2e8f0">ALL NODES NOMINAL</text>
          </g>

          <!-- ON AIR SIGN (Upper-Left Panoramic Corner, Symmetric With Telemetry Bar) -->
          <g transform="translate(32, 52)">
            <rect x="0" y="0" width="142" height="42" rx="7" fill="#7f1d1d" stroke="#f87171" stroke-width="2.5" />
            <rect id="onAirSignBg" x="5" y="5" width="132" height="32" rx="5" fill="#c81e1e" />
            <circle id="onAirSignDot" cx="18" cy="21" r="4.5" fill="#ffffff" class="live-pulse" />
            <text id="onAirSignText" x="79" y="26" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="13.5" fill="#ffffff" letter-spacing="0.6">ON AIR</text>
          </g>

          <!-- RIGHT CHANNEL BADGE -->
          <g transform="translate(1096, 22)" opacity="0">
            <text id="channelSignSub" x="0" y="0">CH 01</text>
          </g>

          <!-- HUGE CENTER STUDIO MONITOR -->
          <g transform="translate(428, 34)">
            <rect x="0" y="0" width="424" height="260" rx="14" fill="#0b1120" stroke="#475569" stroke-width="5" />
            <rect x="10" y="10" width="404" height="240" rx="8" fill="url(#monitorScreenGrad)" stroke="#38bdf8" stroke-width="2.5" />
            <g stroke="#38bdf8" stroke-width="0.6" opacity="0.16">
              <line x1="10" y1="68" x2="414" y2="68" />
              <line x1="10" y1="126" x2="414" y2="126" />
              <line x1="10" y1="184" x2="414" y2="184" />
              <line x1="112" y1="10" x2="112" y2="250" />
              <line x1="212" y1="10" x2="212" y2="250" />
              <line x1="312" y1="10" x2="312" y2="250" />
            </g>
            <rect id="monitorBadgeBg" x="20" y="19" width="96" height="25" rx="5" fill="#e11d48" />
            <text id="monitorBadgeText" x="68" y="36" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="11" fill="#ffffff" letter-spacing="0.6">BREAKING</text>
            <text id="monitorTitleText" x="238" y="36" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="13.5" fill="#fef08a" letter-spacing="0.4">LIVE AI RADAR</text>
            <!-- Mini Sweeping Radar Scope in top-right corner -->
            <g transform="translate(362, 14)">
              <circle cx="21" cy="21" r="19" fill="#041510" stroke="#3ddc97" stroke-width="1.8" />
              <circle cx="21" cy="21" r="10" fill="none" stroke="#1f9a63" stroke-width="1" />
              <line id="miniRadarSweep" x1="21" y1="21" x2="32" y2="10" stroke="#b8ffd6" stroke-width="2" stroke-linecap="round" />
              <circle cx="26" cy="15" r="2" fill="#3df5ff" />
            </g>
            <g id="monitorArtwork" transform="translate(212, 148) scale(1.14)"></g>
          </g>

          <!-- WARM ARCHITECTURAL CEILING SOFFIT, LINEAR BRASS COVE LIGHT & STUDIO SPOTS -->
          <g>
            <polygon points="365,24 190,500 540,500" fill="url(#spotConeGrad)" />
            <polygon points="915,24 740,500 1090,500" fill="url(#spotConeGrad)" />
            <rect x="0" y="0" width="1280" height="26" fill="#2b2019" stroke="#5a4335" stroke-width="2" />
            <rect x="24" y="23" width="1232" height="3" fill="#f59e0b" opacity="0.58" />
            <!-- Studio Lens Indicator -->
            <g transform="translate(640, 13)">
              <rect x="-14" y="-8" width="28" height="16" rx="4" fill="#e2e8f0" stroke="#475569" stroke-width="1.6" />
              <circle cx="0" cy="0" r="6" fill="#090d16" />
              <circle cx="0" cy="0" r="3" fill="#ef4444" class="live-pulse" />
              <circle cx="-1" cy="-1" r="1" fill="#fef08a" />
            </g>
            <g transform="translate(365, 22)">
              <rect x="-18" y="0" width="36" height="18" rx="4" fill="#3b2d26" stroke="#85583a" stroke-width="2" />
              <ellipse cx="0" cy="18" rx="15" ry="4" fill="#fde68a" />
            </g>
            <g transform="translate(915, 22)">
              <rect x="-18" y="0" width="36" height="18" rx="4" fill="#3b2d26" stroke="#85583a" stroke-width="2" />
              <ellipse cx="0" cy="18" rx="15" ry="4" fill="#fde68a" />
            </g>
          </g>

          <!-- WARM COGNAC-BROWN EXECUTIVE STUDIO CHAIRS -->
          <g>
            <g transform="translate(365, 445)">
              <rect x="-86" y="-175" width="172" height="200" rx="24" fill="#4a3123" stroke="#241710" stroke-width="3.5" />
              <rect x="-72" y="-160" width="144" height="175" rx="18" fill="#6b4733" stroke="#362318" stroke-width="2" />
              <line x1="-50" y1="-115" x2="50" y2="-115" stroke="#4a3123" stroke-width="2.5" />
              <line x1="-50" y1="-65" x2="50" y2="-65" stroke="#4a3123" stroke-width="2.5" />
            </g>
            <g transform="translate(915, 445)">
              <rect x="-86" y="-175" width="172" height="200" rx="24" fill="#4a3123" stroke="#241710" stroke-width="3.5" />
              <rect x="-72" y="-160" width="144" height="175" rx="18" fill="#6b4733" stroke="#362318" stroke-width="2" />
              <line x1="-50" y1="-115" x2="50" y2="-115" stroke="#4a3123" stroke-width="2.5" />
              <line x1="-50" y1="-65" x2="50" y2="-65" stroke="#4a3123" stroke-width="2.5" />
            </g>
          </g>
        </g>

        <!-- 2. CHARACTERS TORSO & HEAD LAYER (AUTHENTIC LIKENESS ATTIRE) -->
        <g id="layerCharactersTorsoHead" opacity="1">
          <!-- DEX PING (LEFT, x=365, y=505) : Matte-Black Minimalist Bomber Jacket + Charcoal Crew Tee -->
          <g id="dex-root" transform="translate(365, 505)">
            <g id="dex-waist" transform="translate(0, 0) rotate(0)">
              <ellipse cx="0" cy="4" rx="68" ry="24" fill="#111318" stroke="#090d16" stroke-width="2.5" />
              <g>
                <!-- Matte-Black Structured Bomber Jacket Body -->
                <path d="M -68 -116 Q 0 -126 68 -116 L 74 6 Q 0 18 -74 6 Z" fill="#14161d" stroke="#090d16" stroke-width="2.8" stroke-linejoin="round" />
                <!-- Minimalist Charcoal-Black Crewneck Tee Inside Jacket -->
                <path d="M -28 -113 L 28 -113 L 30 6 Q 0 12 -30 6 Z" fill="#0b0d13" />
                <!-- Subtle Jacket Lapels / Zip Placket (No loud biker studs or billboard text!) -->
                <polygon points="-66,-114 -26,-112 -28,6 -68,4" fill="#1a1d26" stroke="#27272a" stroke-width="2" stroke-linejoin="round" />
                <polygon points="66,-114 26,-112 28,6 68,4" fill="#1a1d26" stroke="#27272a" stroke-width="2" stroke-linejoin="round" />
                <line x1="-26" y1="-110" x2="-28" y2="5" stroke="#3f3f46" stroke-width="2" />
                <line x1="26" y1="-110" x2="28" y2="5" stroke="#3f3f46" stroke-width="2" />
                <!-- Sleek Bomber Stand Collar -->
                <path d="M -32 -118 Q -18 -100 -24 -84 L -40 -90 Q -48 -106 -38 -118 Z" fill="#1f2430" stroke="#090d16" stroke-width="2" />
                <path d="M 32 -118 Q 18 -100 24 -84 L 40 -90 Q 48 -106 38 -118 Z" fill="#1f2430" stroke="#090d16" stroke-width="2" />
                <!-- Subtle Understated Brushed-Silver "R" (AI Radar) Jacket Lapel Pin + Chest Seam -->
                <circle cx="43" cy="-78" r="9.5" fill="#090d16" stroke="#475569" stroke-width="1.6" />
                <text x="43" y="-74" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="11" fill="#e2e8f0">R</text>
                <line x1="-54" y1="-54" x2="-38" y2="-54" stroke="#27272a" stroke-width="2" />
                <!-- Tiny Dark Broadcast Lav Mic Clip -->
                <rect x="-24" y="-82" width="7" height="12" rx="2.5" fill="#090d16" stroke="#64748b" stroke-width="1.3" />
              </g>
              <!-- Neckline & Crew Tee Collar -->
              <path d="M -21 -128 L 21 -128 L 23 -102 Q 0 -92 -23 -102 Z" fill="#fde68a" stroke="#d97706" stroke-width="2.2" stroke-linejoin="round" />
              <path d="M -27 -111 Q 0 -97 27 -111" stroke="#27272a" stroke-width="5" fill="none" stroke-linecap="round" />

              <g id="dex-neck" transform="translate(0, -124) rotate(0)">
                <circle cx="0" cy="-6" r="18" fill="#fde68a" />
                <g transform="translate(0, -72)">
                  <ellipse cx="-72" cy="6" rx="10" ry="15" fill="#fde68a" stroke="#d97706" stroke-width="2" />
                  <ellipse cx="72" cy="6" rx="10" ry="15" fill="#fde68a" stroke="#d97706" stroke-width="2" />
                  <path d="M -67 -32 C -66 -68, -46 -76, 0 -76 C 46 -76, 66 -68, 67 -32 C 72 18, 53 62, 0 70 C -53 62, -72 18, -67 -32 Z" fill="#fef3c7" stroke="#d97706" stroke-width="2.4" stroke-linejoin="round" />
                  <path d="M -53 14 L -40 32 M 53 14 L 40 32" stroke="#d97706" stroke-width="2.4" stroke-linecap="round" opacity="0.68" />
                  <path d="M -14 58 Q 0 63 14 58" stroke="#d97706" stroke-width="2.4" fill="none" stroke-linecap="round" />
                  <!-- Sculpted Dark Brown Hair with Subtle Widow's Peak & Tapered Sides -->
                  <g>
                    <path d="M -70 -20 C -74 -58, -50 -86, 0 -86 C 50 -86, 74 -58, 70 -20 C 66 -38, 48 -52, 22 -52 C 10 -46, 0 -38, 0 -38 C 0 -38, -10 -46, -22 -52 C -48 -52, -66 -38, -70 -20 Z" fill="#292524" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
                    <path d="M -38 -62 Q -4 -76 34 -60 Q 10 -50 -16 -52 Z" fill="#44403c" opacity="0.85" />
                  </g>
                  <!-- Clipped South Park Eyes (Zero Orange Bars When Open!) -->
                  <g transform="translate(0, -6)">
                    <ellipse cx="-19" cy="0" rx="19" ry="22" transform="rotate(-10 -19 0)" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.6" />
                    <ellipse cx="19" cy="0" rx="19" ry="22" transform="rotate(10 19 0)" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.6" />
                    <g clip-path="url(#dex-eye-clip)">
                      <circle id="dex-pupil-L" cx="-14" cy="0" r="4.6" fill="#090d16" />
                      <circle id="dex-pupil-R" cx="14" cy="0" r="4.6" fill="#090d16" />
                      <circle id="dex-glint-L" cx="-12.5" cy="-1.6" r="1.4" fill="#ffffff" />
                      <circle id="dex-glint-R" cx="15.5" cy="-1.6" r="1.4" fill="#ffffff" />
                      <rect id="dex-lid-top" x="-44" y="-28" width="88" height="0" fill="#fef3c7" stroke="none" opacity="0" />
                      <line id="dex-lash-top" x1="-44" y1="-28" x2="44" y2="-28" stroke="#92400e" stroke-width="2.2" opacity="0" />
                      <rect id="dex-lid-bot" x="-44" y="28" width="88" height="0" fill="#fef3c7" stroke="none" opacity="0" />
                      <line id="dex-lash-bot" x1="-44" y1="28" x2="44" y2="28" stroke="#b45309" stroke-width="1.5" opacity="0" />
                    </g>
                  </g>
                  <g transform="translate(0, -33)">
                    <polygon id="dex-brow-L" points="-42,-4 -5,-6 -4,1 -40,4" fill="#1c1917" />
                    <polygon id="dex-brow-R" points="5,-6 42,-4 40,4 4,1" fill="#1c1917" />
                  </g>
                  <g id="dex-mouth" transform="translate(0, 34) scale(1.42)"></g>
                </g>
              </g>
            </g>
          </g>

          <!-- THEO SWEEP (RIGHT, x=915, y=505) : Unbuttoned Navy Blazer + Heather-Grey Crewneck Tee -->
          <g id="theo-root" transform="translate(915, 505)">
            <g id="theo-waist" transform="translate(0, 0) rotate(0)">
              <ellipse cx="0" cy="4" rx="64" ry="24" fill="#1e293b" stroke="#090d16" stroke-width="2.5" />
              <g>
                <!-- Tailored Deep Navy Blazer Base -->
                <path d="M -64 -116 Q 0 -124 64 -116 L 68 6 Q 0 18 -68 6 Z" fill="#1e293b" stroke="#090d16" stroke-width="2.8" stroke-linejoin="round" />
                <!-- Minimalist Heather-Grey Crewneck T-Shirt Visible Down Center -->
                <path d="M -26 -114 L 26 -114 L 27 6 Q 0 11 -27 6 Z" fill="#94a3b8" />
                <!-- Structured Blazer Lapels & Tailored Breast Pocket -->
                <polygon points="-62,-115 -22,-113 -24,6 -65,4" fill="#273449" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
                <polygon points="62,-115 22,-113 24,6 65,4" fill="#273449" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
                <polygon points="-38,-115 -14,-82 -26,-56 -46,-88" fill="#334155" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round" />
                <polygon points="38,-115 14,-82 26,-56 46,-88" fill="#334155" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round" />
                <line x1="34" y1="-44" x2="54" y2="-44" stroke="#64748b" stroke-width="2.2" />
                <!-- Emerald OpenAI-nod Hex Pin on Theo's Blazer Lapel -->
                <g transform="translate(33, -78)">
                  <circle cx="0" cy="0" r="8.5" fill="#10b981" stroke="#ffffff" stroke-width="1.6" />
                  <polygon points="0,-5 4.8,-1.5 3.2,4.5 -3.2,4.5 -4.8,-1.5" fill="none" stroke="#ffffff" stroke-width="1.5" />
                </g>
                <!-- Tiny Black Lav Mic Clip on Grey Crew Tee -->
                <rect x="-15" y="-82" width="7" height="12" rx="2.5" fill="#090d16" stroke="#64748b" stroke-width="1.3" />
              </g>
              <!-- Neck & Heather-Grey Crewneck + Subtle White Undershirt Rim -->
              <path d="M -20 -128 L 20 -128 L 22 -102 Q 0 -92 -22 -102 Z" fill="#fed7aa" stroke="#d97706" stroke-width="2.2" stroke-linejoin="round" />
              <path d="M -24 -111 Q 0 -96 24 -111" stroke="#f8fafc" stroke-width="4.5" fill="none" stroke-linecap="round" />
              <path d="M -26 -108 Q 0 -93 26 -108" stroke="#64748b" stroke-width="4" fill="none" stroke-linecap="round" />

              <g id="theo-neck" transform="translate(0, -122) rotate(0)">
                <circle cx="0" cy="-6" r="17.5" fill="#fed7aa" />
                <g transform="translate(0, -72)">
                  <ellipse cx="-70" cy="6" rx="10" ry="15" fill="#ffedd5" stroke="#d97706" stroke-width="2" />
                  <ellipse cx="70" cy="6" rx="10" ry="15" fill="#ffedd5" stroke="#d97706" stroke-width="2" />
                  <path d="M -67 -26 C -70 -78, 70 -78, 67 -26 C 70 23, 55 64, 0 70 C -55 64, -70 23, -67 -26 Z" fill="#ffedd5" stroke="#d97706" stroke-width="2.4" stroke-linejoin="round" />
                  <ellipse cx="-38" cy="20" rx="13" ry="7.5" fill="#fda4af" opacity="0.38" />
                  <ellipse cx="38" cy="20" rx="13" ry="7.5" fill="#fda4af" opacity="0.38" />
                  <path d="M -14 57 Q 0 62 14 57" stroke="#d97706" stroke-width="2.4" fill="none" stroke-linecap="round" />
                  <!-- Tousled Wavy Chestnut-Brown Silicon Valley Hair -->
                  <g>
                    <path d="M -72 -18 C -79 -70, -42 -93, 7 -90 C 52 -90, 79 -66, 72 -14 C 67 -32, 52 -46, 28 -49 C 7 -44, -20 -49, -44 -44 C -58 -38, -67 -26, -72 -18 Z" fill="#5c3a21" stroke="#3e2716" stroke-width="2.4" stroke-linejoin="round" />
                    <path d="M -46 -56 Q -22 -74 6 -66 Q 32 -76 52 -54 Q 20 -52 -14 -48 Z" fill="#6f4729" opacity="0.9" />
                  </g>
                  <!-- Clipped South Park Eyes (Zero Orange Bars When Open!) -->
                  <g transform="translate(0, -6)">
                    <ellipse cx="-19" cy="0" rx="19" ry="22.5" transform="rotate(-8 -19 0)" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.6" />
                    <ellipse cx="19" cy="0" rx="19" ry="22.5" transform="rotate(8 19 0)" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.6" />
                    <g clip-path="url(#theo-eye-clip)">
                      <circle id="theo-pupil-L" cx="-14" cy="0" r="4.6" fill="#090d16" />
                      <circle id="theo-pupil-R" cx="14" cy="0" r="4.6" fill="#090d16" />
                      <circle id="theo-glint-L" cx="-12.5" cy="-1.6" r="1.4" fill="#ffffff" />
                      <circle id="theo-glint-R" cx="15.5" cy="-1.6" r="1.4" fill="#ffffff" />
                      <rect id="theo-lid-top" x="-44" y="-28" width="88" height="0" fill="#ffedd5" stroke="none" opacity="0" />
                      <line id="theo-lash-top" x1="-44" y1="-28" x2="44" y2="-28" stroke="#92400e" stroke-width="2.2" opacity="0" />
                      <rect id="theo-lid-bot" x="-44" y="28" width="88" height="0" fill="#ffedd5" stroke="none" opacity="0" />
                      <line id="theo-lash-bot" x1="-44" y1="28" x2="44" y2="28" stroke="#b45309" stroke-width="1.5" opacity="0" />
                    </g>
                  </g>
                  <g transform="translate(0, -33)">
                    <polygon id="theo-brow-L" points="-42,-3 -5,-8 -4,0 -40,4" fill="#4a2e19" />
                    <polygon id="theo-brow-R" points="5,-8 42,-3 40,4 4,0" fill="#4a2e19" />
                  </g>
                  <g id="theo-mouth" transform="translate(0, 34) scale(1.42)"></g>
                </g>
              </g>
            </g>
          </g>
        </g>

        <!-- 3. CURVED LAYERED PAPER-CUTOUT NEWS ANCHOR DESK -->
        <g id="layerNewsDesk" opacity="1">
          <path d="M 95 492 Q 640 472 1185 492 L 1255 720 L 25 720 Z" fill="url(#deskFrontGrad)" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" />
          <path d="M 135 516 Q 640 498 1145 516 L 1175 605 Q 640 590 105 605 Z" fill="#090d16" opacity="0.6" stroke="#1d4ed8" stroke-width="2" />
          <path d="M 120 555 Q 640 538 1160 555" stroke="#38bdf8" stroke-width="2.2" fill="none" opacity="0.45" />
          <path d="M 120 472 Q 640 452 1160 472 L 1198 496 Q 640 476 82 496 Z" fill="url(#deskTopGrad)" stroke="#451a03" stroke-width="3" stroke-linejoin="round" />
          <polygon points="240,474 490,470 500,488 230,492" fill="#1e293b" stroke="#475569" stroke-width="1.5" />
          <polygon points="790,470 1040,474 1050,492 780,488" fill="#1e293b" stroke="#475569" stroke-width="1.5" />

          <g transform="translate(640, 548)">
            <polygon points="-160,-36 160,-36 176,36 -176,36" fill="#090d16" stroke="#f59e0b" stroke-width="4" stroke-linejoin="round" />
            <polygon points="-150,-28 150,-28 163,28 -163,28" fill="#172554" />
            <text x="0" y="-2" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="25" fill="#fbbf24" letter-spacing="2">AI RADAR</text>
            <text x="0" y="20" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="11" fill="#f8fafc" letter-spacing="1">THE RADAR ROOM &#8226; LIVE DESK</text>
          </g>
        </g>

        <!-- 4. DESK PROPS LAYER (PLACED BEFORE FOREGROUND ARMS SO HANDS NEVER GO UNDER NOTEPADS!) -->
        <g id="layerDeskProps" opacity="1">
          <!-- Dex's Matte Black "SHIP" Mug (Outer Left Wing) -->
          <g id="dex-mug-desk" transform="translate(204, 464)">
            <path d="M -20 -15 C -29 -15, -29 13, -20 13" stroke="#3f3f46" stroke-width="5" fill="none" />
            <rect x="-20" y="-21" width="40" height="40" rx="5" fill="#090d16" stroke="#52525b" stroke-width="2.2" />
            <ellipse cx="0" cy="-21" rx="20" ry="5" fill="#27272a" stroke="#52525b" stroke-width="1.6" />
            <text x="0" y="6" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="11" fill="#f8fafc">SHIP</text>
          </g>

          <!-- Dex's Desk Tablet Dock -->
          <g id="dex-tablet-desk" transform="translate(262, 479)">
            <polygon points="-22,0 14,-4 20,11 -16,14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.6" />
            <line x1="-12" y1="4" x2="8" y2="2" stroke="#34d399" stroke-width="2" />
          </g>

          <!-- Dex's Notepad & Stylus (Cleanly centered between resting hands!) -->
          <g id="dex-pad-desk" transform="translate(358, 478)">
            <polygon points="-19,-4 17,-6 21,9 -15,11" fill="#f8fafc" stroke="#64748b" stroke-width="1.4" />
            <line x1="-11" y1="2" x2="9" y2="1" stroke="#94a3b8" stroke-width="1.6" />
          </g>
          <g id="dex-pen-desk" transform="translate(392, 479)">
            <line x1="-9" y1="3" x2="9" y2="-3" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" />
          </g>

          <!-- Theo's "NO HYPE" Ceramic Mug (Outer Right Wing, Two Stacked Lines Fitting Comfortably Inside 40px!) -->
          <g id="theo-mug-desk" transform="translate(1076, 464)">
            <path d="M 20 -15 C 29 -15, 29 13, 20 13" stroke="#e0f2fe" stroke-width="5" fill="none" />
            <rect x="-20" y="-21" width="40" height="40" rx="5" fill="#0284c7" stroke="#090d16" stroke-width="2.2" />
            <ellipse cx="0" cy="-21" rx="20" ry="5" fill="#7dd3fc" stroke="#090d16" stroke-width="1.6" />
            <text x="0" y="-1" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="9" fill="#ffffff">NO</text>
            <text x="0" y="10" text-anchor="middle" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="8.5" fill="#e0f2fe">HYPE</text>
          </g>

          <!-- Theo's Desk Tablet -->
          <g id="theo-tablet-desk" transform="translate(1018, 479)">
            <polygon points="-14,-4 22,0 16,14 -20,11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.6" />
            <line x1="-8" y1="2" x2="12" y2="4" stroke="#38bdf8" stroke-width="2" />
          </g>

          <!-- Theo's Notepad & Stylus (Cleanly centered between resting hands!) -->
          <g id="theo-pad-desk" transform="translate(905, 478)">
            <polygon points="-17,-6 19,-4 15,11 -21,9" fill="#f8fafc" stroke="#64748b" stroke-width="1.4" />
            <line x1="-9" y1="1" x2="11" y2="2" stroke="#94a3b8" stroke-width="1.6" />
          </g>
          <g id="theo-pen-desk" transform="translate(936, 479)">
            <line x1="-9" y1="-3" x2="9" y2="3" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" />
          </g>

          <!-- Center Stack of Research Papers -->
          <g transform="translate(640, 476)">
            <polygon points="-52,-4 48,-8 56,9 -46,12" fill="#e2e8f0" stroke="#475569" stroke-width="1.6" />
            <polygon points="-48,-9 52,-5 46,11 -54,7" fill="#ffffff" stroke="#64748b" stroke-width="1.6" />
            <line x1="-30" y1="-2" x2="26" y2="-1" stroke="#94a3b8" stroke-width="2" />
            <line x1="-26" y1="4" x2="20" y2="5" stroke="#94a3b8" stroke-width="2" />
          </g>
        </g>

        <!-- 5. FOREGROUND ARTICULATED CUTOUT ARMS & ATTACHED HANDS -->
        <g id="layerForegroundArms" opacity="1">
          <!-- DEX LEFT ARM (Matte-Black Bomber Sleeve; cuff encloses wrist socket at y=33..44) -->
          <g id="dex-shoulder-L" transform="translate(300, 408) rotate(22)">
            <circle cx="0" cy="0" r="18" fill="#14161d" stroke="#090d16" stroke-width="2.4" />
            <path d="M -18 0 L 18 0 L 16.5 48 A 16.5 16.5 0 0 1 -16.5 48 Z" fill="#14161d" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
            <rect x="-16" y="-2" width="32" height="8" fill="#14161d" />
            <g id="dex-elbow-L" transform="translate(0, 48) rotate(-62)">
              <circle cx="0" cy="0" r="15.5" fill="#1a1d26" stroke="#090d16" stroke-width="2.4" />
              <path d="M -15.5 0 L 15.5 0 L 14 42 A 13 6 0 0 1 -14 42 Z" fill="#1a1d26" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
              <rect x="-13.5" y="-2" width="27" height="8" fill="#1a1d26" />
              <path d="M -9 3 Q 0 8 9 3" stroke="#090d16" stroke-width="2" fill="none" stroke-linecap="round" />
              <ellipse cx="0" cy="39" rx="11" ry="4" fill="#090d16" />
              <g id="dex-wrist-L" transform="translate(0, 42) rotate(20)">
                <g id="dex-hand-L" transform="scale(1.36)"></g>
              </g>
              <path d="M -14.5 33 Q 0 38 14.5 33 L 14 43 Q 0 47 -14 43 Z" fill="#27272a" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />
            </g>
          </g>

          <!-- DEX RIGHT ARM (Matte-Black Bomber Sleeve) -->
          <g id="dex-shoulder-R" transform="translate(430, 408) rotate(-22)">
            <circle cx="0" cy="0" r="18" fill="#14161d" stroke="#090d16" stroke-width="2.4" />
            <path d="M -18 0 L 18 0 L 16.5 48 A 16.5 16.5 0 0 1 -16.5 48 Z" fill="#14161d" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
            <rect x="-16" y="-2" width="32" height="8" fill="#14161d" />
            <g id="dex-elbow-R" transform="translate(0, 48) rotate(62)">
              <circle cx="0" cy="0" r="15.5" fill="#1a1d26" stroke="#090d16" stroke-width="2.4" />
              <path d="M -15.5 0 L 15.5 0 L 14 42 A 13 6 0 0 1 -14 42 Z" fill="#1a1d26" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
              <rect x="-13.5" y="-2" width="27" height="8" fill="#1a1d26" />
              <path d="M -9 3 Q 0 8 9 3" stroke="#090d16" stroke-width="2" fill="none" stroke-linecap="round" />
              <ellipse cx="0" cy="39" rx="11" ry="4" fill="#090d16" />
              <g id="dex-wrist-R" transform="translate(0, 42) rotate(-20)">
                <g id="dex-hand-R" transform="scale(1.36)"></g>
              </g>
              <path d="M -14.5 33 Q 0 38 14.5 33 L 14 43 Q 0 47 -14 43 Z" fill="#27272a" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />
            </g>
          </g>

          <!-- THEO LEFT ARM (Tailored Navy Blazer Sleeve + Silver Smartwatch Flush Above Cuff) -->
          <g id="theo-shoulder-L" transform="translate(855, 410) rotate(22)">
            <circle cx="0" cy="0" r="17.5" fill="#1e293b" stroke="#090d16" stroke-width="2.4" />
            <path d="M -17.5 0 L 17.5 0 L 16 47 A 16 16 0 0 1 -16 47 Z" fill="#1e293b" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
            <rect x="-15.5" y="-2" width="31" height="8" fill="#1e293b" />
            <g id="theo-elbow-L" transform="translate(0, 47) rotate(-62)">
              <circle cx="0" cy="0" r="15" fill="#273449" stroke="#090d16" stroke-width="2.4" />
              <path d="M -15 0 L 15 0 L 13.5 41 A 12.5 6 0 0 1 -13.5 41 Z" fill="#273449" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
              <rect x="-13" y="-2" width="26" height="8" fill="#273449" />
              <path d="M -9 3 Q 0 8 9 3" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round" />
              <ellipse cx="0" cy="38" rx="10.5" ry="4" fill="#090d16" />
              <g id="theo-wrist-L" transform="translate(0, 41) rotate(20)">
                <g id="theo-hand-L" transform="scale(1.36)"></g>
              </g>
              <!-- Clean Blazer Cuff Overlapping Wrist Base + Silver Smartwatch Flush Across Sleeve -->
              <path d="M -14 33 Q 0 38 14 33 L 13.5 43 Q 0 47 -13.5 43 Z" fill="#1e293b" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />
              <rect x="-14.5" y="25" width="29" height="6" rx="2" fill="#e2e8f0" stroke="#475569" stroke-width="1.2" />
              <rect x="-5" y="25.5" width="10" height="5" rx="1" fill="#090d16" />
              <circle cx="-8" cy="38.5" r="1.8" fill="#64748b" />
            </g>
          </g>

          <!-- THEO RIGHT ARM (Tailored Navy Blazer Sleeve) -->
          <g id="theo-shoulder-R" transform="translate(975, 410) rotate(-22)">
            <circle cx="0" cy="0" r="17.5" fill="#1e293b" stroke="#090d16" stroke-width="2.4" />
            <path d="M -17.5 0 L 17.5 0 L 16 47 A 16 16 0 0 1 -16 47 Z" fill="#1e293b" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
            <rect x="-15.5" y="-2" width="31" height="8" fill="#1e293b" />
            <g id="theo-elbow-R" transform="translate(0, 47) rotate(62)">
              <circle cx="0" cy="0" r="15" fill="#273449" stroke="#090d16" stroke-width="2.4" />
              <path d="M -15 0 L 15 0 L 13.5 41 A 12.5 6 0 0 1 -13.5 41 Z" fill="#273449" stroke="#090d16" stroke-width="2.4" stroke-linejoin="round" />
              <rect x="-13" y="-2" width="26" height="8" fill="#273449" />
              <path d="M -9 3 Q 0 8 9 3" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round" />
              <ellipse cx="0" cy="38" rx="10.5" ry="4" fill="#090d16" />
              <g id="theo-wrist-R" transform="translate(0, 41) rotate(-20)">
                <g id="theo-hand-R" transform="scale(1.36)"></g>
              </g>
              <path d="M -14 33 Q 0 38 14 33 L 13.5 43 Q 0 47 -13.5 43 Z" fill="#1e293b" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />
              <circle cx="8" cy="38.5" r="1.8" fill="#64748b" />
            </g>
          </g>
        </g>

        <!-- 6. GOOSENECK DESK MICROPHONES (Center inner edge, clear of hand zones) -->
        <g id="layerDeskMics" opacity="1">
          <g transform="translate(502, 476)">
            <ellipse cx="0" cy="6" rx="18" ry="6" fill="#090d16" stroke="#475569" stroke-width="1.6" />
            <path d="M 0 5 L -9 -38 L -24 -50" stroke="#334155" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <ellipse cx="-28" cy="-54" rx="12" ry="15" transform="rotate(-30 -28 -54)" fill="#1e293b" stroke="#090d16" stroke-width="2.2" />
            <rect x="-38" y="-50" width="20" height="11" rx="2.5" transform="rotate(-30 -28 -44)" fill="#f59e0b" />
            <text x="-28" y="-42" text-anchor="middle" transform="rotate(-30 -28 -44)" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="6.5" fill="#090d16">RADAR</text>
          </g>
          <g transform="translate(778, 476)">
            <ellipse cx="0" cy="6" rx="18" ry="6" fill="#090d16" stroke="#475569" stroke-width="1.6" />
            <path d="M 0 5 L 9 -38 L 24 -50" stroke="#334155" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <ellipse cx="28" cy="-54" rx="12" ry="15" transform="rotate(30 28 -54)" fill="#1e293b" stroke="#090d16" stroke-width="2.2" />
            <rect x="18" y="-50" width="20" height="11" rx="2.5" transform="rotate(30 28 -44)" fill="#0284c7" />
            <text x="28" y="-42" text-anchor="middle" transform="rotate(30 28 -44)" font-family="Public Sans, system-ui, sans-serif" font-weight="800" font-size="6.5" fill="#ffffff">RADAR</text>
          </g>
        </g>
      </g>
    </svg>
  `;
}

// =========================================================================
// 5. PIXELANCHOR CONTROLLER (API COMPATIBLE + 60-FPS CUTOUT STUDIO STAGE)
// =========================================================================
export class PixelAnchor {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = "idle";
    this.base = "idle";
    this.work = null;
    this.hail = false;
    this.ping = null;
    this.speaker = 0; // 0 = Theo ("Theo Sweep"), 1 = Dex ("Dex Ping")
    this.scene = { code: 1, sector: -1, count: 0, blips: [] };
    this.habitBags = { 0: [], 1: [], duo: [], listen0: [], listen1: [] };
    this.lastHabit = { 0: null, 1: null, duo: null, listen0: null, listen1: null };
    this.reducedMotion = matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const now = performance.now();
    this.tick = 0;
    this._last = now;
    this.sweep = 0;
    this.lastWordAt = 0;
    this.wordDurationMs = 260;
    this.visemeSeq = ["neutral"];
    this.words = 0;
    this.lastSpeakerGestureAt = 0;
    this.nextSpeakerMoveAt = 0;
    this.topicKey = "";
    this.deskShakeY = 0;
    this._easterState = "";
    this._lastSweepAt = 0;

    this.rig = {
      0: this.createRigState("theo", now),
      1: this.createRigState("dex", now),
    };

    this.mountSvgStage();
    this.onScreen = true;
    if (typeof IntersectionObserver !== "undefined" && canvas?.closest) {
      new IntersectionObserver(([entry]) => { this.onScreen = entry.isIntersecting; }).observe(canvas.closest(".monitor") || canvas);
    }
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  createRigState(id, now) {
    return {
      id,
      hopY: 0,
      waist: 0,
      neck: 0,
      neckY: 0,
      shL: 22,
      elL: -62,
      wrL: 20,
      shR: -22,
      elR: 62,
      wrR: -20,
      hL: "deskRest",
      hR: "deskRest",
      move: MOVEMENTS_DB[0],
      facs: FACIAL_EXPRESSIONS_DB.find((e) => e.family === "vitality") || FACIAL_EXPRESSIONS_DB[0],
      moveUntil: 0,
      exprUntil: 0,
      activeProp: null,
      nodUntil: 0,
      gazeX: 0,
      gazeY: 0,
      nextBlinkAt: now + 1200 + Math.random() * 2000,
      blinkDuration: 165,
      blinkUntil: 0,
      blinkOpenness: 1,
      nextListenActionAt: now + 2600 + Math.random() * 2200,
      nextIdleActionAt: now + 2400 + Math.random() * 2600,
    };
  }

  mountSvgStage() {
    const parent = this.canvas?.parentElement;
    if (!parent || typeof parent.insertAdjacentHTML !== "function") {
      this.svgMounted = false;
      return;
    }
    this.canvas.style.opacity = "0";
    this.canvas.setAttribute("aria-hidden", "true");
    const existing = parent.querySelector("#broadcastSvg");
    if (existing) existing.remove();
    const markup = buildStudioSvgMarkup().trim();
    if (typeof DOMParser !== "undefined" && typeof parent.prepend === "function" && typeof parent.ownerDocument?.importNode === "function") {
      const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
      const svgNode = parsed?.documentElement;
      if (svgNode && svgNode.nodeName === "svg") {
        parent.prepend(parent.ownerDocument.importNode(svgNode, true));
      } else {
        parent.insertAdjacentHTML("afterbegin", markup);
      }
    } else {
      parent.insertAdjacentHTML("afterbegin", markup);
    }
    const svg = parent.querySelector("#broadcastSvg");
    if (!svg) {
      this.svgMounted = false;
      return;
    }
    const q = (id) => svg.querySelector(`#${id}`);
    this.actors = {
      0: {
        id: "theo",
        seatX: 915, seatY: 505, skinFill: "#ffedd5", skinStroke: "#d97706",
        shoulderOffsetL: { x: -60, y: -95 }, shoulderOffsetR: { x: 60, y: -95 },
        elbowLen: 47, wristLen: 41, neckBaseY: -122,
        waist: q("theo-waist"), neck: q("theo-neck"),
        shoulderL: q("theo-shoulder-L"), elbowL: q("theo-elbow-L"), wristL: q("theo-wrist-L"), handL: q("theo-hand-L"),
        shoulderR: q("theo-shoulder-R"), elbowR: q("theo-elbow-R"), wristR: q("theo-wrist-R"), handR: q("theo-hand-R"),
        mouth: q("theo-mouth"), pupilL: q("theo-pupil-L"), pupilR: q("theo-pupil-R"),
        glintL: q("theo-glint-L"), glintR: q("theo-glint-R"),
        lidTop: q("theo-lid-top"), lidBot: q("theo-lid-bot"),
        lashTop: q("theo-lash-top"), lashBot: q("theo-lash-bot"),
        browL: q("theo-brow-L"), browR: q("theo-brow-R"),
        deskProps: { mug: q("theo-mug-desk"), pen: q("theo-pen-desk"), pad: q("theo-pad-desk"), tablet: q("theo-tablet-desk") },
        cache: {},
      },
      1: {
        id: "dex",
        seatX: 365, seatY: 505, skinFill: "#fde68a", skinStroke: "#d97706",
        shoulderOffsetL: { x: -65, y: -97 }, shoulderOffsetR: { x: 65, y: -97 },
        elbowLen: 48, wristLen: 42, neckBaseY: -124,
        waist: q("dex-waist"), neck: q("dex-neck"),
        shoulderL: q("dex-shoulder-L"), elbowL: q("dex-elbow-L"), wristL: q("dex-wrist-L"), handL: q("dex-hand-L"),
        shoulderR: q("dex-shoulder-R"), elbowR: q("dex-elbow-R"), wristR: q("dex-wrist-R"), handR: q("dex-hand-R"),
        mouth: q("dex-mouth"), pupilL: q("dex-pupil-L"), pupilR: q("dex-pupil-R"),
        glintL: q("dex-glint-L"), glintR: q("dex-glint-R"),
        lidTop: q("dex-lid-top"), lidBot: q("dex-lid-bot"),
        lashTop: q("dex-lash-top"), lashBot: q("dex-lash-bot"),
        browL: q("dex-brow-L"), browR: q("dex-brow-R"),
        deskProps: { mug: q("dex-mug-desk"), pen: q("dex-pen-desk"), pad: q("dex-pad-desk"), tablet: q("dex-tablet-desk") },
        cache: {},
      },
    };
    this.dom = {
      onAirSignBg: q("onAirSignBg"),
      onAirSignDot: q("onAirSignDot"),
      onAirSignText: q("onAirSignText"),
      channelSignSub: q("channelSignSub"),
      miniRadarSweep: q("miniRadarSweep"),
      monitorBadgeBg: q("monitorBadgeBg"),
      monitorBadgeText: q("monitorBadgeText"),
      monitorTitleText: q("monitorTitleText"),
      monitorArtwork: q("monitorArtwork"),
      layerDeskProps: q("layerDeskProps"),
      easterScreenBorder: q("easterScreenBorder"),
      easterScreenLed: q("easterScreenLed"),
      easterScreenLine1: q("easterScreenLine1"),
      easterScreenLine2: q("easterScreenLine2"),
    };
    this.svgMounted = true;
    this.renderActorFromRig(0, performance.now());
    this.renderActorFromRig(1, performance.now());
    this.syncMonitorAndSigns();
  }

  /**
   * Draw the next habit from a Fisher-Yates shuffle bag so animations never repeat
   * consecutively or loop predictably over a 10-minute session.
   */
  nextHabit(slot = 0) {
    const source = slot === "duo" ? DUO_HABITS
      : slot === "listen0" ? THEO_LISTEN_HABITS
      : slot === "listen1" ? DEX_LISTEN_HABITS
      : slot === 0 ? THEO_HABITS : DEX_HABITS;
    let bag = this.habitBags[slot];
    if (!bag || !bag.length) {
      bag = [...source];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === this.lastHabit[slot]) {
        [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
      }
      this.habitBags[slot] = bag;
    }
    const picked = bag.pop();
    this.lastHabit[slot] = picked;
    return picked;
  }

  /**
   * 4-Phase Physical Object Permanence Choreography helper:
   * Empty hand reaches to desk (u < 0.24), holds prop in active pose (0.24..0.88),
   * and returns object back to desk before resting (u >= 0.88).
   */
  resolvePropChoreography(f, handSlot, propKey, deskKey, activePos, u, restPos = [82, 135]) {
    const deskHome = [65, 136];
    if (u < 0.24) return { pos: deskHome, prop: null };
    if (u < 0.88) return { pos: activePos, prop: propKey };
    return { pos: restPos, prop: null };
  }

  get names() {
    return ["Theo", "Dex"];
  }

  get mode() {
    return modeOf(this.base, this.work);
  }

  setSpeaker(index) {
    this.speaker = index % 2;
  }

  setState(state) {
    this.state = state;
    if (this.canvas?.dataset) this.canvas.dataset.state = state;
    if (state !== "talking") {
      this.setMoveTarget(0, "groundedRest", 800);
      this.setMoveTarget(1, "groundedRest", 800);
    }
  }

  setMode(mode) {
    this.base = STUDIO_MODES[mode] ? mode : "idle";
    if (this.canvas?.dataset) this.canvas.dataset.mode = this.mode;
    this.syncMonitorAndSigns();
  }

  setWork(kind, { ping = false } = {}) {
    const now = performance.now();
    this.work = kind && WORK_MODE[kind] ? kind : null;
    if (this.work && ping && (!this.ping || this.ping.doneAt)) {
      this.ping = { at: now, angle: 3.6, doneAt: 0 };
      this.setMoveTarget(0, "inspectTablet", 2200, now);
      this.setMoveTarget(1, "inspectTablet", 2200, now);
    } else if (!this.work && this.ping && !this.ping.doneAt) {
      this.ping.doneAt = now;
    }
    if (this.canvas?.dataset) this.canvas.dataset.mode = this.mode;
    this.syncMonitorAndSigns();
  }

  setHail(open) {
    this.hail = Boolean(open);
    if (open) {
      this.setExpression(1, "listening", 2500);
    }
    this.syncMonitorAndSigns();
  }

  setScene({ code = 1, sector = -1, count = 0, blips = [] } = {}) {
    this.scene = { code, sector, count, blips: blips.slice(0, 48) };
    this.syncMonitorAndSigns();
  }

  setExpression(index, name, ms = 2200) {
    const r = this.rig[index];
    if (!r) return;
    const match = FACIAL_EXPRESSIONS_DB.find((e) => e.name === name || e.family === name)
      || (name === "alert" || name === "narrowed" ? FACIAL_EXPRESSIONS_DB.find((e) => e.family === "security")
      : name === "breaking" ? FACIAL_EXPRESSIONS_DB.find((e) => e.family === "excitement")
      : name === "happy" ? FACIAL_EXPRESSIONS_DB.find((e) => e.family === "warmth")
      : FACIAL_EXPRESSIONS_DB.find((e) => e.family === "listening"))
      || FACIAL_EXPRESSIONS_DB[0];
    r.facs = match;
    r.exprUntil = performance.now() + ms;
  }

  setMoveTarget(index, moveOrTemplateName, ms = 2000, now = performance.now()) {
    const r = this.rig[index];
    if (!r) return;
    const moveObj = MOVEMENTS_DB.find((m) => m.name === moveOrTemplateName)
      || (MOVE_TEMPLATES[moveOrTemplateName] ? { id: 0, name: moveOrTemplateName, category: "direct", ...MOVE_TEMPLATES[moveOrTemplateName] } : null)
      || MOVEMENTS_DB[0];
    r.move = moveObj;
    r.moveUntil = now + ms;
    r.activeProp = moveObj.prop || null;
  }

  applyHabitPose(index, habitName, ms = 3200, now = performance.now()) {
    const map = {
      espresso: "sipMug",
      sip: "sipMug",
      write: "writeNotes",
      tap_pen: "writeNotes",
      flip_page: "checkNotepad",
      check_slate: "inspectTablet",
      tablet: "inspectTablet",
      check_watch: "checkNotepad",
      chin_rest: "chinThink",
      headset: "chinThink",
      tuck_hair: "chinThink",
      glasses: "chinThink",
      tune_crt: "pointScreenUp",
      tune_eq: "typeKeyboard",
      type_note: "typeKeyboard",
      trace_scope: "pointScreenUp",
      pet_cat: "groundedRest",
      stretch: "openExplainBoth",
    };
    const tpl = map[habitName] || "groundedRest";
    this.setMoveTarget(index, tpl, ms, now);
  }

  triggerDuo(kind) {
    const now = performance.now();
    if (kind === "duo_toast") {
      this.setMoveTarget(0, "sipMug", 3000, now);
      this.setMoveTarget(1, "sipMug", 3000, now);
      this.setExpression(0, "warmth", 3000);
      this.setExpression(1, "warmth", 3000);
    } else if (kind === "duo_scope") {
      this.setMoveTarget(0, "pointScreenUp", 2600, now);
      this.setMoveTarget(1, "pointScreenUp", 2600, now);
      this.setExpression(0, "analytical", 2600);
      this.setExpression(1, "analytical", 2600);
    } else if (kind === "duo_glance") {
      this.setExpression(0, "banter", 2200);
      this.setExpression(1, "banter", 2200);
      this.rig[0].nodUntil = now + 360;
      this.rig[1].nodUntil = now + 360;
    } else {
      this.setMoveTarget(0, "openExplainInner", 2800, now);
      this.setMoveTarget(1, "openExplainInner", 2800, now);
    }
  }

  react(kind) {
    const now = performance.now();
    const spk = this.speaker;
    const lst = 1 - spk;
    if (kind === "handoff") {
      this.setMoveTarget(spk, "openExplainInner", 1800, now);
      this.setExpression(spk, "warmth", 2000);
      this.setExpression(lst, "listening", 2000);
      this.rig[spk].nodUntil = now + 350;
      this.rig[lst].nodUntil = now + 450;
    } else if (kind === "breaking") {
      this.setMoveTarget(spk, "firmFistDesk", 1800, now);
      this.setExpression(0, "breaking", 2200);
      this.setExpression(1, "breaking", 2200);
      this.deskShakeY = -4;
    } else if (kind === "fact") {
      if (now < this.rig[spk].moveUntil && this.rig[spk].move.name !== "groundedRest") return;
      this.setMoveTarget(spk, spk === 0 ? "countTwoInner" : "pointInner", 1900, now);
      this.setExpression(spk, "analytical", 2000);
    } else if (kind === "skeptical") {
      this.setExpression(spk, "skeptical", 2400);
      this.setExpression(lst, "skeptical", 2400);
    } else if (kind === "nod") {
      this.rig[spk].nodUntil = now + 350;
    }
  }

  /**
   * Timed Phoneme Lip-Sync + Calm Semantic Choreography.
   */
  word(length = 4, spokenWord = "") {
    const now = performance.now();
    const spk = this.speaker;
    const lst = 1 - spk;
    const prevWordAt = this.lastWordAt;

    this.lastWordAt = now;
    this.words++;
    this.visemeSeq = visemesForWord(spokenWord);

    const measuredGap = prevWordAt ? now - prevWordAt : 260;
    const estimated = Math.max(130, Math.min(760, (length + 0.5) * 62));
    this.wordDurationMs = measuredGap > 90 && measuredGap < 900 ? lerp(estimated, measuredGap, 0.45) : estimated;

    const clean = String(spokenWord || "").toLowerCase();
    const seed = this.words * 7 + length * 3 + spk;
    const pickFrom = (cat, fam) => {
      const mList = MOVEMENTS_DB.filter((m) => m.category === cat);
      const eList = FACIAL_EXPRESSIONS_DB.filter((e) => e.family === fam);
      return {
        move: mList[seed % mList.length] || MOVEMENTS_DB[0],
        expr: eList[seed % eList.length] || FACIAL_EXPRESSIONS_DB[0],
      };
    };

    if (/\b(theo|dex|thanks|thank|agreed|you|your)\b/i.test(clean)) {
      this.setExpression(spk, "warmth", 1900);
      this.setExpression(lst, "warmth", 1900);
      this.rig[lst].nodUntil = now + 340;
    } else if (/(\d+%?|\$|benchmark|score|accuracy|tokens|latency|million|billion|trillion)/i.test(clean)) {
      this.setExpression(spk, "analytical", 1900);
    } else if (/\b(cve|security|risk|warning|bug|crash|attack|patch|critical|hold|wait)\b/i.test(clean)) {
      this.setExpression(spk, "security", 2100);
      this.setExpression(lst, "skeptical", 2100);
    } else if (/\b(open|future|agi|mars|amazing|breakthrough|live|launch|wild)\b/i.test(clean)) {
      this.setExpression(spk, "excitement", 1800);
    }

    if (now < this.rig[spk].moveUntil || now - this.lastSpeakerGestureAt < 2100) return;

    let chosen = null;
    if (/\b(theo|dex|thanks|you)\b/i.test(clean)) chosen = pickFrom("partner", "warmth");
    else if (/(\d+%?|benchmark|score|tokens|latency|two|three|first|second)/i.test(clean)) chosen = pickFrom("metrics", "analytical");
    else if (/\b(cve|security|risk|warning|patch|critical)\b/i.test(clean)) chosen = pickFrom("security", "security");
    else if (/\b(github|repo|cli|code|mcp|agent|radar|scan)\b/i.test(clean)) chosen = pickFrom("hardware", "technical");
    else if (/\b(open|future|agi|mars|scale|world|builders|community)\b/i.test(clean)) chosen = pickFrom("rhetorical", "excitement");
    else if (this.words >= this.nextSpeakerMoveAt) {
      this.nextSpeakerMoveAt = this.words + 9 + Math.floor(Math.random() * 6);
      chosen = pickFrom("beats", "vitality");
    }

    if (chosen) {
      this.lastSpeakerGestureAt = now;
      this.rig[spk].move = chosen.move;
      this.rig[spk].moveUntil = now + 1850;
      this.rig[spk].activeProp = chosen.move.prop || null;
      this.rig[spk].facs = chosen.expr;
      this.rig[spk].exprUntil = now + 2000;
    }
  }

  syncMonitorAndSigns() {
    if (!this.svgMounted || !this.dom) return;
    const modeInfo = STUDIO_MODES[this.mode] || STUDIO_MODES.idle;
    this.dom.onAirSignBg?.setAttribute("fill", this.mode === "idle" ? "#334155" : modeInfo.color);
    this.dom.onAirSignDot?.setAttribute("fill", this.mode === "idle" ? "#94a3b8" : (modeInfo.textColor || "#ffffff"));
    if (this.dom.onAirSignText) {
      this.dom.onAirSignText.textContent = modeInfo.label;
      this.dom.onAirSignText.setAttribute("fill", this.mode === "idle" ? "#ffffff" : (modeInfo.textColor || "#ffffff"));
    }

    const chCode = String(this.scene.code || 1).padStart(2, "0");
    const liveCount = String(Math.min(999, this.scene.count || 0));
    if (this.dom.channelSignSub) {
      this.dom.channelSignSub.textContent = this.hail ? "PING OPEN" : `CH ${chCode} • ${liveCount} LIVE`;
    }

    const chMeta = CHANNEL_TO_MONITOR[this.scene.code] || CHANNEL_TO_MONITOR[1];
    let targetKey = chMeta.key;
    let targetTitle = chMeta.title;
    if (this.work === "verifying") {
      targetKey = "VIDEO";
      targetTitle = "VERIFYING CLAIM";
    } else if (this.work === "mcp" || this.work === "find") {
      targetKey = "AGENTS";
      targetTitle = "MCP SERVER SEARCH";
    } else if (this.work === "repo") {
      targetKey = "OPEN_SOURCE";
      targetTitle = "GITHUB REPO GUIDE";
    } else if (this.work === "writing") {
      targetKey = "REASONING";
      targetTitle = "WRITING ON-AIR SCRIPT";
    }

    this.dom.monitorBadgeBg?.setAttribute("fill", modeInfo.color);
    if (this.dom.monitorBadgeText) {
      this.dom.monitorBadgeText.textContent = modeInfo.label;
      this.dom.monitorBadgeText.setAttribute("fill", modeInfo.textColor || "#ffffff");
    }
    if (this.dom.monitorTitleText) this.dom.monitorTitleText.textContent = targetTitle;

    if (this.topicKey !== targetKey && this.dom.monitorArtwork) {
      this.topicKey = targetKey;
      this.dom.monitorArtwork.innerHTML = MONITOR_TOPICS[targetKey] || MONITOR_TOPICS.AGENTS;
    }
  }

  /** Mirror symmetric template arm coordinates cleanly so Left (Dex) and Right (Theo) mirror properly. */
  resolveTargetAnglesForActor(index, move, talking, now) {
    const isTheo = index === 0;
    const dir = isTheo ? -1 : 1;

    if (now > this.rig[index].moveUntil && !talking && !this.rig[index].activeProp) {
      move = MOVE_TEMPLATES.groundedRest;
    }

    const sway = Math.sin(now / 750 + index * 1.7) * 1.4;
    const shL = move.shL + (talking ? sway : 0);
    const elL = move.elL + (talking ? sway * 0.7 : 0);
    const wrL = move.wrL;
    const shR = move.shR - (talking ? sway : 0);
    const elR = move.elR - (talking ? sway * 0.7 : 0);
    const wrR = move.wrR;

    const nodOffset = now < this.rig[index].nodUntil ? 4 : 0;

    return {
      hopY: talking ? Math.sin(now / 320 + index) * 1.2 : 0,
      waist: (move.waist || 0) * dir,
      neck: (move.neck || 0) * dir + nodOffset * 0.6,
      neckY: nodOffset * 0.4,
      shL: isTheo ? -shR : shL,
      elL: isTheo ? -elR : elL,
      wrL: isTheo ? -wrR : wrL,
      hL: isTheo ? move.hR : move.hL,
      shR: isTheo ? -shL : shR,
      elR: isTheo ? -elL : elR,
      wrR: isTheo ? -wrL : wrR,
      hR: isTheo ? move.hL : move.hR,
      gazeX: (move.gazeP || 0) * dir * 4.2,
    };
  }

  updateRig(index, now, dt) {
    const r = this.rig[index];
    const isSpeaker = this.state === "talking" && this.speaker === index;
    const someoneTalking = this.state === "talking";
    const partnerDir = index === 0 ? -1 : 1;

    // 1. 5-Stage Eyelid Blinking + Occasional Double Blinks
    if (now > r.nextBlinkAt) {
      const dbl = Math.random() < 0.22;
      r.blinkDuration = dbl ? 270 : 155;
      r.blinkUntil = now + r.blinkDuration;
      r.nextBlinkAt = now + 2200 + Math.random() * 3200;
    }
    const rem = r.blinkUntil - now;
    if (rem > 0 && rem <= r.blinkDuration) {
      const u = 1 - rem / r.blinkDuration;
      r.blinkOpenness = u < 0.38 ? 1 - (u / 0.38) : (u - 0.38) / 0.62;
    } else {
      r.blinkOpenness = 1;
    }

    // 2. Listener Co-Anchor Behavior
    if (someoneTalking && !isSpeaker) {
      if (!this.reducedMotion && now > r.nextListenActionAt && now > r.moveUntil) {
        const habit = this.nextHabit(index === 0 ? "listen0" : "listen1");
        const ms = HABIT_MS[habit] || 3200;
        this.applyHabitPose(index, habit, ms, now);
        this.setExpression(index, habit === "write" || habit === "tap_pen" || habit === "tablet" || habit === "check_slate" ? "technical" : "listening", ms);
        r.nextListenActionAt = now + ms + 3200 + Math.random() * 3800;
      }
      if (Math.random() < 0.9 * dt) r.nodUntil = now + 320;
    }

    // 3. Idle Studio Habits when nobody is speaking
    if (!someoneTalking && !this.reducedMotion && now > r.nextIdleActionAt && now > r.moveUntil) {
      const habit = this.nextHabit(index);
      const ms = HABIT_MS[habit] || 3200;
      this.applyHabitPose(index, habit, ms, now);
      r.nextIdleActionAt = now + ms + 4200 + Math.random() * 4800;
    }

    if (now > r.exprUntil) {
      r.facs = FACIAL_EXPRESSIONS_DB.find((e) => e.family === (someoneTalking && !isSpeaker ? "listening" : "vitality")) || FACIAL_EXPRESSIONS_DB[0];
    }
    if (now > r.moveUntil) {
      r.activeProp = null;
    }

    // 4. dt-normalized exponential smoothing for buttery-smooth 60-FPS / 120-FPS kinematics
    const tgt = this.resolveTargetAnglesForActor(index, r.move, isSpeaker, now);
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-10 * dt);
    r.hopY = lerp(r.hopY, tgt.hopY, k);
    r.waist = lerp(r.waist, tgt.waist, k);
    r.neck = lerp(r.neck, tgt.neck, k);
    r.neckY = lerp(r.neckY, tgt.neckY, k);
    r.shL = lerp(r.shL, tgt.shL, k);
    r.elL = lerp(r.elL, tgt.elL, k);
    r.wrL = lerp(r.wrL, tgt.wrL, k);
    r.shR = lerp(r.shR, tgt.shR, k);
    r.elR = lerp(r.elR, tgt.elR, k);
    r.wrR = lerp(r.wrR, tgt.wrR, k);
    r.hL = tgt.hL;
    r.hR = tgt.hR;

    // 5. Mutual Eye Contact & Saccades
    const baseGazeX = !someoneTalking ? (Math.sin(now / 1900 + index * 2) > 0.35 ? partnerDir * 3.5 : 0)
      : isSpeaker ? (Math.abs(tgt.gazeX) > 1 ? tgt.gazeX : (Math.sin(now / 1500) > 0.2 ? partnerDir * 3.8 : 0))
      : partnerDir * 4.4;
    const baseGazeY = r.activeProp === "pen" || r.activeProp === "tablet" || r.activeProp === "pad" ? 5.5 : (r.facs.gazeBiasY || 0);
    const gk = this.reducedMotion ? 1 : 1 - Math.exp(-14 * dt);
    r.gazeX = lerp(r.gazeX, baseGazeX, gk);
    r.gazeY = lerp(r.gazeY, baseGazeY, gk);
  }

  /** Helper that writes an SVG attribute only when it actually changed to save DOM overhead at 60 FPS. */
  setAttrCached(actor, key, el, attr, val) {
    if (!el) return;
    if (actor.cache[key] === val) return;
    actor.cache[key] = val;
    el.setAttribute(attr, val);
  }

  renderActorFromRig(index, now) {
    const actor = this.actors?.[index];
    const r = this.rig[index];
    if (!actor || !actor.waist) return;

    this.setAttrCached(actor, "waist", actor.waist, "transform", `translate(0, ${r.hopY.toFixed(1)}) rotate(${r.waist.toFixed(1)})`);
    this.setAttrCached(actor, "neck", actor.neck, "transform", `translate(0, ${(actor.neckBaseY + r.neckY).toFixed(1)}) rotate(${r.neck.toFixed(1)})`);

    const rad = (r.waist * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const lx = actor.shoulderOffsetL.x, ly = actor.shoulderOffsetL.y;
    const rx = actor.shoulderOffsetR.x, ry = actor.shoulderOffsetR.y;
    const worldLX = actor.seatX + (lx * cosA - ly * sinA);
    const worldLY = actor.seatY + r.hopY + (lx * sinA + ly * cosA);
    const worldRX = actor.seatX + (rx * cosA - ry * sinA);
    const worldRY = actor.seatY + r.hopY + (rx * sinA + ry * cosA);

    this.setAttrCached(actor, "shL", actor.shoulderL, "transform", `translate(${worldLX.toFixed(1)}, ${worldLY.toFixed(1)}) rotate(${(r.waist + r.shL).toFixed(1)})`);
    this.setAttrCached(actor, "elL", actor.elbowL, "transform", `translate(0, ${actor.elbowLen}) rotate(${r.elL.toFixed(1)})`);
    this.setAttrCached(actor, "wrL", actor.wristL, "transform", `translate(0, ${actor.wristLen}) rotate(${r.wrL.toFixed(1)})`);

    this.setAttrCached(actor, "shR", actor.shoulderR, "transform", `translate(${worldRX.toFixed(1)}, ${worldRY.toFixed(1)}) rotate(${(r.waist + r.shR).toFixed(1)})`);
    this.setAttrCached(actor, "elR", actor.elbowR, "transform", `translate(0, ${actor.elbowLen}) rotate(${r.elR.toFixed(1)})`);
    this.setAttrCached(actor, "wrR", actor.wristR, "transform", `translate(0, ${actor.wristLen}) rotate(${r.wrR.toFixed(1)})`);

    if (actor.handPoseL !== r.hL && actor.handL) {
      actor.handPoseL = r.hL;
      actor.handL.innerHTML = buildCutoutHand(actor.id, actor.skinFill, actor.skinStroke, r.hL, "L");
    }
    if (actor.handPoseR !== r.hR && actor.handR) {
      actor.handPoseR = r.hR;
      actor.handR.innerHTML = buildCutoutHand(actor.id, actor.skinFill, actor.skinStroke, r.hR, "R");
    }

    // Physical Object Permanence on Desk
    if (actor.deskProps) {
      this.setAttrCached(actor, "dp_mug", actor.deskProps.mug, "opacity", r.activeProp === "mug" ? "0" : "1");
      this.setAttrCached(actor, "dp_pen", actor.deskProps.pen, "opacity", r.activeProp === "pen" ? "0" : "1");
      this.setAttrCached(actor, "dp_pad", actor.deskProps.pad, "opacity", r.activeProp === "pad" ? "0" : "1");
      this.setAttrCached(actor, "dp_tab", actor.deskProps.tablet, "opacity", r.activeProp === "tablet" ? "0" : "1");
    }

    // Pupils & glints
    const pxL = (-14 + r.gazeX).toFixed(1), pxR = (14 + r.gazeX).toFixed(1), py = r.gazeY.toFixed(1);
    const gxL = (-12.5 + r.gazeX).toFixed(1), gxR = (15.5 + r.gazeX).toFixed(1), gy = (r.gazeY - 1.6).toFixed(1);
    this.setAttrCached(actor, "pLx", actor.pupilL, "cx", pxL);
    this.setAttrCached(actor, "pLy", actor.pupilL, "cy", py);
    this.setAttrCached(actor, "pRx", actor.pupilR, "cx", pxR);
    this.setAttrCached(actor, "pRy", actor.pupilR, "cy", py);
    this.setAttrCached(actor, "gLx", actor.glintL, "cx", gxL);
    this.setAttrCached(actor, "gLy", actor.glintL, "cy", gy);
    this.setAttrCached(actor, "gRx", actor.glintR, "cx", gxR);
    this.setAttrCached(actor, "gRy", actor.glintR, "cy", gy);

    // Clipped Eyelids + Crisp Lash Seam (Zero Stray Bars When Open!)
    const blinkClose = 1 - r.blinkOpenness;
    const topAmt = r.facs.lidTop + blinkClose * (1 - r.facs.lidTop);
    const botAmt = r.facs.lidBot + blinkClose * 0.45;
    const topH = topAmt > 0.05 ? Math.min(35, topAmt * 35) : 0;
    const botH = botAmt > 0.05 ? Math.min(22, botAmt * 22) : 0;

    if (actor.lidTop) {
      this.setAttrCached(actor, "ltH", actor.lidTop, "height", topH.toFixed(1));
      this.setAttrCached(actor, "ltO", actor.lidTop, "opacity", topH > 1.8 ? "1" : "0");
    }
    if (actor.lashTop) {
      const lashY = (-28 + topH).toFixed(1);
      this.setAttrCached(actor, "lashT1", actor.lashTop, "y1", lashY);
      this.setAttrCached(actor, "lashT2", actor.lashTop, "y2", lashY);
      this.setAttrCached(actor, "lashTO", actor.lashTop, "opacity", topH > 1.8 ? "1" : "0");
    }
    if (actor.lidBot) {
      const botY = (28 - botH).toFixed(1);
      this.setAttrCached(actor, "lbY", actor.lidBot, "y", botY);
      this.setAttrCached(actor, "lbH", actor.lidBot, "height", botH.toFixed(1));
      this.setAttrCached(actor, "lbO", actor.lidBot, "opacity", botH > 1.8 ? "1" : "0");
    }
    if (actor.lashBot) {
      const lashBY = (28 - botH).toFixed(1);
      this.setAttrCached(actor, "lashB1", actor.lashBot, "y1", lashBY);
      this.setAttrCached(actor, "lashB2", actor.lashBot, "y2", lashBY);
      this.setAttrCached(actor, "lashBO", actor.lashBot, "opacity", botH > 1.8 ? "0.8" : "0");
    }

    if (actor.browL && actor.browR) {
      this.setAttrCached(actor, "brL", actor.browL, "transform", `translate(0, ${r.facs.browL[0].toFixed(1)}) rotate(${r.facs.browL[1].toFixed(1)} -22 -3)`);
      this.setAttrCached(actor, "brR", actor.browR, "transform", `translate(0, ${r.facs.browR[0].toFixed(1)}) rotate(${r.facs.browR[1].toFixed(1)} 22 -3)`);
    }

    // Phoneme-Synchronized Lip Articulation
    const isSpeaker = this.state === "talking" && this.speaker === index;
    let viseme = r.facs.restMouth || (actor.id === "dex" ? "smug" : "neutral");
    if (isSpeaker) {
      const elapsedInWord = now - this.lastWordAt;
      if (elapsedInWord < this.wordDurationMs && this.visemeSeq.length) {
        const idxV = Math.min(this.visemeSeq.length - 1, Math.floor((elapsedInWord / this.wordDurationMs) * this.visemeSeq.length));
        viseme = this.visemeSeq[idxV];
      } else if (elapsedInWord < this.wordDurationMs + 280) {
        viseme = "bmp";
      }
    }
    const v = VISEMES[viseme] ? viseme : "neutral";
    if (actor.currentViseme !== v && actor.mouth) {
      actor.currentViseme = v;
      actor.mouth.innerHTML = VISEMES[v];
    }
  }

  /** Cycle AI lab telemetry status on the right wall display. */
  updateEasterEggs(now) {
    if (!this.dom) return;

    const screenMsgs = [
      ["MODEL RADAR", "NEW RELEASES: TRACKED"],
      ["MCP DESK", "SERVERS: ONLINE"],
      ["FACT CHECK", "SOURCES: VERIFIED"],
      ["AGENT DESK", "6 AGENTS: STANDING BY"],
      ["OPEN WEIGHTS", "LOCAL GPU: READY"],
    ];
    const slotIdx = this.reducedMotion ? 0 : Math.floor(now / 4200) % screenMsgs.length;
    const nextKey = `NORM_${slotIdx}`;
    if (this._easterState !== nextKey) {
      this._easterState = nextKey;
      const [l1, l2] = screenMsgs[slotIdx];
      this.dom.easterScreenBorder?.setAttribute("stroke", "#38bdf8");
      this.dom.easterScreenLed?.setAttribute("fill", "#22c55e");
      if (this.dom.easterScreenLine1) {
        this.dom.easterScreenLine1.textContent = l1;
        this.dom.easterScreenLine1.setAttribute("fill", "#38bdf8");
      }
      if (this.dom.easterScreenLine2) {
        this.dom.easterScreenLine2.textContent = l2;
        this.dom.easterScreenLine2.setAttribute("fill", "#e2e8f0");
      }
    }
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    // Nobody watching (another view, or the studio scrolled away): one frame a second. Nothing
    // on air and the desk idle: five a second, enough for the anchors to breathe.
    const quiet = this.base === "idle" && !this.work && !this.hail && !this.ping;
    const gap = !this.onScreen ? 1000 : quiet ? 200 : this.reducedMotion ? 125 : 0;
    if (gap && now - this._last < gap) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - (this._last || now)) / 1000));
    this._last = now;
    this.tick++;

    if (!this.reducedMotion) {
      this.sweep = (this.sweep + dt * STUDIO_MODES[this.mode].rate * 1.4) % (Math.PI * 2);
      if (this.dom?.miniRadarSweep && now - this._lastSweepAt > 32) {
        this._lastSweepAt = now;
        const sx = 21 + Math.cos(this.sweep) * 11;
        const sy = 21 + Math.sin(this.sweep) * 11;
        this.dom.miniRadarSweep.setAttribute("x2", sx.toFixed(1));
        this.dom.miniRadarSweep.setAttribute("y2", sy.toFixed(1));
      }
    }

    const prevShake = this.deskShakeY;
    this.deskShakeY = lerp(this.deskShakeY, 0, Math.min(1, 1 - Math.exp(-12 * dt)));
    if (Math.abs(prevShake - this.deskShakeY) > 0.05 || (prevShake !== 0 && Math.abs(this.deskShakeY) <= 0.2)) {
      this.dom?.layerDeskProps?.setAttribute(
        "transform",
        Math.abs(this.deskShakeY) > 0.2 ? `translate(0, ${this.deskShakeY.toFixed(1)})` : "translate(0, 0)"
      );
      if (Math.abs(this.deskShakeY) <= 0.2) this.deskShakeY = 0;
    }

    if (!this.svgMounted || !this.actors) return;
    this.updateEasterEggs(now);
    this.updateRig(0, now, dt);
    this.updateRig(1, now, dt);
    this.renderActorFromRig(0, now);
    this.renderActorFromRig(1, now);
  }
}
