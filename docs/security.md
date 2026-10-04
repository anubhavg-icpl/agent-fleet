---
type: Playbook
title: Security
description: Where secrets live and how each app is gated.
resource: https://github.com/anubhavg-icpl/agent-fleet/blob/main/deploy.py
tags: [security, secrets]
status: stable
generated: { by: human:anubhav-gain, at: 2026-10-04T00:00:00Z }
---

# Security

This repo is [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet),
Anubhav Gain. Secrets belong in `state/` on this machine and in the Hugging Face
account that owns the token.

## Where secrets live

| Secret | Where | In git |
|---|---|---|
| Hugging Face token | `state/hf_token` | No. `state/` and `*_token` are gitignored. |
| Generated service secrets | `state/agent-fleet-credentials.json` | No. Same directory. |
| Runtime copies of those secrets | Hugging Face Space secrets | No. `deploy.py` calls `add_space_secret`. |

`deploy.py` writes the credentials file with mode `0600` and never puts a
generated value in a Dockerfile `ENV` or in the uploaded tree. Placeholders are
the exception: OpenMuse receives `CPK_INTELLIGENCE_API_KEY=SET_ME` and
`OPENAI_API_KEY=SET_ME` so the container can be created. Replace them in the
Space settings. Do not commit real keys into the Dockerfile.

`.gitignore` covers a `state/` directory inside the repo. It does not cover an
absolute path outside the repo. Keeping `STATE_DIR` at `Path(__file__).parent / "state"`
is what makes the ignore rule apply.

The provisioner does not read or write a GitHub token.

## What each service exposes

Browser apps have no server secret.

| Service | Gate | Notes |
|---|---|---|
| chat | None | Model runs locally. Transcripts stay in `localStorage`. |
| agent-hub | None | Static HTML. |
| n8n | Owner account created on first visit | Credentials saved in n8n are encrypted with `N8N_ENCRYPTION_KEY`. |
| local-chat | First signup is the admin (`WEBUI_AUTH=true`) | Turn off open signup in Open WebUI after that account exists. |
| flowise | HTTP basic auth | Username `fleet-admin` unless you changed `flowise_username` in the credentials file. Password is `flowise_password`. |
| langflow | Login required | User `langflow`. Password is `langflow_superuser_password`. |
| lobechat | Access code | `lobechat_access_code`. Provider keys stay in the browser. |
| anythingllm | Wizard-created admin | No secret is injected. Set the admin in the wizard before you share the URL. |
| openmuse | `OPENMUSE_ACCESS_KEY` | Also uses `TOKEN_ENCRYPTION_KEY` and `WORKER_TOKEN`. Chromium runs as `pwuser`. |

Docker Spaces in this fleet are created with `private=False`. The URL is public.
The app gate above is what keeps strangers out. Set that gate before you share
the link. AnythingLLM has no gate until the wizard is finished, so do the wizard
immediately after the Space is healthy.

Disks on a Space without persistent storage are wiped on rebuild. A wiped disk
removes chats and flows. It does not remove Space secrets. Those stay until you
change them.

## Rotate

1. Revoke the Hugging Face token in account settings and write a new one to `state/hf_token`.
2. To rotate one generated secret, delete that key from `state/agent-fleet-credentials.json` and run `py -3 deploy.py --docker`. `gen()` only mints a value when the key is absent.
3. Restart the Space so the process reads the new secret.
4. If a key was pasted into a Dockerfile or into git, treat it as public: rotate it at the provider, then remove it from history before you push.

Deleting the whole credentials file rotates every generated secret on the next
`--docker` run. Update the passwords you have saved, because Flowise, Langflow,
LobeChat, and OpenMuse will expect the new values.

# Examples

Rotate only the Flowise password. Delete `flowise_password` from
`state/agent-fleet-credentials.json`, then:

```powershell
py -3 deploy.py --docker
```
