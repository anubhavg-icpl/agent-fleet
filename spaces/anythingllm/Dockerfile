FROM mintplexlabs/anythingllm:latest

ENV STORAGE_DIR=/app/worker/storage \
    SERVER_PORT=3001

# First run opens a setup wizard in the browser: create the admin user,
# then add LLM/Embedding providers (any OpenAI-compatible endpoint, or the
# fleet's local-chat Ollama server).

EXPOSE 3001
