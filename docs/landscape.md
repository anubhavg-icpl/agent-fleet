---
type: Reference
title: Landscape
description: Which agent platforms this repo packages, and which it leaves out.
resource: https://github.com/anubhavg-icpl/agent-fleet
tags: [landscape, agents]
status: stable
generated: { by: human:anubhav-gain, at: 2026-10-04T00:00:00Z }
---

# Landscape

What [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet)
packages, and what it leaves out. Status means "in this repository", not
"serving traffic". Traffic starts when `deploy.py` succeeds with an
anubhavg-icpl token.

## Packaged here

| Platform | Kind | In this repo | Bring-up |
|---|---|---|---|
| wllama / llama.cpp WASM | In-browser chat | `spaces/chat/` | `py -3 deploy.py` |
| Fleet dashboard | Static hub | `docs/index.html` → `spaces/agent-hub/` | `py -3 deploy.py` |
| n8n | Workflows and agent nodes | `spaces/n8n/` | `py -3 deploy.py --docker` and Hugging Face PRO |
| Open WebUI + Ollama | Chat, RAG, OpenAI-compatible API | `spaces/local-chat/` | same |
| OpenMuse | Personal agent: browser, terminal, files | `spaces/openmuse/` | same, after the public URL in the Dockerfile is yours |
| Flowise | Visual agent builder | `spaces/flowise/` | same |
| Langflow | Visual agent builder | `spaces/langflow/` | same |
| AnythingLLM | RAG workspace | `spaces/anythingllm/` | same |
| LobeChat | Chat UI and agent catalog | `spaces/lobechat/` | same |

CrewAI, AutoGen, LangGraph, and smolagents are libraries. They are not Spaces
in this repo. A workflow that needs them runs inside n8n or a Flowise code node.

## Not in this repo

| Name | Why it is not part of this fleet |
|---|---|
| Edge Arena | No `spaces/edge-arena/` directory. `deploy.py` will not create it. |
| AI Lab | No `spaces/ai-lab/`. transformers.js code is not in this tree. |
| Inference Index | No `spaces/inference/`. |

The hub does not link them.

## Not packaged, and why

| Platform | Why it is not a Space in this repo |
|---|---|
| Dify | API, web, worker, Redis, Postgres, and a sandbox. Needs Compose. |
| OpenHands | Sandbox expects Docker-in-Docker. |
| AutoGPT | Platform expects Postgres, Redis, and Meilisearch. |
| LibreChat | Expects MongoDB beside the app. |
| Letta | Current app is local-first, not this Docker layout. |
| AgentGPT | Archived upstream. |
| SuperAGI, BabyAGI, TaskWeaver, Devika | Not maintained as a single Space we can pin. |

## How this fork chooses

Static Spaces deploy on a free Hugging Face account. `deploy.py` creates `chat`
and `agent-hub` that way.

Docker Spaces on free hardware return HTTP 402. The provisioner catches that,
skips the service, and tells you to attach PRO. The seven Docker folders stay
in git so one `--docker` run publishes them after the subscription is on the
anubhavg-icpl account.

A service lands in `spaces/` only when one container, started by one Dockerfile,
can serve it on the port declared in that folder's README.
