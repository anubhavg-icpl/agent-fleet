---
type: Playbook
title: Operations
description: Update the fleet, keep data, and add a service.
resource: https://github.com/anubhavg-icpl/agent-fleet/blob/main/deploy.py
tags: [operations, deploy]
status: stable
generated: { by: human:anubhav-gain, at: 2026-10-04T00:00:00Z }
---

# Operations

Commands assume the checkout is [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet)
and the shell is PowerShell. `deploy.py` is idempotent: a second run uploads the
current tree and writes the same secrets again.

First-time setup, including the local chat server, is in [setup.md](setup.md).

## 1. Put the token next to the repo

`STATE_DIR` is `state/` inside this checkout. The token is read when the
script starts, after argument parsing. `--help` does not need the file.

```powershell
py -3 -m pip install huggingface_hub
New-Item -ItemType Directory -Force state | Out-Null
Set-Content -Path state\hf_token -Value "hf_..." -NoNewline
```

The token needs permission to create and write Spaces on the anubhavg-icpl
Hugging Face account. `state/` matches `.gitignore`, and so does the filename
`hf_token` (`*_token`).

`--status` needs the token too. `whoami()` is how the script learns the owner
segment of every URL.

## 2. Names already set on this fork

The hub and the chat name Anubhav Gain and link to
`github.com/anubhavg-icpl/agent-fleet`. OpenMuse's `PUBLIC_URL`,
`PUBLIC_API_URL`, and `ALLOWED_ORIGINS` are
`https://anubhavg-icpl-openmuse.hf.space`.

`deploy.py` prints the Hugging Face username of the token. If that name is not
`anubhavg-icpl`, change those three Dockerfile values to
`https://<hf-user>-openmuse.hf.space` before `py -3 deploy.py --docker`.
The web bundle inlines `PUBLIC_URL` at image build time.

`deploy.py` copies `docs/index.html` over `spaces/agent-hub/index.html` on every
static deploy. Editing only the copy under `spaces/agent-hub/` does not stick.

## 3. Provision

```powershell
py -3 deploy.py            # chat + agent-hub
py -3 deploy.py --docker   # those two, then the seven Docker Spaces
py -3 deploy.py --status   # poll the static URLs only
```

Docker create calls that return HTTP 402 are skipped. The rest of the run
continues. PRO is required for Docker Spaces on Hugging Face's free hardware:
<https://huggingface.co/pro>.

After a successful static deploy the script prints:

```text
LIVE    chat         https://<hf-user>-chat.static.hf.space
LIVE    agent-hub    https://<hf-user>-agent-hub.static.hf.space
```

`http` under 500 counts as up. Docker services are not polled.

Credentials are written to `state/agent-fleet-credentials.json` on any run that
is not `--status`, including a static-only run. Keys are created once and reused.

## 4. Update

| Change | Command | What happens |
|---|---|---|
| `spaces/chat/` or `docs/index.html` | `py -3 deploy.py` | Static upload. The hub HTML is refreshed from `docs/index.html`. |
| Any `spaces/<docker-service>/` | `py -3 deploy.py --docker` | Folder upload, then secrets and variables are set again. The Space rebuilds. |
| A pinned image | Edit the `FROM` tag, then `--docker` | `latest` is what the Dockerfiles use today. |

`local-chat` and `openmuse` rebuilds are the long ones. Both do heavy work in
the image build (`ollama pull`, a full OpenMuse `pnpm` build).

## 5. Add a service

1. `spaces/<name>/README.md` with Hugging Face front matter. Docker cards need
   `sdk: docker` and `app_port` equal to the port the process binds. Keep that
   filename as `README.md`. Add `type` and `description` in the same YAML block.
   Do not add an OKF `tags` list there. Hugging Face uses `tags` as Space tags.
2. `spaces/<name>/Dockerfile` listening on `0.0.0.0` at that port.
3. An entry in `build_docker_fleet()` if the service needs secrets or variables.
4. `py -3 deploy.py --docker`.

Static services belong in `build_static_fleet()` instead, and use `sdk: static`.

## 6. Data

| Service | Stored | Survives a Space rebuild |
|---|---|---|
| chat | Browser cache and `localStorage` | Yes, on that browser |
| lobechat | Browser `localStorage` | Yes, on that browser |
| n8n | SQLite in the container | No. Download workflows from the UI. |
| flowise, langflow | Container filesystem | No. Export the flow JSON. |
| anythingllm | `/app/worker/storage` | No. Export workspaces from Settings. |
| local-chat | `/app/backend/data` | No. |
| openmuse | `/data/openmuse`, `/data/browser-profiles` | No. |

Hugging Face persistent storage, attached in the Space settings, is the way to
keep those directories. The apps already write to the paths above.

## 7. Wake a sleeping Space

Free Spaces sleep after a stretch with no HTTP traffic. A static Space wakes on
the next request. A Docker Space wakes by starting the container again.

```powershell
Invoke-WebRequest -UseBasicParsing https://<hf-user>-chat.static.hf.space | Out-Null
Invoke-WebRequest -UseBasicParsing https://<hf-user>-n8n.hf.space/healthz | Out-Null
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| Exit: missing `state\hf_token` | The token file is absent or empty. |
| `401` from the Hub API | Token is invalid or lacks write access to this user's Spaces. |
| `402` printed, service skipped | Docker Spaces need PRO. Static deploy is unaffected. |
| Static site 404 on `https://<user>-<name>.hf.space` | Static Spaces use the `.static.hf.space` host. The bare host is for Docker. |
| OpenMuse UI calls another host | `PUBLIC_URL` does not match the Space URL from `whoami()`. Change the Dockerfile and rebuild. |
| OpenMuse API never becomes useful | `CPK_INTELLIGENCE_API_KEY` or `OPENAI_API_KEY` is still `SET_ME`. |
| `BUILD_ERROR` in Space logs | Read the build log. A Docker Hub rate limit clears by retrying later. An upstream tag that moved needs a pin in the Dockerfile. |

# Examples

Poll the two static URLs after a deploy:

```powershell
py -3 deploy.py --status
```
