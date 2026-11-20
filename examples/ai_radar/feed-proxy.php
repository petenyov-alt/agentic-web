<?php
// Same-origin feed reader for AI Radar on PHP hosting (e.g. DonWeb Apache).
// The scanner tries ./feed-proxy.php?url=... first; on hosts without PHP the request
// fails and it falls back to public CORS proxies. Only the news feeds below can be read,
// plus the prompt and skill directories, so this is not an open proxy:
//   - HTTPS only, on the standard port, to a host on the list; a redirect is followed only
//     to another host on the list;
//   - only for this site's own pages, and a limited number of fresh fetches per visitor;
//   - the answer is plain text that a browser never runs (the page reads it with
//     response.text() or .json()), so a hostile feed cannot run script on this site.
// Responses are cached on disk for 15 minutes.

$ALLOWED_HOSTS = [
  'openai.com', 'deepmind.google', 'blog.google', 'huggingface.co', 'the-decoder.com',
  'techcrunch.com', 'github.com', 'hn.algolia.com', 'registry.modelcontextprotocol.io',
  'simonwillison.net', 'devpost.com', 'raw.githubusercontent.com', 'www.bing.com', 'rss.arxiv.org',
  'genai.owasp.org', 'embracethered.com', 'api.github.com',
  'www.theverge.com', 'arstechnica.com', 'www.wired.com', 'www.technologyreview.com', 'www.marktechpost.com',
  'mistral.ai', 'blogs.nvidia.com', 'github.blog', 'aws.amazon.com', 'news.mit.edu', 'importai.substack.com',
  'www.latent.space', 'lastweekin.ai', 'www.producthunt.com', 'mshibanami.github.io', 'openrouter.ai',
  // Prompt and skill directories searched by js/finder.js.
  'prompts.chat', 'skills.sh', 'skillsmp.com', 'export.arxiv.org',
];
$CACHE_SECONDS = 900;
$MAX_BYTES = 3000000;
$FETCHES_PER_IP_HOUR = 400;   // fresh fetches (not cached) per visitor; a page load makes about 40
ini_set('display_errors', '0');

function fail($code, $message) {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  exit($message);
}

/** An address this proxy may read: HTTPS, a listed host, no port or password. */
function allowed_url(string $url, array $hosts): ?array {
  $parts = parse_url($url);
  if (!$parts || ($parts['scheme'] ?? '') !== 'https' || isset($parts['port']) || isset($parts['user']) || isset($parts['pass'])) return null;
  return in_array(strtolower($parts['host'] ?? ''), $hosts, true) ? $parts : null;
}

/** Where the cache and the counters live: above the web folder when possible. */
function state_dir(): string {
  $root = !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/../ai-radar-state' : '';
  foreach ([getenv('AI_RADAR_STATE_DIR') ?: '', $root, __DIR__ . '/../ai-radar-state'] as $place) {
    if ($place !== '' && (is_dir($place) || @mkdir($place, 0700, true)) && is_writable($place)) return $place;
  }
  return sys_get_temp_dir() . '/ai-radar-llm';
}

/** Count one fresh fetch for this visitor; false when their hour's share is used. */
function take_fetch(string $dir, int $limit): bool {
  $file = @fopen($dir . '/feeds-ip-' . sha1((string) ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json', 'c+');
  if (!$file) return false;
  flock($file, LOCK_EX);
  $state = json_decode((string) stream_get_contents($file), true);
  $hour = gmdate('YmdH');
  $n = (is_array($state) && ($state['h'] ?? '') === $hour) ? (int) $state['n'] : 0;
  $ok = $n < $limit;
  if ($ok) { ftruncate($file, 0); rewind($file); fwrite($file, json_encode(['h' => $hour, 'n' => $n + 1])); fflush($file); }
  flock($file, LOCK_UN);
  fclose($file);
  return $ok;
}

// Only this site's own pages: a browser says where a request comes from.
$site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if (($site !== '' && $site !== 'same-origin') || ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '')) !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')))) {
  fail(403, 'This reader answers only the pages of this site.');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') fail(405, 'Use GET.');

$url = isset($_GET['url']) ? (string) $_GET['url'] : '';
$parts = allowed_url($url, $ALLOWED_HOSTS);
if (!$parts) fail(400, 'Feed not allowed.');

$dir = state_dir();
$cacheDir = $dir . '/feeds';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0700, true);
$cacheFile = $cacheDir . '/' . sha1($url);

if (is_file($cacheFile) && time() - filemtime($cacheFile) < $CACHE_SECONDS) {
  $body = (string) file_get_contents($cacheFile);
} else {
  if (!take_fetch($dir, $FETCHES_PER_IP_HOUR)) fail(429, 'Too many feeds for now.');
  $body = false;
  $status = 0;
  // Each redirect is checked like the first address, so a listed host cannot send us elsewhere.
  for ($hop = 0; $hop < 4; $hop++) {
    $data = '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_FOLLOWLOCATION => false,
      CURLOPT_CONNECTTIMEOUT => 5,
      // arXiv's search API often takes 10-15 seconds.
      CURLOPT_TIMEOUT => ($parts['host'] === 'export.arxiv.org') ? 16 : 8,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; AIRadar/1.0; +feed reader)',
      CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
      CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$data, $MAX_BYTES) {
        $data .= $chunk;
        return strlen($data) > $MAX_BYTES ? 0 : strlen($chunk);   // 0 stops a feed that is too large
      },
    ]);
    $ok = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $next = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
    if ($status >= 300 && $status < 400 && $next !== '') {
      $parts = allowed_url($next, $ALLOWED_HOSTS);
      if (!$parts) fail(502, 'Feed unavailable.');
      $url = $next;
      continue;
    }
    $body = $ok ? $data : false;
    break;
  }
  if ($body === false || $status < 200 || $status >= 300 || strlen($body) > $MAX_BYTES) fail(502, 'Feed unavailable.');
  // Written to a temporary file first, so a visitor never reads half a feed.
  $tmp = $cacheFile . '.' . getmypid() . '.tmp';
  if (@file_put_contents($tmp, $body) !== false) @rename($tmp, $cacheFile);
}

header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; sandbox");
header('Cache-Control: private, max-age=300');
echo $body;
