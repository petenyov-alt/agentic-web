<?php
// The site's own AI, for visitors who bring no key.
//
// The page sends OpenAI-style chat requests to /llm-proxy.php/v1/chat/completions. This
// file checks them, adds the site's Otari key, which lives outside the web folder, and
// streams Otari's answer back. A visitor who pastes their own key never comes here: the
// browser then calls their provider directly, and this file never sees or replaces it.
//
// It is not an open door to a model. A request passes only when
//   - it comes from this site's own pages (same origin),
//   - its first message is one of this network's agent instructions, so it is one of
//     Elon's and Sam's agents asking, not a free chat,
//   - it has no other system message, few messages, a bounded size and a bounded tool list,
//   - its person has not used up their hourly and daily allowance, and the site's daily
//     allowance is not used up.
// The model, the answer length and every other field are set here, whatever the page asks.
//
// Setup, on the server (see README.md, "The site's own AI"): put the key in
// ai-radar-secret.php ONE FOLDER ABOVE the web folder, never inside it:
//   <?php return ['key' => 'otk_...'];
// Environment variables AI_RADAR_OTARI_KEY and AI_RADAR_SECRET_FILE work too.
// GET /llm-proxy.php?status tells the page whether the site's AI is available. It never
// shows the key. PHP 7.4 or newer, with cURL.

ini_set('display_errors', '0');

const DEFAULTS = [
  'key' => '',
  'upstream' => 'https://api.otari.ai/api/v1',
  'model' => 'alibaba/qwen3.8-flash',   // fast: Qwen 3.5 took about 20 seconds before each step
  // When Otari cannot answer (allowance used, busy, down), the same request goes to Groq,
  // free with a key. Empty key: no second chance, as before.
  'groq_key' => '',
  'groq_upstream' => 'https://api.groq.com/openai/v1',
  'groq_model' => 'openai/gpt-oss-120b',
  'max_tokens' => 4096,        // some hosted models fail without one; thinking models need room (1800 cut Qwen 3.5 short)
  'per_ip_hour' => 60,
  'per_ip_day' => 250,
  'global_day' => 1500,        // requests a day for the whole site
  'max_body' => 180000,        // bytes
  'max_messages' => 80,
  'max_tools' => 40,
  'max_system_extra' => 6000,  // characters the runtime adds after an agent's instructions (presentation and website notes)
  'max_user_chars' => 6000,    // one visitor message (the chat box takes 4,000); the producer's story list fits too
  'max_other_chars' => 30000,  // one tool result or earlier answer
  'enabled' => true,           // false switches the site's AI off at once
  'trust_proxy' => false,      // true only behind a proxy you control: reads X-Forwarded-For
  'state_dir' => '',
  // Partner sites this site's agents call (link_labels in ai_radar.hocon). A partner's network
  // runs in the visitor's browser on this site's AI, so its agents' published instructions are
  // accepted too, read from the partner's own site and kept for an hour.
  'partner_networks' => ['https://deadline-desk-agent.vercel.app/deadline_desk.network.json'],
];

function config(): array {
  static $cfg = null;
  if ($cfg !== null) return $cfg;
  $cfg = DEFAULTS;
  // AI_RADAR_SECRET_FILE, when set, is the only file read (even if it does not exist).
  if (getenv('AI_RADAR_SECRET_FILE')) {
    $files = [getenv('AI_RADAR_SECRET_FILE')];
  } else {
    $files = [];
    if (!empty($_SERVER['DOCUMENT_ROOT'])) $files[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/../ai-radar-secret.php';
    $files[] = __DIR__ . '/../ai-radar-secret.php';
  }
  foreach ($files as $file) {
    if (is_file($file)) {
      $found = include $file;
      if (is_array($found)) $cfg = array_merge($cfg, $found);
      break;
    }
  }
  $env = [
    'AI_RADAR_OTARI_KEY' => 'key', 'AI_RADAR_UPSTREAM' => 'upstream', 'AI_RADAR_MODEL' => 'model',
    'AI_RADAR_STATE_DIR' => 'state_dir', 'AI_RADAR_GROQ_KEY' => 'groq_key', 'AI_RADAR_GROQ_UPSTREAM' => 'groq_upstream', 'AI_RADAR_GROQ_MODEL' => 'groq_model',
  ];
  foreach ($env as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = getenv($name);
  $numbers = [
    'AI_RADAR_PER_IP_HOUR' => 'per_ip_hour', 'AI_RADAR_PER_IP_DAY' => 'per_ip_day', 'AI_RADAR_GLOBAL_DAY' => 'global_day',
    'AI_RADAR_MAX_BODY' => 'max_body', 'AI_RADAR_MAX_MESSAGES' => 'max_messages',
  ];
  foreach ($numbers as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = (int) getenv($name);
  if (getenv('AI_RADAR_DISABLED') === '1') $cfg['enabled'] = false;
  if (getenv('AI_RADAR_PARTNER_NETWORKS') !== false) $cfg['partner_networks'] = array_values(array_filter(array_map('trim', explode(',', getenv('AI_RADAR_PARTNER_NETWORKS')))));
  if (!is_array($cfg['partner_networks'])) $cfg['partner_networks'] = [];
  // The template's placeholder is not a key: until it is replaced, the site's AI stays off.
  if (strpos((string) $cfg['key'], 'PASTE') === 0) $cfg['key'] = '';
  if (strpos((string) $cfg['groq_key'], 'PASTE') === 0) $cfg['groq_key'] = '';
  // The counters live next to the key file, one folder above the web folder, so no other site
  // on a shared host can reset them; the system's temporary folder only when that is not writable.
  if ($cfg['state_dir'] === '') {
    $cfg['state_dir'] = sys_get_temp_dir() . '/ai-radar-llm';
    $root = !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/../ai-radar-state' : '';
    foreach ([$root, __DIR__ . '/../ai-radar-state'] as $place) {
      if ($place !== '' && (is_dir($place) || @mkdir($place, 0700, true)) && is_writable($place)) { $cfg['state_dir'] = $place; break; }
    }
  }
  return $cfg;
}

function reply_error(int $status, string $message, string $code, array $headers = []): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  foreach ($headers as $line) header($line);
  echo json_encode(['error' => ['message' => $message, 'type' => $code, 'code' => $code]]);
  exit;
}

// ---- who may ask ---------------------------------------------------------------------

function same_origin_only(): void {
  $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
  $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origin !== '') {
    $parts = parse_url($origin);
    $theirs = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));
    if ($theirs !== '' && $theirs === $host) return;
  } elseif (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin') {
    return;
  }
  reply_error(403, 'This endpoint answers only the pages of this site.', 'forbidden_origin');
}

function client_ip(array $cfg): string {
  // Behind your own proxy, the last address is the one it added; earlier ones come from the visitor.
  if ($cfg['trust_proxy'] && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $hops = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    return trim(end($hops));
  }
  return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

// ---- what may be asked ---------------------------------------------------------------

function squash(string $text): string {
  return trim(preg_replace('/\s+/', ' ', $text));
}

function network_file(): array {
  static $net = null;
  if ($net !== null) return $net;
  $file = __DIR__ . '/ai_radar.network.json';
  $net = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
  if (!is_array($net) || empty($net['tools'])) reply_error(500, 'The site AI is not set up: the network file is missing.', 'misconfigured');
  return $net;
}

/**
 * Each agent's whole instructions, as the runtime expands them. A request must start with one
 * of them in full, so its rules (scope, grounding, safety) cannot be cut off and replaced.
 * Placeholders are expanded until none is left, as the runtime does.
 */
/**
 * The partner networks in partner_networks, read from each partner's own site (https only,
 * or this machine for tests) and kept an hour in the state folder. A partner that cannot be
 * read uses its last copy, or is left out: its agents then get "not for this endpoint".
 */
function partner_networks(): array {
  static $nets = null;
  if ($nets !== null) return $nets;
  $cfg = config();
  $nets = [];
  foreach ($cfg['partner_networks'] as $url) {
    $parts = parse_url((string) $url);
    $local = in_array($parts['host'] ?? '', ['127.0.0.1', 'localhost'], true);
    if (!$parts || !(($parts['scheme'] ?? '') === 'https' || ($local && ($parts['scheme'] ?? '') === 'http'))) continue;
    $cache = $cfg['state_dir'] . '/partner-' . sha1((string) $url) . '.json';
    $net = null;
    if (is_file($cache) && filemtime($cache) > time() - 3600) $net = json_decode((string) file_get_contents($cache), true);
    // A partner that did not answer is not asked again for ten minutes: no wait on every request.
    $failed = $cfg['state_dir'] . '/partner-' . sha1((string) $url) . '.failed';
    if (!is_array($net) && is_file($failed) && filemtime($failed) > time() - 600) {
      $net = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
      if (is_array($net) && !empty($net['tools'])) $nets[] = $net;
      continue;
    }
    if (!is_array($net)) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
      $raw = curl_exec($ch);
      $fresh = curl_getinfo($ch, CURLINFO_RESPONSE_CODE) === 200 && is_string($raw) && strlen($raw) < 1000000 ? json_decode($raw, true) : null;
      if (is_array($fresh) && !empty($fresh['tools']) && is_array($fresh['tools'])) {
        $net = $fresh;
        if (is_dir($cfg['state_dir']) || @mkdir($cfg['state_dir'], 0700, true)) @file_put_contents($cache, json_encode($net), LOCK_EX);
      } else {
        @touch($failed);
        if (is_file($cache)) $net = json_decode((string) file_get_contents($cache), true);   // stale, but the last good copy
      }
    }
    if (is_array($net) && !empty($net['tools']) && is_array($net['tools'])) $nets[] = $net;
  }
  return $nets;
}

/** This site's network, then its partners'. */
function all_networks(): array {
  return array_merge([network_file()], partner_networks());
}

function agent_fingerprints(): array {
  static $prints = null;
  if ($prints !== null) return $prints;
  $prints = [];
  foreach (all_networks() as $net) {
    $strings = $net['commondefs']['replacement_strings'] ?? [];
    foreach ($net['tools'] as $agent) {
      if (!is_array($agent) || empty($agent['instructions']) || !is_string($agent['instructions'])) continue;
      $text = $agent['instructions'];
      for ($pass = 0; $pass < 4 && preg_match('/\{[A-Za-z0-9_]+\}/', $text); $pass++) {
        $text = preg_replace_callback('/\{([A-Za-z0-9_]+)\}/', function ($m) use ($strings) {
          return array_key_exists($m[1], $strings) && is_string($strings[$m[1]]) ? $strings[$m[1]] : $m[0];
        }, $text);
      }
      $prints[] = squash($text);
    }
  }
  return $prints;
}

/**
 * Tool names the agents send: website_*, mcp_*, render_cruse, the agents of this network and
 * its partners', and each partner tool, named by its network URL's path ("deadline_desk").
 */
function known_tool(string $name): bool {
  static $names = null;
  if ($names === null) {
    $names = [];
    foreach (all_networks() as $net) {
      foreach ($net['tools'] as $agent) {
        if (!is_array($agent)) continue;
        if (is_string($agent['name'] ?? null) && $agent['name'] !== '') $names[$agent['name']] = true;
        foreach ((array) ($agent['tools'] ?? []) as $tool) {
          if (is_string($tool) && preg_match('#^https?://[^/]+/(.+)$#', $tool, $m)) $names[trim(preg_replace('/[^A-Za-z0-9]+/', '_', $m[1]), '_')] = true;
        }
      }
    }
  }
  return (bool) preg_match('/^(?:website|mcp)_[A-Za-z0-9_]{1,56}$/', $name) || $name === 'render_cruse' || isset($names[$name]);
}

function clean_message($m): array {
  $cfg = config();
  if (!is_array($m)) reply_error(400, 'Each message must be an object.', 'invalid_request');
  $role = $m['role'] ?? '';
  if (!in_array($role, ['system', 'user', 'assistant', 'tool'], true)) reply_error(400, 'Unknown message role.', 'invalid_request');
  $content = $m['content'] ?? null;
  if ($content !== null && !is_string($content)) reply_error(400, 'Message content must be text.', 'invalid_request');
  $limit = $role === 'user' ? $cfg['max_user_chars'] : ($role === 'system' ? PHP_INT_MAX : $cfg['max_other_chars']);
  $chars = function_exists('mb_strlen') ? mb_strlen((string) $content, 'UTF-8') : strlen((string) $content);
  if ($chars > $limit) reply_error(413, 'A message is too long.', 'too_large');
  $out = ['role' => $role, 'content' => $content];
  if ($role === 'assistant' && isset($m['tool_calls'])) {
    if (!is_array($m['tool_calls']) || count($m['tool_calls']) > 16) reply_error(400, 'Too many tool calls.', 'invalid_request');
    $out['tool_calls'] = $m['tool_calls'];
  }
  if ($role === 'tool') {
    $out['tool_call_id'] = (string) ($m['tool_call_id'] ?? '');
    if (isset($m['name'])) $out['name'] = (string) $m['name'];
  }
  return $out;
}

/** Check a request and return the body to send to Otari. Exits with an error otherwise. */
function build_upstream_body(string $raw, array $cfg): array {
  $req = json_decode($raw, true);
  if (!is_array($req) || !isset($req['messages']) || !is_array($req['messages'])) reply_error(400, 'The request is not a chat request.', 'invalid_request');
  $messages = array_values($req['messages']);
  if (count($messages) < 2 || count($messages) > $cfg['max_messages']) reply_error(400, 'Wrong number of messages.', 'invalid_request');
  $clean = array_map('clean_message', $messages);
  if ($clean[0]['role'] !== 'system') reply_error(400, 'This endpoint serves the AI Radar agents only.', 'out_of_scope');
  for ($i = 1; $i < count($clean); $i++) {
    if ($clean[$i]['role'] === 'system') reply_error(400, 'This endpoint serves the AI Radar agents only.', 'out_of_scope');
  }
  // The system message is one agent's whole instructions, then at most a short note the runtime adds.
  $system = squash((string) $clean[0]['content']);
  $known = false;
  foreach (agent_fingerprints() as $print) {
    if ($print !== '' && strpos($system, $print) === 0 && strlen($system) - strlen($print) <= $cfg['max_system_extra']) { $known = true; break; }
  }
  if (!$known) reply_error(400, 'This endpoint serves the AI Radar agents only.', 'out_of_scope');

  $body = [
    'model' => $cfg['model'],
    'messages' => $clean,
    'stream' => !empty($req['stream']),
    'max_tokens' => (int) $cfg['max_tokens'],
  ];
  if (!empty($req['tools'])) {
    if (!is_array($req['tools']) || count($req['tools']) > $cfg['max_tools']) reply_error(400, 'Too many tools.', 'invalid_request');
    foreach ($req['tools'] as $tool) {
      $name = $tool['function']['name'] ?? '';
      if (($tool['type'] ?? '') !== 'function' || !is_string($name) || !known_tool($name)) reply_error(400, 'Unknown tool.', 'invalid_request');
    }
    // The tools again as objects: decoded as arrays, an empty "properties": {} would go out as [],
    // which some providers refuse.
    $asObjects = json_decode($raw, false);
    $body['tools'] = array_values((array) $asObjects->tools);
    $body['tool_choice'] = 'auto';
  }
  return $body;
}

// ---- how much may be asked -----------------------------------------------------------

function windows(): array {
  return ['h' => gmdate('YmdH'), 'd' => gmdate('Ymd')];
}

function seconds_left(string $window): int {
  return $window === 'h' ? 3600 - (time() % 3600) : 86400 - (time() % 86400);
}

/**
 * Count one request against some limits, or refuse it without counting.
 * $limits: ['h' => 60, 'd' => 250]. Returns null when allowed, else [window, seconds left].
 */
function take(string $name, array $limits, array $cfg, bool $count = true): ?array {
  $dir = $cfg['state_dir'];
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = fopen($dir . '/' . $name . '.json', 'c+');
  if (!$file) {
    // No place to count: the site's AI stops rather than run without limits.
    if ($count) reply_error(503, 'The site\'s free AI is not available right now. Open AI model settings and add your own key.', 'site_ai_off');
    return null;
  }
  flock($file, LOCK_EX);
  $state = json_decode((string) stream_get_contents($file), true);
  if (!is_array($state)) $state = [];
  $now = windows();
  foreach ($limits as $w => $limit) {
    if (($state[$w . 'w'] ?? '') !== $now[$w]) { $state[$w . 'w'] = $now[$w]; $state[$w . 'n'] = 0; }
  }
  foreach ($limits as $w => $limit) {
    if (($state[$w . 'n'] ?? 0) >= $limit) { flock($file, LOCK_UN); fclose($file); return [$w, seconds_left($w)]; }
  }
  if ($count) {
    foreach ($limits as $w => $limit) $state[$w . 'n'] = ($state[$w . 'n'] ?? 0) + 1;
    ftruncate($file, 0);
    rewind($file);
    fwrite($file, json_encode($state));
    fflush($file);
  }
  flock($file, LOCK_UN);
  fclose($file);
  return null;
}

function sweep_old_state(array $cfg): void {
  if (mt_rand(1, 60) !== 1) return;
  foreach (glob($cfg['state_dir'] . '/*.json') ?: [] as $f) if (filemtime($f) < time() - 3 * 86400) @unlink($f);
}

// ---- main ----------------------------------------------------------------------------

$cfg = config();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// The page asks at llm-proxy.php/v1/status, the same kind of address as the chat itself, so a
// host where that address does not reach PHP is found out at once (the page then asks for a key).
$path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '';
if ($method === 'GET' && (isset($_GET['status']) || substr($path, -10) === '/v1/status')) {
  $available = $cfg['enabled'] && $cfg['key'] !== '' && take('global', ['d' => $cfg['global_day']], $cfg, false) === null;
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['ok' => true, 'available' => $available]);
  exit;
}
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') reply_error(405, 'Use POST.', 'method_not_allowed', ['Allow: POST']);

if (substr($path, -17) !== '/chat/completions') reply_error(404, 'Not found.', 'not_found');

same_origin_only();
if (!$cfg['enabled'] || $cfg['key'] === '') {
  reply_error(503, 'The site\'s own AI is switched off. Open AI model settings and add your own key.', 'site_ai_off');
}
$length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > $cfg['max_body']) reply_error(413, 'The request is too large.', 'too_large');
$raw = (string) file_get_contents('php://input', false, null, 0, $cfg['max_body'] + 1);
if (strlen($raw) > $cfg['max_body']) reply_error(413, 'The request is too large.', 'too_large');

$body = build_upstream_body($raw, $cfg);

$ip = client_ip($cfg);
sweep_old_state($cfg);
$limited = take('ip-' . sha1($ip), ['h' => $cfg['per_ip_hour'], 'd' => $cfg['per_ip_day']], $cfg);
if ($limited) {
  reply_error(429, 'You have used your share of the site\'s free AI for ' . ($limited[0] === 'h' ? 'this hour' : 'today')
    . '. Open AI model settings and add your own key to keep going.', 'rate_limited', ['Retry-After: ' . $limited[1]]);
}
$limited = take('global', ['d' => $cfg['global_day']], $cfg);
if ($limited) {
  reply_error(429, 'The site\'s free AI allowance for today is used up. Open AI model settings and add your own key, or come back tomorrow.',
    'site_allowance_used', ['Retry-After: ' . $limited[1]]);
}

/**
 * Send the request to one provider and stream its answer straight to the page. Nothing is
 * sent to the page until the provider answers well, so a failure can still go to the next one.
 * :return: [streamed, status, error body, curl error]
 */
function forward(string $base, string $key, array $body): array {
  $status = 0;
  $type = 'application/json';
  $errorBody = '';
  $started = false;
  $ch = curl_init(rtrim($base, '/') . '/chat/completions');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body),
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json',
      'Accept: ' . ($body['stream'] ? 'text/event-stream' : 'application/json')],
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 115,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$status, &$type) {
      if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int) $m[1];
      if (stripos($line, 'Content-Type:') === 0) $type = trim(substr($line, 13));
      return strlen($line);
    },
    CURLOPT_WRITEFUNCTION => function ($ch, $data) use (&$status, &$type, &$errorBody, &$started) {
      if ($status >= 400) { $errorBody .= substr($data, 0, 2000); return strlen($data); }
      if (!$started) {
        $started = true;
        while (ob_get_level()) ob_end_clean();
        http_response_code($status ?: 200);
        header('Content-Type: ' . $type);
        header('Cache-Control: no-store');
        header('X-Accel-Buffering: no');
        header('X-Content-Type-Options: nosniff');
      }
      echo $data;
      flush();
      return strlen($data);
    },
  ]);
  $ok = curl_exec($ch);
  $curlError = curl_error($ch);
  return [$started, ($ok || $status) ? $status : 0, $errorBody, $curlError];
}

// Forward to Otari with the site's key. The visitor's own Authorization header is never read.
ignore_user_abort(false);
set_time_limit(240);
[$started, $status, $errorBody, $curlError] = forward($cfg['upstream'], $cfg['key'], $body);
// Otari's allowance used, busy or down: the same request to Groq, when the site has its key.
// A rejected key (401/403) or a bad request (400) would fail there too, so those are not retried.
if (!$started && $cfg['groq_key'] !== '' && ($status === 0 || $status === 402 || $status === 429 || $status >= 500)) {
  error_log('llm-proxy: Otari answered ' . $status . '; asking Groq instead.');
  [$started, $status, $errorBody, $curlError] = forward($cfg['groq_upstream'], $cfg['groq_key'], ['model' => $cfg['groq_model']] + $body);
}

if ($started) exit;              // streamed: nothing more to say
if ($status === 0) {
  error_log('llm-proxy: cannot reach Otari: ' . $curlError);
  reply_error(502, 'The site\'s AI could not be reached. Try again in a moment, or add your own key in AI model settings.', 'upstream_unreachable');
}
// The provider's own message goes to the server log, never to the visitor.
error_log('llm-proxy: the AI provider answered ' . $status . ': ' . substr(str_replace(array_filter([$cfg['key'], $cfg['groq_key']]), '[site key]', preg_replace('/\s+/', ' ', $errorBody)), 0, 300));
if ($status === 401 || $status === 403) {
  reply_error(503, 'The site\'s AI key is not accepted right now. Open AI model settings and add your own key.', 'site_key_rejected');
}
if ($status === 402 || $status === 429) {
  reply_error(503, 'The site\'s free AI allowance is used up for now. Open AI model settings and add your own key to keep going.', 'site_allowance_used');
}
reply_error(502, 'The AI provider could not answer this request (error ' . $status . ').', 'upstream_error');
