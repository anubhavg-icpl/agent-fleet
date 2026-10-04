---
title: Flowise — Visual LLM Agent Builder
emoji: 🧩
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: true
---

# Flowise

Visual builder for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Installed as `flowise@latest` on Node 20. Port 7860.

## Sign in

Basic auth comes from Space secrets written by `deploy.py`:

- `FLOWISE_USERNAME` — `fleet-admin` the first time it is generated
- `FLOWISE_PASSWORD` — see `flowise_password` in `state/agent-fleet-credentials.json`

## Use

Build a chatflow and call it with `POST /api/v1/prediction/{id}`. LLM nodes can
use a hosted provider or the fleet's `local-chat` OpenAI-compatible endpoint.

Chatflows sit on the container filesystem. Export them from the UI. Set
`FLOWISE_API_KEY` in the Flowise settings if you want Bearer auth on the
prediction routes.

Source: <https://github.com/FlowiseAI/Flowise>
