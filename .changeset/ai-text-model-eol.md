---
"louise-toolkit": patch
---

Fix the AI editorial assists (SEO suggest + toolbar rewrite), which had gone dead: the default Workers AI text model `@cf/meta/llama-3.1-8b-instruct` was retired by Cloudflare (EOL 2026-05-30), so every `runAi` call threw and — because the helpers degrade to `null` — surfaced as a 502 "unavailable" with no other signal. `DEFAULT_TEXT_MODEL` is bumped to the current `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. (`suggestSeo`/`rewriteText` still take a per-call `model` override, so a site can pin its own.) The alt-text vision model (`@cf/llava-hf/llava-1.5-7b-hf`) and embedding model (`@cf/baai/bge-base-en-v1.5`) were audited and remain current — unchanged.
