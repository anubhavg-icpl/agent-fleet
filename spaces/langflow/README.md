---
title: Langflow — Visual Agent & Workflow Builder
emoji: 🌊
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: true
---

# Langflow

Visual builder for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Image `langflowai/langflow:latest`, port 7860, `LANGFLOW_AUTO_LOGIN=false`.

## Sign in

- User: `langflow` (created on first boot)
- Password: Space secret `LANGFLOW_SUPERUSER_PASSWORD`
  (`langflow_superuser_password` in `state/agent-fleet-credentials.json`)

Each flow exposes `POST /api/v1/run/{flow_id}` from the API endpoint tab.

Flows are SQLite inside the container. Export JSON if you need them after a
rebuild. Change the superuser password in the UI if you do not want to keep
using the generated one. If you do that, the credentials file will be stale
until you update it by hand. A later `deploy.py --docker` run pushes the file's
value back into the Space secret.

Source: <https://github.com/langflow-ai/langflow>
