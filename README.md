# agent-fleet

Browser-side inference and a staged Docker agent stack, operated from
[anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).

This repository is a fork of [mranv/agent-fleet](https://github.com/mranv/agent-fleet).
The tree you deploy is this one. Spaces are created under the Hugging Face user
that owns the token in `deploy.py`, which for this fork is **anubhavg-icpl**.

## What is in this repo

| Path | SDK | Port | What it is |
|---|---|---|---|
| `spaces/chat/` | static | — | In-browser chat. llama.cpp via wllama 3.6.1 in a Web Worker. Five GGUF models. |
| `spaces/agent-hub/` | static | — | Fleet dashboard. On deploy, `deploy.py` overwrites `index.html` with `docs/index.html`. |
| `spaces/n8n/` | docker | 7860 | n8n. Encryption key and `WEBHOOK_URL` injected by `deploy.py`. |
| `spaces/local-chat/` | docker | 8080 | Open WebUI + Ollama. `llama3.2:1b`, `qwen2.5:0.5b`, `nomic-embed-text` pulled at image build. |
| `spaces/openmuse/` | docker | 7860 | CopilotKit OpenMuse: nginx, API, task worker, Playwright browser worker. |
| `spaces/flowise/` | docker | 7860 | Flowise. Basic auth from generated secrets. |
| `spaces/langflow/` | docker | 7860 | Langflow. Superuser password from a generated secret. |
| `spaces/anythingllm/` | docker | 3001 | AnythingLLM. First-run wizard creates the admin. |
| `spaces/lobechat/` | docker | 3210 | LobeChat. Access code from a generated secret. |

`deploy.py` is the provisioner. It creates the Spaces, uploads each folder, writes
Docker secrets, and polls the two static URLs.

## What is not in this repo

`docs/index.html` still links three upstream pages: Edge Arena, AI Lab, and the
Inference Index, on the `yeeeeezus` Hugging Face account. Their source is not in
this fork. They are not created by `deploy.py`. Treat them as outside this fleet
until their code lives under `spaces/`.

The chat title, the hub page, and the OpenMuse public URL in
`spaces/openmuse/Dockerfile` still name that upstream account. Retarget those
before you publish. Steps are in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Deploy

`deploy.py` reads the token at import time. It does not read `HF_TOKEN` from the
environment. Point `STATE_DIR` at a folder you own, then put the token in a file
named `hf_token` inside it.

```python
STATE_DIR = Path(__file__).resolve().parent / "state"
```

`state/` is gitignored.

```powershell
py -3 -m pip install huggingface_hub
New-Item -ItemType Directory -Force state | Out-Null
Set-Content -Path state\hf_token -Value "hf_..." -NoNewline
py -3 deploy.py
py -3 deploy.py --docker
py -3 deploy.py --status
```

Static Spaces come up on the free tier:

`https://<hf-user>-chat.static.hf.space`
`https://<hf-user>-agent-hub.static.hf.space`

Docker Spaces need a [Hugging Face PRO](https://huggingface.co/pro) subscription.
On HTTP 402, `deploy.py` skips that service and keeps going. With a token for
`anubhavg-icpl`, a Docker space is `https://anubhavg-icpl-<name>.hf.space`.
The script prints the URL it actually used.

Generated passwords and keys land in `state/agent-fleet-credentials.json`.
That file is the only copy. Read it when you open Flowise, Langflow, LobeChat,
or OpenMuse.

## Docs

| File | Use it for |
|---|---|
| [docs/SERVICES.md](docs/SERVICES.md) | Models, ports, secrets, first run of each service |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Provision, update, OpenMuse URL, persistence, adding a service |
| [docs/SECURITY.md](docs/SECURITY.md) | Where secrets live and how each app is gated |
| [docs/LANDSCAPE.md](docs/LANDSCAPE.md) | Which agent platforms this repo packages, and which it does not |

Per-space Hugging Face cards are the `README.md` files under `spaces/`. Their
YAML front matter is what the Space runtime reads (`sdk`, `app_port`). Leave
that block intact when you edit the prose.
