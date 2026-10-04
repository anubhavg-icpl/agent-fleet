---
title: Chat — Local AI in Your Browser
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: static
pinned: true
short_description: Real AI chat, 100% in-browser — llama.cpp WASM, zero servers
type: Hugging Face Space
description: In-browser llama.cpp chat. Five GGUF models, no server.
---

# Chat — local AI in the browser

In-browser chat from [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
The model runs in a Web Worker via wllama 3.6.1. No API key, no chat server.

Five Q4_K_M GGUF models, downloaded once from the Hugging Face CDN:

- Qwen3 1.7B (default) and Qwen3 0.6B
- Qwen2.5 1.5B Instruct and Qwen2.5 0.5B Instruct
- Llama 3.2 1B Instruct

Streaming, stop, regenerate, conversations in `localStorage`, system prompt,
temperature and max tokens, Markdown export, installable PWA.

Hosted page: <https://anubhavg-icpl.github.io/agent-fleet/chat/>.
Source: [spaces/chat](https://github.com/anubhavg-icpl/agent-fleet/tree/main/spaces/chat).
Service notes: [docs/services.md](https://github.com/anubhavg-icpl/agent-fleet/blob/main/docs/services.md).
Setup: [docs/setup.md](https://github.com/anubhavg-icpl/agent-fleet/blob/main/docs/setup.md).
