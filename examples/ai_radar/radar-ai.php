<?php
// What the news editor (editor.php) and the script writer (writer.php) share: the settings and
// keys, the per-day and per-visitor counts, the checks on what a model writes, and one way to
// ask each provider. It answers nothing by itself.
//
// Settings are read from ai-radar-secret.php, one folder above the web folder (see README.md).

ini_set('display_errors', '0');

const EDITOR_DEFAULTS = [
  // Asked first when its key is set: Google AI Studio, on the site's own quota. Gemini 3.1
  // Flash-Lite judges 25 stories in about three seconds; Gemma 4 on AI Studio was often
  // "experiencing high demand" or silent, and so were the larger Gemini Flash models.
  'google_ai_key' => '',
  'editor_google_upstream' => 'https://generativelanguage.googleapis.com/v1beta/openai',
  'editor_google_model' => 'gemini-3.1-flash-lite',
  'editor_google_day' => 400,       // model calls a day: well under AI Studio's free quota
  // Seconds to wait for Google before Groq is asked. When AI Studio is busy, a model often
  // sends nothing at all until the wait runs out, while Groq answers in about five seconds.
  'editor_google_wait' => 40,
  // Then Groq, free with a key and very fast (under a second where free OpenRouter takes 20).
  'groq_key' => '',
  'editor_groq_upstream' => 'https://api.groq.com/openai/v1',
  'editor_groq_model' => 'openai/gpt-oss-120b',
  'editor_groq_day' => 300,
  // Then OpenRouter's free models.
  'openrouter_key' => '',
  'editor_upstream' => 'https://openrouter.ai/api/v1',
  'editor_model' => 'google/gemma-4-31b-it:free',
  // Free models OpenRouter moves to on its own when the first is busy (free Gemma is often
  // "rate-limited upstream" at Google). One request still counts once against the daily cap.
  'editor_backup_models' => ['nvidia/nemotron-3.5-super-vl:free'],
  'editor_global_day' => 45,        // model calls a day on OpenRouter (free models allow 50 a day)
  'editor_per_ip_hour' => 30,       // requests per visitor per hour (most are answered from the cache)
  'editor_batch' => 25,             // stories per model call
  'editor_enabled' => true,
  // The fallback: the site's Otari key, read from the same file as llm-proxy.php, with a fast
  // model of its own (the chat's Qwen 3.5 thinks for 4,000+ tokens before it answers).
  'key' => '',
  'upstream' => 'https://api.otari.ai/api/v1',
  'editor_fallback_model' => 'alibaba/qwen3.8-flash',
  'editor_fallback_day' => 60,      // model calls a day on Otari
  // The script writer (writer.php) asks the same providers, Groq first for speed, and counts
  // against the same daily counts, plus its own.
  'writer_enabled' => true,
  'writer_day' => 200,              // model calls a day for scripts, of up to 6 stories each
  'writer_per_ip_hour' => 40,       // requests per visitor per hour that need the model
  'writer_batch' => 6,              // stories per model call
  // A provider that was busy, failed or ran out of time is skipped for this many seconds, so
  // the next requests go straight to the one after it.
  'provider_rest' => 300,
  'trust_proxy' => false,
  'state_dir' => '',
];

/**
 * The folders that may hold the key file and the caches, most private first: the folder above
 * the web folder, and when the web folder is a subdomain's folder inside public_html (as on
 * DonWeb, cPanel and Plesk), the folder above public_html before it, so nothing lands where the
 * main site serves files.
 */
if (!function_exists('radar_private_dirs')) {
  function radar_private_dirs(): array {
    $out = [];
    $bases = !empty($_SERVER['DOCUMENT_ROOT']) ? [rtrim($_SERVER['DOCUMENT_ROOT'], '/'), __DIR__] : [__DIR__];
    foreach ($bases as $base) {
      $up = dirname($base);
      if (in_array(strtolower(basename($up)), ['public_html', 'httpdocs', 'htdocs'], true)) $out[] = dirname($up);
      $out[] = $up;
    }
    return array_values(array_unique($out));
  }
}

function editor_config(): array {
  static $cfg = null;
  if ($cfg !== null) return $cfg;
  $cfg = EDITOR_DEFAULTS;
  if (getenv('AI_RADAR_SECRET_FILE')) {
    $files = [getenv('AI_RADAR_SECRET_FILE')];
  } else {
    $files = [];
    foreach (radar_private_dirs() as $dir) $files[] = $dir . '/ai-radar-secret.php';
  }
  foreach ($files as $file) {
    if (is_file($file)) {
      $found = include $file;
      if (is_array($found)) foreach ($found as $k => $v) if (array_key_exists($k, EDITOR_DEFAULTS)) $cfg[$k] = $v;
      break;
    }
  }
  $env = [
    'AI_RADAR_GOOGLE_AI_KEY' => 'google_ai_key', 'AI_RADAR_EDITOR_GOOGLE_UPSTREAM' => 'editor_google_upstream', 'AI_RADAR_EDITOR_GOOGLE_MODEL' => 'editor_google_model',
    'AI_RADAR_GROQ_KEY' => 'groq_key', 'AI_RADAR_EDITOR_GROQ_UPSTREAM' => 'editor_groq_upstream', 'AI_RADAR_EDITOR_GROQ_MODEL' => 'editor_groq_model',
    'AI_RADAR_OPENROUTER_KEY' => 'openrouter_key', 'AI_RADAR_EDITOR_UPSTREAM' => 'editor_upstream', 'AI_RADAR_EDITOR_MODEL' => 'editor_model',
    'AI_RADAR_OTARI_KEY' => 'key', 'AI_RADAR_UPSTREAM' => 'upstream', 'AI_RADAR_EDITOR_FALLBACK_MODEL' => 'editor_fallback_model', 'AI_RADAR_STATE_DIR' => 'state_dir',
  ];
  foreach ($env as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = getenv($name);
  if (getenv('AI_RADAR_EDITOR_BACKUP_MODELS') !== false) $cfg['editor_backup_models'] = array_values(array_filter(array_map('trim', explode(',', getenv('AI_RADAR_EDITOR_BACKUP_MODELS')))));
  if (!is_array($cfg['editor_backup_models'])) $cfg['editor_backup_models'] = [];
  $numbers = ['AI_RADAR_WRITER_DAY' => 'writer_day', 'AI_RADAR_WRITER_PER_IP_HOUR' => 'writer_per_ip_hour', 'AI_RADAR_EDITOR_GOOGLE_DAY' => 'editor_google_day', 'AI_RADAR_EDITOR_GROQ_DAY' => 'editor_groq_day', 'AI_RADAR_EDITOR_GLOBAL_DAY' => 'editor_global_day', 'AI_RADAR_EDITOR_PER_IP_HOUR' => 'editor_per_ip_hour', 'AI_RADAR_EDITOR_FALLBACK_DAY' => 'editor_fallback_day', 'AI_RADAR_EDITOR_GOOGLE_WAIT' => 'editor_google_wait', 'AI_RADAR_PROVIDER_REST' => 'provider_rest'];
  foreach ($numbers as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = (int) getenv($name);
  if (getenv('AI_RADAR_EDITOR_DISABLED') === '1') $cfg['editor_enabled'] = false;
  if (getenv('AI_RADAR_WRITER_DISABLED') === '1') $cfg['writer_enabled'] = false;
  foreach (['google_ai_key', 'groq_key', 'openrouter_key', 'key'] as $k) if (strpos((string) $cfg[$k], 'PASTE') === 0) $cfg[$k] = '';
  // The counters live one folder above the web folder, like the cache (see llm-proxy.php).
  if ($cfg['state_dir'] === '') {
    $cfg['state_dir'] = sys_get_temp_dir() . '/ai-radar-llm';
    foreach (radar_private_dirs() as $dir) {
      $place = $dir . '/ai-radar-state';
      if ((is_dir($place) || @mkdir($place, 0700, true)) && is_writable($place)) { $cfg['state_dir'] = $place; break; }
    }
  }
  return $cfg;
}

function editor_client_ip(array $cfg): string {
  // Behind your own proxy, the last address is the one it added.
  if ($cfg['trust_proxy'] && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $hops = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    return trim(end($hops));
  }
  return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/** A provider's error text for the log, without the site's keys. */
function editor_log_text(string $text, array $cfg): string {
  foreach (['google_ai_key', 'groq_key', 'openrouter_key', 'key'] as $k) if ($cfg[$k] !== '') $text = str_replace($cfg[$k], '[key]', $text);
  return substr(preg_replace('/\s+/', ' ', $text), 0, 300);
}

function editor_error(int $status, string $message, string $code, array $headers = []): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  foreach ($headers as $line) header($line);
  echo json_encode(['error' => ['message' => $message, 'code' => $code]]);
  exit;
}

function editor_reply(array $body): void {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function editor_same_origin_only(): void {
  $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
  $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origin !== '') {
    $parts = parse_url($origin);
    $theirs = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));
    if ($theirs !== '' && $theirs === $host) return;
  } elseif (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin') {
    return;
  }
  editor_error(403, 'This endpoint answers only the pages of this site.', 'forbidden_origin');
}

/** Count one against some limits, or refuse without counting. Returns null when allowed. */
function editor_take(string $name, array $limits, array $cfg, bool $count = true): ?array {
  $dir = $cfg['state_dir'];
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = @fopen($dir . '/editor-' . $name . '.json', 'c+');
  // No place to count: no model call, rather than calls without limits.
  if (!$file) return ['d', 3600];
  flock($file, LOCK_EX);
  $state = json_decode((string) stream_get_contents($file), true);
  if (!is_array($state)) $state = [];
  $now = ['h' => gmdate('YmdH'), 'd' => gmdate('Ymd')];
  foreach ($limits as $w => $limit) if (($state[$w . 'w'] ?? '') !== $now[$w]) { $state[$w . 'w'] = $now[$w]; $state[$w . 'n'] = 0; }
  foreach ($limits as $w => $limit) {
    if (($state[$w . 'n'] ?? 0) >= $limit) { flock($file, LOCK_UN); fclose($file); return [$w, $w === 'h' ? 3600 - (time() % 3600) : 86400 - (time() % 86400)]; }
  }
  if ($count) {
    foreach ($limits as $w => $limit) $state[$w . 'n'] = ($state[$w . 'n'] ?? 0) + 1;
    ftruncate($file, 0); rewind($file); fwrite($file, json_encode($state)); fflush($file);
  }
  flock($file, LOCK_UN);
  fclose($file);
  return null;
}

/**
 * A cache folder ("editor" verdicts, "writer" scripts): next to the key file, above the web
 * folder, like the voice cache.
 */
function editor_cache_dir(array $cfg, string $name): string {
  static $dirs = [];
  if (isset($dirs[$name])) return $dirs[$name];
  $places = [];
  if (getenv('AI_RADAR_STATE_DIR')) $places[] = $cfg['state_dir'] . '/' . $name . '-cache';
  else {
    foreach (radar_private_dirs() as $dir) $places[] = $dir . '/ai-radar-' . $name . '-cache';
    $places[] = $cfg['state_dir'] . '/' . $name . '-cache';
  }
  foreach ($places as $place) {
    if (!is_dir($place)) @mkdir($place, 0700, true);
    if (is_dir($place) && is_writable($place)) return $dirs[$name] = $place;
  }
  return $dirs[$name] = end($places);
}

/** Write a cache file whole or not at all, so a reader never sees half of it. */
function radar_store(string $file, array $value): void {
  $tmp = $file . '.' . getmypid() . '.tmp';
  if (@file_put_contents($tmp, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false) @rename($tmp, $file);
}

function editor_text($value, int $max): string {
  $text = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value)));
  return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
}

// ---- checking what the model wrote ---------------------------------------------------

/**
 * Numbers as written, with their scale: "4", "3.6", "1,000", "v0.4.2", "$10M", "12 billion", "30%"
 * -> ["4", "3.6", "1000", "0.4.2", "10m", "12b", "30%"]. So "$12M" is not "$12B", and a
 * version is one number, not two.
 */
function editor_numbers(string $text): array {
  preg_match_all('/\d+(?:[.,]\d+)*(?:\s?(%|[kmbt](?![a-z])|thousand|million|billion|trillion))?/i', $text, $m);
  $scale = ['thousand' => 'k', 'million' => 'm', 'billion' => 'b', 'trillion' => 't'];
  return array_map(function ($n, $unit) use ($scale) {
    $number = rtrim(str_replace(',', '', preg_replace('/\s?(%|[kmbt]|thousand|million|billion|trillion)$/i', '', $n)), '.');
    $unit = strtolower($unit);
    return $number . ($scale[$unit] ?? $unit);
  }, $m[0], $m[1]);
}

function editor_first_person(string $text): bool {
  return (bool) preg_match("/(?<![\\p{L}'’])(?:I|I['’](?:m|ve|d|ll)|[Mm]e|[Mm]y|[Mm]ine|[Mm]yself|[Ww]e|[Ww]e['’](?:re|ve|d|ll)|[Oo]ur|[Oo]urs|[Oo]urselves|us)(?![\\p{L}'’])/u", $text);
}

/** Latin words of four letters or more, for checking that a line is about its own story. */
function editor_words(string $text): array {
  preg_match_all('/[a-z0-9]{4,}/', strtolower($text), $m);
  return array_values(array_unique($m[0]));
}

/** Swearing, which no line on air may contain. */
function radar_profane(string $text): bool {
  return (bool) preg_match('/\b(?:fuck\w*|shit\w*|bitch\w*|asshole\w*|cunt\w*)\b/i', $text);
}

// ---- asking the providers --------------------------------------------------------------

/**
 * The providers that have a key, in the order given: google, groq, openrouter, otari. Each
 * has its own daily count of model calls, shared by the editor and the writer.
 */
function radar_providers(array $cfg, array $order): array {
  $all = [
    'google' => ['key' => $cfg['google_ai_key'], 'base' => $cfg['editor_google_upstream'], 'model' => $cfg['editor_google_model'], 'day' => $cfg['editor_google_day'], 'backups' => [], 'wait' => $cfg['editor_google_wait']],
    'groq' => ['key' => $cfg['groq_key'], 'base' => $cfg['editor_groq_upstream'], 'model' => $cfg['editor_groq_model'], 'day' => $cfg['editor_groq_day'], 'backups' => []],
    'openrouter' => ['key' => $cfg['openrouter_key'], 'base' => $cfg['editor_upstream'], 'model' => $cfg['editor_model'], 'day' => $cfg['editor_global_day'], 'backups' => $cfg['editor_backup_models']],
    'otari' => ['key' => $cfg['key'], 'base' => $cfg['upstream'], 'model' => $cfg['editor_fallback_model'], 'day' => $cfg['editor_fallback_day'], 'backups' => []],
  ];
  $out = [];
  foreach ($order as $name) if (isset($all[$name]) && $all[$name]['key'] !== '') $out[] = ['name' => $name] + $all[$name] + ['wait' => 90];
  return $out;
}

function radar_rest_file(array $cfg, string $name): string {
  return $cfg['state_dir'] . '/rest-' . preg_replace('/[^a-z]/', '', $name) . '.txt';
}

/** Whether a provider is still resting after it was busy or failed (see provider_rest). */
function radar_resting(array $cfg, string $name): bool {
  $until = (int) @file_get_contents(radar_rest_file($cfg, $name));
  return $until > time();
}

function radar_rest(array $cfg, string $name): void {
  if ((int) $cfg['provider_rest'] <= 0) return;
  if (!is_dir($cfg['state_dir'])) @mkdir($cfg['state_dir'], 0700, true);
  @file_put_contents(radar_rest_file($cfg, $name), (string) (time() + (int) $cfg['provider_rest']), LOCK_EX);
}

/**
 * Ask one provider for a JSON object with an "items" list. Each provider wants it its own way:
 * OpenRouter gets a list of free models to move through and a little thinking, Google AI
 * Studio gets the rules first in one message and no JSON mode (Gemma there takes neither),
 * Groq gets a short think. Returns [the decoded object, the model that answered] or null.
 */
function radar_ask_json(array $p, string $rules, string $user, int $maxTokens, float $temperature, string $who): ?array {
  $style = $p['name'];
  $openrouter = $style === 'openrouter';
  $body = [
    'model' => $p['model'],
    'messages' => [['role' => 'system', 'content' => $rules], ['role' => 'user', 'content' => $user]],
    'temperature' => $temperature,
    'max_tokens' => $maxTokens,
    'response_format' => ['type' => 'json_object'],
  ];
  if ($style === 'google') {
    $body['messages'] = [['role' => 'user', 'content' => $rules . "\n\n" . $user]];
    unset($body['response_format']);
  }
  if ($style === 'groq') $body['reasoning_effort'] = 'low';
  // Think a little before answering, but send back only the answer.
  if ($openrouter) $body['reasoning'] = ['effort' => 'low', 'exclude' => true];
  if ($openrouter && $p['backups']) $body['models'] = array_values(array_unique(array_merge([$p['model']], $p['backups'])));
  $headers = ['Authorization: Bearer ' . $p['key'], 'Content-Type: application/json'];
  if ($openrouter) { $headers[] = 'X-Title: AI Radar'; $headers[] = 'HTTP-Referer: https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/'; }
  $ch = curl_init(rtrim($p['base'], '/') . '/chat/completions');
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => max(5, (int) $p['wait']), CURLOPT_FOLLOWLOCATION => false,
  ]);
  $raw = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  if ($raw === false || $status !== 200) {
    error_log($who . ': ' . $p['model'] . ' answered ' . $status . ': ' . editor_log_text((string) $raw, editor_config()));
    // Busy (429), down (5xx) or out of time (no answer): let the next provider take the next requests.
    if ($raw === false || $status === 0 || $status === 429 || $status >= 500) radar_rest(editor_config(), $p['name']);
    return null;
  }
  $reply = json_decode((string) $raw, true);
  // OpenRouter says which of the models answered.
  $by = is_string($reply['model'] ?? null) && $reply['model'] !== '' ? $reply['model'] : $p['model'];
  $content = (string) ($reply['choices'][0]['message']['content'] ?? '');
  // Some models wrap the JSON in a code fence or a sentence: take the outermost object.
  $start = strpos($content, '{');
  $end = strrpos($content, '}');
  $data = $start !== false && $end !== false ? json_decode(substr($content, $start, $end - $start + 1), true) : null;
  if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
    error_log($who . ': ' . $p['model'] . ' sent no items (finish: ' . ($reply['choices'][0]['finish_reason'] ?? '-') . '): ' . substr(preg_replace('/\s+/', ' ', $content), 0, 300));
    return null;
  }
  return [$data, $by];
}
