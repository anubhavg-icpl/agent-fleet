FROM langflowai/langflow:latest

# Official image already sets LANGFLOW_AUTO_LOGIN=false; explicit here for clarity.
# LANGFLOW_SUPERUSER_PASSWORD is injected at runtime as an HF Space secret —
# on first boot Langflow creates the superuser (username: `langflow`).
ENV LANGFLOW_HOST=0.0.0.0 \
    LANGFLOW_PORT=7860 \
    LANGFLOW_AUTO_LOGIN=false

EXPOSE 7860
