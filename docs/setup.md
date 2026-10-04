---
type: Playbook
title: Setup
description: Run Anubhav Gain's chat on this machine, then publish the fleet.
resource: https://github.com/anubhavg-icpl/agent-fleet/blob/main/deploy.py
tags: [setup, deploy, chat]
status: stable
generated: { by: human:anubhav-gain, at: 2026-10-04T00:00:00Z }
---

# Setup

Commands are PowerShell, from the repo root. Python 3 is already on this machine.

## Run the chat on this machine

The page loads `app.js` as a module, so opening the file directly does not work.
Serve the folder:

```powershell
py -3 -m http.server 8000 --directory spaces/chat
```

Open <http://127.0.0.1:8000>. The sidebar reads Anubhav Gain. Pick a model.
The first download is about 400 MB to 1.1 GB from the Hugging Face CDN, then
the browser cache holds the weights. Nothing in that chat is sent to a server
you run.

Stop the server with Ctrl+C. This does not publish anything.

## Publish the static fleet

You need a Hugging Face token that can create and write Spaces. Create one at
<https://huggingface.co/settings/tokens>.

```powershell
py -3 -m pip install huggingface_hub
New-Item -ItemType Directory -Force state | Out-Null
Set-Content -Path state\hf_token -Value "hf_..." -NoNewline
py -3 deploy.py
```

`deploy.py` reads `state/hf_token` when it starts. It does not read an
`HF_TOKEN` environment variable. `state/` is gitignored.

The script prints the owner from `whoami()`, then:

```text
LIVE    chat         https://<hf-user>-chat.static.hf.space
LIVE    agent-hub    https://<hf-user>-agent-hub.static.hf.space
```

An `http` code under 500 counts as up. Static Spaces are free.

`py -3 deploy.py --status` only polls those two URLs. It still needs the token file.

## Publish the Docker fleet

Docker Spaces need [Hugging Face PRO](https://huggingface.co/pro). Without it,
create calls return HTTP 402, the script skips that service, and the rest of
the run continues.

```powershell
py -3 deploy.py --docker
```

That also uploads chat and the hub. A Docker URL looks like
`https://<hf-user>-<name>.hf.space`. The script does not poll Docker URLs.

OpenMuse is built with `https://anubhavg-icpl-openmuse.hf.space` in
`PUBLIC_URL`, `PUBLIC_API_URL`, and `ALLOWED_ORIGINS`. If the printed owner is
not `anubhavg-icpl`, change those three values in `spaces/openmuse/Dockerfile`
before this command. The web bundle inlines `PUBLIC_URL` at image build.

After OpenMuse exists, replace these Space secrets and restart the Space:

1. `CPK_INTELLIGENCE_API_KEY` from `npx copilotkit@latest login` and `npx copilotkit@latest project select`.
2. `OPENAI_API_KEY` for the default model `openai/gpt-5`.

## First login

Generated values are in `state/agent-fleet-credentials.json`. The file is
written on any run that is not `--status`. Keys are created once and reused.

| Service | How you get in |
|---|---|
| chat, hub | No account. |
| n8n | First visit creates the owner. |
| local-chat | First signup is the admin. Turn off open signup after that. |
| flowise | User `fleet-admin`, password `flowise_password`. |
| langflow | User `langflow`, password `langflow_superuser_password`. |
| lobechat | Access code `lobechat_access_code`. |
| anythingllm | Finish the wizard before you share the URL. |
| openmuse | Access key `openmuse_access_key`. |

Ports, models, and the rest of the secrets are in [services.md](services.md).
Day-to-day updates are in [operations.md](operations.md).

# Examples

Serve only the chat:

```powershell
py -3 -m http.server 8000 --directory spaces/chat
```

Publish chat and the hub, and leave Docker alone:

```powershell
py -3 deploy.py
```
