# local-chat — Open WebUI + bundled Ollama models (zero-config chat)
#
# Single container: supervisord runs ollama (CPU) + Open WebUI.
# Models are BAKED into the image at build time, so the chat works
# out of the box on free 2-vCPU hardware with no API keys.
FROM ghcr.io/open-webui/open-webui:main

USER root

# supervisord to run two processes; curl to install ollama.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install the ollama runtime (static binary, CPU-only is fine).
RUN curl -L https://ollama.com/download/ollama-linux-amd64.tgz | tar xz -C /usr

# Bake models into the image: start the daemon during build, pull, stop.
#   llama3.2:1b       — main chat model (1.3 GB, good quality/speed tradeoff)
#   qwen2.5:0.5b      — fast lightweight assistant
#   nomic-embed-text  — embeddings for RAG/document chat
ENV OLLAMA_MODELS=/root/.ollama/models
RUN (ollama serve &) \
    && sleep 8 \
    && ollama pull llama3.2:1b \
    && ollama pull qwen2.5:0.5b \
    && ollama pull nomic-embed-text \
    && pkill ollama || true

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENV OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_BASE_URL=http://127.0.0.1:11434 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_KEEP_ALIVE=5m \
    ENABLE_OLLAMA_API=true \
    WEBUI_AUTH=true \
    PORT=8080 \
    DATA_DIR=/app/backend/data

# WEBUI_SECRET_KEY is injected at runtime as an HF Space secret.

EXPOSE 8080
ENTRYPOINT ["/usr/bin/supervisord", "-n"]
