# openmuse — personal agent with browser, terminal, files, and durable work
# Upstream: https://github.com/CopilotKit/openmuse (MIT)
#
# Topology in one container (render.yaml ported to HF Spaces):
#   nginx :7860  → static web UI (Expo export) + reverse-proxy /api/* → hono API :8787
#   openmuse API (node dist)      — app server + task worker (PGlite embedded postgres)
#   openmuse browser worker :8790 — Playwright Chromium (page reads, screenshots, Take control)
#
# Secrets injected at runtime as HF Space secrets:
#   OPENMUSE_ACCESS_KEY      (>=24 chars) — login gate for the web app
#   TOKEN_ENCRYPTION_KEY     (32 bytes, base64)
#   WORKER_TOKEN             (>=32 chars) — API <-> browser worker auth
#   CPK_INTELLIGENCE_API_KEY (user)       — required by the API to boot
#   OPENAI_API_KEY           (user)       — agent brain (MODEL=openai/gpt-5 default)

# ---------- build ----------
FROM node:24 AS build
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /src
RUN git clone --depth 1 https://github.com/CopilotKit/openmuse.git . \
    && pnpm install --frozen-lockfile \
    && pnpm build:server

# Web UI: EXPO_PUBLIC_API_URL is INLINED into the bundle at build time,
# so it must be the final public URL of this Space. (--clear avoids a cached
# Metro transform keeping a stale URL.)
ARG PUBLIC_URL=https://yeeeeezus-openmuse.hf.space
RUN EXPO_PUBLIC_API_URL=${PUBLIC_URL} pnpm --dir apps/mobile exec expo export --platform web --output-dir /web --clear

# Pruned production bundle for the API server.
RUN pnpm --filter=openmuse deploy --prod /deploy && cp -r dist /deploy/dist \
    || (mkdir -p /deploy && cp -r node_modules dist package.json /deploy/)

# ---------- runtime ----------
FROM node:24-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /deploy ./
COPY --from=build /web /web

# Browser worker (Playwright Chromium) — source copied from the build stage.
COPY --from=build /src/apps/worker /app/worker
RUN cd /app/worker && npm ci --omit=dev --ignore-scripts \
    && npx playwright install --with-deps chromium

COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Non-root user for Chromium (sandbox works without extra caps).
RUN useradd -m pwuser \
    && mkdir -p /data/openmuse /data/browser-profiles \
    && chown -R pwuser:pwuser /data/browser-profiles

ENV HOST=127.0.0.1 \
    PORT=8787 \
    PUBLIC_API_URL=https://yeeeeezus-openmuse.hf.space \
    ALLOWED_ORIGINS=https://yeeeeezus-openmuse.hf.space \
    WORKSPACE_MODE=live \
    AGENT_BACKEND=model \
    MODEL=openai/gpt-5 \
    DATA_DIR=/data/openmuse \
    TASK_WORKER_ENABLED=true \
    BROWSER_WORKER_URL=http://127.0.0.1:8790 \
    WORKSPACE_DIR=/data/openmuse

EXPOSE 7860
ENTRYPOINT ["/usr/bin/supervisord", "-n"]
