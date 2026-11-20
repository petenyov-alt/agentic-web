<?php
// The key of the site's own AI (llm-proxy.php in examples/ai_radar).
//
// On your own computer, copy this file to examples/ai-radar-secret.php (one folder ABOVE
// examples/ai_radar). On the server, put it one folder above the web folder, for example
// above public_html. Never put it inside the web folder, and never commit it.
//
// Only 'key' is needed. The rest are the defaults, shown so you can change them.
return [
  'key' => 'PASTE_THE_OTARI_KEY_HERE',          // starts with otk_
  'model' => 'alibaba/qwen3.8-flash',           // fast; alibaba/qwen-3.5-35b-a3b also works but is slow
  'per_ip_hour' => 60,                          // requests per visitor per hour
  'per_ip_day' => 250,                          // requests per visitor per day
  'global_day' => 1500,                         // requests per day for the whole site
  // 'enabled' => false,                        // switches the site's AI off at once

  // The anchors' studio voices (tts-proxy.php). Leave it as it is to use the browser's voices.
  'deepgram_key' => 'PASTE_THE_DEEPGRAM_KEY_HERE',
  'tts_global_day' => 100000,                   // characters a day for the whole site (about $3)
  // 'tts_enabled' => false,                    // switches the studio voices off at once

  // The news editor (editor.php): an AI that decides what goes on air and how it is said.
  // It asks, in order, each provider that has a key: Google AI Studio, Groq, OpenRouter, Otari.
  // Google AI Studio (aistudio.google.com, Get API key): Gemini Flash-Lite on the site's own quota.
  'google_ai_key' => 'PASTE_THE_GOOGLE_AI_STUDIO_KEY_HERE',
  // 'editor_google_model' => 'gemini-3.1-flash-lite',
  // Groq (console.groq.com, API Keys): the editor's backup, and the chat's when Otari cannot answer.
  'groq_key' => 'PASTE_THE_GROQ_KEY_HERE',
  // 'editor_groq_model' => 'openai/gpt-oss-120b',   // the editor's model on Groq
  // 'groq_model' => 'openai/gpt-oss-120b',          // the chat's model on Groq (llm-proxy.php)
  // A free OpenRouter key runs google/gemma-4-31b-it:free.
  'openrouter_key' => 'PASTE_THE_OPENROUTER_KEY_HERE',
  // 'editor_backup_models' => ['nvidia/nemotron-3.5-super-vl:free'],  // when free Gemma is busy
  // 'editor_fallback_model' => 'alibaba/qwen3.8-flash',               // the editor's model on Otari
  // 'editor_global_day' => 45,                 // model calls a day (free models allow 50)
  // 'editor_enabled' => false,                 // switches the editor off at once
];
