FROM lobehub/lobe-chat:latest

ENV PORT=3210

# ACCESS_CODE (login gate) is injected at runtime as an HF Space secret.
# LLM API keys are configured in-app (Settings → Key Vault) and stay in your
# browser session; nothing is baked into the image.

EXPOSE 3210
# Uses the base image's own entrypoint (node server.js).
