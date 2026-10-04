---
title: OpenMuse — Personal Agent (Browser · Terminal · Files)
emoji: 🧠
colorFrom: purple
colorTo: gray
sdk: docker
app_port: 7860
pinned: true
type: Hugging Face Space
description: Personal agent with a browser worker. The public URL is baked into the image.
---

# OpenMuse

Personal agent Space for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Upstream: [CopilotKit/openmuse](https://github.com/CopilotKit/openmuse) (MIT).

Port 7860 is nginx. It serves the Expo web export and proxies `/api/` to the
Hono API on `127.0.0.1:8787` (WebSockets included). A Playwright Chromium worker
listens on `127.0.0.1:8790` as user `pwuser`.

## Before the first build

`PUBLIC_URL`, `PUBLIC_API_URL`, and `ALLOWED_ORIGINS` are
`https://anubhavg-icpl-openmuse.hf.space`. The web bundle inlines `PUBLIC_URL`
at build time. If `deploy.py` prints a different Hugging Face username, set
all three to `https://<hf-user>-openmuse.hf.space` before the image build.

## Secrets

`deploy.py` generates `OPENMUSE_ACCESS_KEY`, `TOKEN_ENCRYPTION_KEY`, and
`WORKER_TOKEN`. Log in to the app with `OPENMUSE_ACCESS_KEY` from
`state/agent-fleet-credentials.json`.

It also stores placeholders. Replace them in the Space's secret settings and
restart:

1. `CPK_INTELLIGENCE_API_KEY` from `npx copilotkit@latest login` then `npx copilotkit@latest project select`.
2. `OPENAI_API_KEY` for the default model `openai/gpt-5` (`MODEL` in the Dockerfile).

Gmail and Calendar need `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
Callback: `https://<hf-user>-openmuse.hf.space/api/google/callback`.

Tasks and browser profiles live under `/data` and do not survive a rebuild
without persistent storage.
