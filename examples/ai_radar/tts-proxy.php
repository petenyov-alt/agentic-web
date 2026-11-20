<?php
// The anchors' studio voices: Deepgram Aura-2 text to speech, for the pages of this site.
//
// The page posts one sentence at a time, {"text": "...", "anchor": "theo" | "dex"}, and gets
// MP3 audio back. This file adds the site's Deepgram key, which lives outside the web folder,
// and keeps every sentence it has made in a cache: a news script is turned into audio once,
// and every later visitor hears the cached file without a new request to Deepgram.
//
// It is not an open text-to-speech service. A request passes only when
//   - it comes from this site's own pages (same origin),
//   - it names one of the two anchors (the voice is set here, never by the page),
//   - its text is short (one sentence or a few), and
//   - its person and the site have characters left for this hour and day. Cached
//     sentences never count.
// When it cannot answer, the page reads with the browser's own voice instead.
//
// Setup, on the server (see README.md, "Studio voices"): add the key to ai-radar-secret.php,
// the same file as the site's AI key, ONE FOLDER ABOVE the web folder:
//   'deepgram_key' => '...',
// The environment variable AI_RADAR_DEEPGRAM_KEY works too. GET /tts-proxy.php?status tells
// the page whether the voices are available. It never shows the key. PHP 7.4+, with cURL.

ini_set('display_errors', '0');

const TTS_DEFAULTS = [
  'deepgram_key' => '',
  'tts_upstream' => 'https://api.deepgram.com/v1/speak',
  'tts_voices' => ['theo' => 'aura-2-odysseus-en', 'dex' => 'aura-2-apollo-en'],
  'tts_max_text' => 1000,          // characters per request (Deepgram takes up to 2000)
  'tts_per_ip_hour' => 30000,      // characters per visitor per hour, not counting the cache (warmVoices needs about 22,500)
  'tts_per_ip_day' => 60000,
  'tts_global_day' => 100000,      // characters a day for the whole site: about $3 at $0.03 per 1,000
  'tts_cache_days' => 21,
  'tts_enabled' => true,           // false switches the studio voices off at once
  'trust_proxy' => false,
  'state_dir' => '',
];

function tts_config(): array {
  static $cfg = null;
  if ($cfg !== null) return $cfg;
  $cfg = TTS_DEFAULTS;
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
      // Only this file's own settings are taken; the site's AI key stays with llm-proxy.php.
      if (is_array($found)) foreach ($found as $k => $v) if (array_key_exists($k, TTS_DEFAULTS)) $cfg[$k] = $v;
      break;
    }
  }
  $env = ['AI_RADAR_DEEPGRAM_KEY' => 'deepgram_key', 'AI_RADAR_TTS_UPSTREAM' => 'tts_upstream', 'AI_RADAR_STATE_DIR' => 'state_dir'];
  foreach ($env as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = getenv($name);
  $numbers = ['AI_RADAR_TTS_PER_IP_HOUR' => 'tts_per_ip_hour', 'AI_RADAR_TTS_PER_IP_DAY' => 'tts_per_ip_day', 'AI_RADAR_TTS_GLOBAL_DAY' => 'tts_global_day'];
  foreach ($numbers as $name => $key) if (getenv($name) !== false && getenv($name) !== '') $cfg[$key] = (int) getenv($name);
  if (getenv('AI_RADAR_TTS_DISABLED') === '1') $cfg['tts_enabled'] = false;
  if (strpos((string) $cfg['deepgram_key'], 'PASTE') === 0) $cfg['deepgram_key'] = '';
  // The counters live one folder above the web folder, like the cache (see llm-proxy.php).
  if ($cfg['state_dir'] === '') {
    $cfg['state_dir'] = sys_get_temp_dir() . '/ai-radar-llm';
    $root = !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/../ai-radar-state' : '';
    foreach ([$root, __DIR__ . '/../ai-radar-state'] as $place) {
      if ($place !== '' && (is_dir($place) || @mkdir($place, 0700, true)) && is_writable($place)) { $cfg['state_dir'] = $place; break; }
    }
  }
  return $cfg;
}

function tts_error(int $status, string $message, string $code, array $headers = []): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  foreach ($headers as $line) header($line);
  echo json_encode(['error' => ['message' => $message, 'code' => $code]]);
  exit;
}

function tts_same_origin_only(): void {
  $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
  $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origin !== '') {
    $parts = parse_url($origin);
    $theirs = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));
    if ($theirs !== '' && $theirs === $host) return;
  } elseif (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin') {
    return;
  }
  tts_error(403, 'This endpoint answers only the pages of this site.', 'forbidden_origin');
}

function tts_client_ip(array $cfg): string {
  // Behind your own proxy, the last address is the one it added.
  if ($cfg['trust_proxy'] && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) { $hops = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']); return trim(end($hops)); }
  return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/**
 * Count $amount characters against some limits, or refuse without counting.
 * $limits: ['h' => 20000, 'd' => 60000]. Returns null when allowed, else [window, seconds left].
 */
function tts_take(string $name, array $limits, int $amount, array $cfg, bool $count = true): ?array {
  $dir = $cfg['state_dir'];
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = @fopen($dir . '/tts-' . $name . '.json', 'c+');
  // No place to count: refuse to make new audio (the cache still plays) rather than run without limits.
  if (!$file) return $count ? ['d', 3600] : null;
  flock($file, LOCK_EX);
  $state = json_decode((string) stream_get_contents($file), true);
  if (!is_array($state)) $state = [];
  $now = ['h' => gmdate('YmdH'), 'd' => gmdate('Ymd')];
  foreach ($limits as $w => $limit) {
    if (($state[$w . 'w'] ?? '') !== $now[$w]) { $state[$w . 'w'] = $now[$w]; $state[$w . 'n'] = 0; }
  }
  foreach ($limits as $w => $limit) {
    if (($state[$w . 'n'] ?? 0) + $amount > $limit) {
      flock($file, LOCK_UN); fclose($file);
      return [$w, $w === 'h' ? 3600 - (time() % 3600) : 86400 - (time() % 86400)];
    }
  }
  if ($count) {
    foreach ($limits as $w => $limit) $state[$w . 'n'] = ($state[$w . 'n'] ?? 0) + $amount;
    ftruncate($file, 0); rewind($file); fwrite($file, json_encode($state)); fflush($file);
  }
  flock($file, LOCK_UN);
  fclose($file);
  return null;
}

/**
 * Where the made sentences are kept: a folder next to the key file, one folder above the web
 * folder, so the cache lasts (the system's temporary folder is emptied now and then) and is
 * never served as a page. With AI_RADAR_STATE_DIR set (the tests), it lives in there instead.
 */
function tts_cache_dir(array $cfg): string {
  static $dir = null;
  if ($dir !== null) return $dir;
  $places = [];
  if (getenv('AI_RADAR_STATE_DIR')) $places[] = $cfg['state_dir'] . '/tts-cache';
  else {
    if (!empty($_SERVER['DOCUMENT_ROOT'])) $places[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/../ai-radar-voice-cache';
    $places[] = __DIR__ . '/../ai-radar-voice-cache';
    $places[] = $cfg['state_dir'] . '/tts-cache';
  }
  foreach ($places as $place) {
    if (!is_dir($place)) @mkdir($place, 0700, true);
    if (is_dir($place) && is_writable($place)) return $dir = $place;
  }
  return $dir = end($places);
}

function tts_sweep(array $cfg): void {
  if (mt_rand(1, 100) !== 1) return;
  $limit = time() - (int) $cfg['tts_cache_days'] * 86400;
  foreach (glob(tts_cache_dir($cfg) . '/*.mp3') ?: [] as $f) if (filemtime($f) < $limit) @unlink($f);
}

function tts_send_audio(string $audio, string $source): void {
  while (ob_get_level()) ob_end_clean();
  http_response_code(200);
  header('Content-Type: audio/mpeg');
  header('Content-Length: ' . strlen($audio));
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  header('X-Voice-Source: ' . $source);   // "cache" or "deepgram": for the tests and the logs
  echo $audio;
  exit;
}

// ---- main ----------------------------------------------------------------------------

$cfg = tts_config();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$ready = $cfg['tts_enabled'] && $cfg['deepgram_key'] !== '';

if ($method === 'GET' && isset($_GET['status'])) {
  $available = $ready && tts_take('global', ['d' => $cfg['tts_global_day']], 1, $cfg, false) === null;
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['ok' => true, 'available' => $available, 'anchors' => array_keys($cfg['tts_voices'])]);
  exit;
}
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') tts_error(405, 'Use POST.', 'method_not_allowed', ['Allow: POST']);

tts_same_origin_only();
if (!$ready) tts_error(503, 'The studio voices are switched off.', 'voices_off');

$raw = (string) file_get_contents('php://input', false, null, 0, 8001);
if (strlen($raw) > 8000) tts_error(413, 'The request is too large.', 'too_large');
$req = json_decode($raw, true);
if (!is_array($req)) tts_error(400, 'Send {"text": "...", "anchor": "theo" or "dex"}.', 'invalid_request');
$anchor = strtolower((string) ($req['anchor'] ?? ''));
if (!isset($cfg['tts_voices'][$anchor])) tts_error(400, 'Name one of the anchors: theo or dex.', 'unknown_anchor');
// Plain text only: no control characters, single spaces.
$text = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) ($req['text'] ?? ''))));
$chars = function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text);
if ($chars < 1 || !preg_match('/[\p{L}\p{N}]/u', $text)) tts_error(400, 'There is nothing to say.', 'empty_text');
if ($chars > $cfg['tts_max_text']) tts_error(413, 'Send at most ' . $cfg['tts_max_text'] . ' characters at a time.', 'too_long');

$model = $cfg['tts_voices'][$anchor];
$cached = tts_cache_dir($cfg) . '/' . sha1($model . "\n" . $text) . '.mp3';
if (is_file($cached) && filesize($cached) > 0) {
  @touch($cached);
  tts_send_audio((string) file_get_contents($cached), 'cache');
}

tts_sweep($cfg);
$limited = tts_take('ip-' . sha1(tts_client_ip($cfg)), ['h' => $cfg['tts_per_ip_hour'], 'd' => $cfg['tts_per_ip_day']], $chars, $cfg);
if ($limited) tts_error(429, 'You have heard your share of the studio voices for ' . ($limited[0] === 'h' ? 'this hour' : 'today') . '.', 'rate_limited', ['Retry-After: ' . $limited[1]]);
$limited = tts_take('global', ['d' => $cfg['tts_global_day']], $chars, $cfg);
if ($limited) tts_error(429, 'The studio voices are used up for today.', 'site_allowance_used', ['Retry-After: ' . $limited[1]]);

$status = 0;
$ch = curl_init($cfg['tts_upstream'] . '?model=' . rawurlencode($model) . '&encoding=mp3');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['text' => $text]),
  CURLOPT_HTTPHEADER => ['Authorization: Token ' . $cfg['deepgram_key'], 'Content-Type: application/json', 'Accept: audio/mpeg'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_FOLLOWLOCATION => false,
]);
set_time_limit(40);
$audio = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
unset($ch);

if ($audio === false || $status === 0) {
  error_log('tts-proxy: cannot reach Deepgram: ' . $curlError);
  tts_error(502, 'The studio voices could not be reached.', 'upstream_unreachable');
}
if ($status !== 200 || stripos($type, 'audio/') !== 0 || strlen($audio) < 100) {
  // Deepgram's own message goes to the server log, never to the visitor.
  error_log('tts-proxy: Deepgram answered ' . $status . ': ' . substr(str_replace($cfg['deepgram_key'], '[key]', preg_replace('/\s+/', ' ', (string) $audio)), 0, 300));
  if ($status === 401 || $status === 403) tts_error(503, 'The studio voices key is not accepted.', 'site_key_rejected');
  if ($status === 402 || $status === 429) tts_error(503, 'The studio voices are busy or used up for now.', 'site_allowance_used');
  tts_error(502, 'The studio voices could not answer (error ' . $status . ').', 'upstream_error');
}

// Save atomically, so a visitor never gets half a file.
$tmp = $cached . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, $audio) !== false) @rename($tmp, $cached);
tts_send_audio($audio, 'deepgram');
