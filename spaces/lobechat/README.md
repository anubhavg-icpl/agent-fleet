---
title: LobeChat — Chat UI & Agent Marketplace
emoji: 💬
colorFrom: indigo
colorTo: pink
sdk: docker
app_port: 3210
pinned: true
---

# LobeChat

Chat UI for [anubhavg-icpl/agent-fleet](https://github.com/anubhavg-icpl/agent-fleet).
Image `lobehub/lobe-chat:latest`, port 3210.

The Space asks for `ACCESS_CODE` on entry. `deploy.py` generates it
(16 characters) and stores it as `lobechat_access_code` in
`state/agent-fleet-credentials.json`.

Add provider keys in Settings → Key Vault. Those keys stay in the browser.
Conversations stay in `localStorage`.

Source: <https://github.com/lobehub/lobe-chat>
