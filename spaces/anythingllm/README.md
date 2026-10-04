---
title: AnythingLLM — RAG & Agent Workspace
emoji: 📚
colorFrom: yellow
colorTo: green
sdk: docker
app_port: 3001
pinned: true
type: Hugging Face Space
description: RAG workspace. The setup wizard creates the admin.
---

# AnythingLLM

RAG workspace for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Image `mintplexlabs/anythingllm:latest`, port 3001, storage at
`/app/worker/storage`.

`deploy.py` injects no secrets. The Space is public as soon as it boots, and
the setup wizard is the admin gate. Finish the wizard before you share the URL.

1. Create the admin user in the wizard.
2. Choose an LLM provider. For this fleet, use the `local-chat` OpenAI-compatible
   endpoint and an Open WebUI API key.
3. Create a workspace and upload documents.

Export workspaces from Settings. The storage directory is wiped on rebuild
unless persistent storage is attached.

Source: <https://github.com/Mintplex-Labs/anything-llm>
