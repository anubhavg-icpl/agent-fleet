---
type: Reference
title: Services
description: Models, ports, and secrets for each service in this fleet.
resource: https://github.com/anubhavg-icpl/agent-fleet/tree/main/spaces
tags: [services, ports, secrets]
status: stable
generated: { by: human:anubhav-gain, at: 2026-10-04T00:00:00Z }
---

# Services

Owned by [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Ports, models, and secrets below match the Dockerfiles and `deploy.py` in this
repo. Nothing here is live until you run the provisioner with your own token.
First-time commands are in [setup.md](setup.md).

Static URL shape: `https://<hf-user>-<name>.static.hf.space`
Docker URL shape: `https://<hf-user>-<name>.hf.space`

## chat — `spaces/chat/`

Static Space. Inference stays in the browser.

- Runtime: [@wllama/wllama 3.6.1](https://github.com/ngxson/wllama) inside
  `chat-worker.js`. The UI thread does not run the model.
- Weights download once from the Hugging Face CDN and stay in the browser cache.
- Conversations, the selected model, and settings persist in `localStorage`
  under `agent-fleet-chat:v1`.

| Key | Model | File | Context | Size |
|---|---|---|---|---|
| `qwen3_17b` | Qwen3 1.7B (default) | `unsloth/Qwen3-1.7B-GGUF` / `Qwen3-1.7B-Q4_K_M.gguf` | 4096 | 1.1 GB |
| `qwen3_06b` | Qwen3 0.6B | `bartowski/Qwen_Qwen3-0.6B-GGUF` / `Qwen_Qwen3-0.6B-Q4_K_M.gguf` | 2048 | 397 MB |
| `qwen25_15b` | Qwen2.5 1.5B Instruct | `bartowski/Qwen2.5-1.5B-Instruct-GGUF` / `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf` | 4096 | 1.0 GB |
| `qwen25_05b` | Qwen2.5 0.5B Instruct | `bartowski/Qwen2.5-0.5B-Instruct-GGUF` / `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf` | 2048 | 400 MB |
| `llama32_1b` | Llama 3.2 1B Instruct | `unsloth/Llama-3.2-1B-Instruct-GGUF` / `Llama-3.2-1B-Instruct-Q4_K_M.gguf` | 4096 | 808 MB |

Qwen3 and Qwen2.5 use a ChatML prompt. Qwen3 appends ` /no_think` to the latest
user turn. Llama 3.2 uses the Llama 3 header format. Stop strings are
`<|im_end|>` for Qwen and `<|eot_id|>` for Llama.

Context trim keeps the newest turns inside `n_ctx - 384 - max_tokens`, estimating
3.6 characters per token. Defaults: temperature `0.7`, max tokens `768`, top-p `0.9`.

Stop kills the worker and reloads the same model from cache. Export writes a
Markdown file of the open conversation. The app is a PWA (`manifest.webmanifest`).

## agent-hub — `spaces/agent-hub/`

Static Space. `deploy.py` copies `docs/index.html` onto
`spaces/agent-hub/index.html` before upload, so the page you edit for the
dashboard is `docs/index.html`.

The page names Anubhav Gain and links this repository. It does not link
Edge Arena, AI Lab, or the Inference Index.

## n8n — `spaces/n8n/`

Image `n8nio/n8n:latest`. Listens on `0.0.0.0:7860`.

`deploy.py` sets:

- secret `N8N_ENCRYPTION_KEY` — 32-byte hex, generated once
- variable `WEBHOOK_URL` — `https://<hf-user>-n8n.hf.space/`

The image also sets `N8N_SECURE_COOKIE=false` and `N8N_PROXY_HOPS=1` so login
works behind the Space proxy.

First visit creates the owner account in the UI. This repo does not pre-create
that user. Workflows sit in SQLite inside the container. Download them from the
UI if you need a copy that survives a rebuild.

## local-chat — `spaces/local-chat/`

Image `ghcr.io/open-webui/open-webui:main` plus the Ollama CPU binary.
`supervisord` runs both. `PORT=8080`. The Space card must keep `app_port: 8080`.

Baked at build time, from the Dockerfile:

- `llama3.2:1b`
- `qwen2.5:0.5b`
- `nomic-embed-text`

`WEBUI_AUTH=true`. The first account to sign up is the admin. `deploy.py` injects
`WEBUI_SECRET_KEY` only. It does not create the user.

Open WebUI's OpenAI-compatible routes, once you have an API key from
Settings → Account:

```text
GET  https://<hf-user>-local-chat.hf.space/api/models
POST https://<hf-user>-local-chat.hf.space/api/chat/completions
Authorization: Bearer <open-webui api key>
```

Ollama itself listens on `127.0.0.1:11434` inside the container. Other services
reach the models through Open WebUI, not through that loopback port.

## openmuse — `spaces/openmuse/`

One container, three processes, public port 7860:

| Process | Bind | Role |
|---|---|---|
| nginx | 7860 | Expo web export, and `/api/` proxied to the API, including WebSockets |
| OpenMuse API | 127.0.0.1:8787 | Hono server, PGlite, task worker |
| Browser worker | 127.0.0.1:8790 | Playwright Chromium as user `pwuser` |

`deploy.py` injects `OPENMUSE_ACCESS_KEY` (28 chars), `TOKEN_ENCRYPTION_KEY`
(32 random bytes, base64), and `WORKER_TOKEN` (36 chars). It also writes
placeholders:

- `CPK_INTELLIGENCE_API_KEY=SET_ME`
- `OPENAI_API_KEY=SET_ME`

Replace both in the Space's secrets before the API will do real work. A
CopilotKit project key comes from `npx copilotkit@latest login` and
`npx copilotkit@latest project select`. Default model in the Dockerfile is
`openai/gpt-5`. Change `MODEL` there if you want a different id.

The image clones [CopilotKit/openmuse](https://github.com/CopilotKit/openmuse)
at build time. `ARG PUBLIC_URL` is inlined into the web bundle. This fork sets
that argument, `PUBLIC_API_URL`, and `ALLOWED_ORIGINS` to
`https://anubhavg-icpl-openmuse.hf.space`. If `deploy.py` prints a different
Hugging Face username, change all three before `py -3 deploy.py --docker`.

Gmail and Calendar need your own `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
Callback: `https://<hf-user>-openmuse.hf.space/api/google/callback`.

Data directory inside the container: `/data/openmuse` and `/data/browser-profiles`.

## flowise — `spaces/flowise/`

`npm install -g flowise@latest` on `node:20-alpine`. `PORT=7860`.

Secrets from `deploy.py`:

- `FLOWISE_USERNAME` — `fleet-admin` on first generation
- `FLOWISE_PASSWORD` — 18-character alphanumeric

Chatflows are stored on the container filesystem. A flow's HTTP endpoint is
`POST /api/v1/prediction/{id}`.

## langflow — `spaces/langflow/`

Image `langflowai/langflow:latest`. `LANGFLOW_HOST=0.0.0.0`, `LANGFLOW_PORT=7860`,
`LANGFLOW_AUTO_LOGIN=false`.

Secret: `LANGFLOW_SUPERUSER_PASSWORD` (18-character alphanumeric). The image
creates the superuser `langflow` on first boot. Run endpoint:
`POST /api/v1/run/{flow_id}`.

## anythingllm — `spaces/anythingllm/`

Image `mintplexlabs/anythingllm:latest`. `SERVER_PORT=3001`. Storage dir
`/app/worker/storage`. No secrets are injected.

The setup wizard creates the admin and the LLM provider. For a stack that stays
inside this fleet, point it at the `local-chat` OpenAI-compatible endpoint.
Upstream project: [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm).

## lobechat — `spaces/lobechat/`

Image `lobehub/lobe-chat:latest`. `PORT=3210`.

Secret: `ACCESS_CODE` (16-character alphanumeric). Provider keys entered in
Settings → Key Vault stay in the browser. Conversations stay in `localStorage`.
