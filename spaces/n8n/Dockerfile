FROM docker.io/n8nio/n8n:latest

# HF Spaces run behind a reverse proxy over HTTPS.
# N8N_SECURE_COOKIE=false is required to avoid login loops when the app is
# iframe'd / proxied; N8N_PROXY_HOPS=1 makes n8n trust X-Forwarded-* headers.
ENV N8N_PORT=7860 \
    N8N_LISTEN_ADDRESS=0.0.0.0 \
    N8N_SECURE_COOKIE=false \
    N8N_PROXY_HOPS=1 \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_PERSONALIZATION_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false \
    N8N_TEMPLATES_ENABLED=false \
    N8N_RUNNERS_ENABLED=true \
    GENERIC_TIMEZONE=UTC

# N8N_ENCRYPTION_KEY is injected at runtime as an HF Space secret,
# so saved credentials stay decryptable across container restarts
# (while the ephemeral disk lasts — see agent-fleet docs).

EXPOSE 7860
CMD ["n8n", "start"]
