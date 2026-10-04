---
title: n8n — Workflow Automation & AI Agents
emoji: 🔁
colorFrom: purple
colorTo: gray
sdk: docker
app_port: 7860
pinned: true
type: Hugging Face Space
description: Workflow automation. The owner account is created on first visit.
---

# n8n

Workflow automation for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Image `n8nio/n8n:latest`, port 7860.

## First run

1. Open the Space URL.
2. Create the owner account in the UI. This image does not ship a pre-made user.
3. Build workflows. For a model hosted by this fleet, point an OpenAI-compatible
   credential at `local-chat` (`/api/chat/completions`) and use an Open WebUI API key.

## Wired by deploy.py

- Secret `N8N_ENCRYPTION_KEY` so saved credentials can be decrypted after a restart.
- Variable `WEBHOOK_URL` = `https://<hf-user>-n8n.hf.space/`.
- Production webhook path: `https://<hf-user>-n8n.hf.space/webhook/<path>`.

`N8N_SECURE_COOKIE=false` and `N8N_PROXY_HOPS=1` are set in the Dockerfile so
login works behind the Hugging Face proxy.

Workflows live in container SQLite. Download them from the UI. A rebuild without
persistent storage drops them. The encryption key does not live in the container,
so a new key cannot read old credentials. Keep `state/agent-fleet-credentials.json`.

Docs: <https://docs.n8n.io/hosting/installation/docker/>
