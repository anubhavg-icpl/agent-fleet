FROM node:20-alpine

# Flowise is pure-JS; python3/make/g++ cover native add-ons some deps pull in.
RUN apk add --no-cache python3 py3-pip make g++ \
    && npm install -g flowise@latest

ENV PORT=7860 \
    FLOWISE_FILE_SIZE_LIMIT=50MB

# FLOWISE_USERNAME / FLOWISE_PASSWORD (basic auth) are injected at runtime
# as HF Space secrets.

EXPOSE 7860
CMD ["flowise", "start"]
