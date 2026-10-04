---
title: Local Chat — Zero-Config AI (Open WebUI + Ollama)
emoji: 🤖
colorFrom: red
colorTo: orange
sdk: docker
app_port: 8080
pinned: true
---

# Local Chat — Open WebUI + Ollama

Docker Space for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
`app_port` is **8080**, matching `PORT` in the Dockerfile.

supervisord runs Ollama and Open WebUI. These models are pulled during the
image build:

- `llama3.2:1b`
- `qwen2.5:0.5b`
- `nomic-embed-text`

## First run

1. Open the Space URL and create an account. The first account is the admin.
2. Pick a baked model and chat. Upload documents for RAG.
3. Disable open signup after the admin exists.

`deploy.py` injects `WEBUI_SECRET_KEY` only.

## OpenAI-compatible API

```text
GET  https://<hf-user>-local-chat.hf.space/api/models
POST https://<hf-user>-local-chat.hf.space/api/chat/completions
Authorization: Bearer <key from Settings → Account>
```

n8n, Flowise, and AnythingLLM in this fleet can use that base URL. Ollama's
own port (`127.0.0.1:11434`) is not reachable from outside the container.

Users and chats are stored under `/app/backend/data` and disappear on rebuild
unless the Space has persistent storage.

Sources: <https://github.com/open-webui/open-webui> · <https://ollama.com>
