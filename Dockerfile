# syntax=docker/dockerfile:1

# Next.js app only. Do not bake API keys, .env files, or model weights into the image.
# Pass runtime config with `-e` / `--env-file` (see README).
#
# Ollama on the host (macOS/Windows):
#   docker run --rm -p 3000:3000 \
#     -e LLM_PROVIDER=ollama \
#     -e OLLAMA_HOST=http://host.docker.internal:11434 \
#     career-intelligence-assistant
#
# Gemini:
#   docker run --rm -p 3000:3000 \
#     -e LLM_PROVIDER=gemini \
#     -e GEMINI_API_KEY \
#     career-intelligence-assistant

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/sample-data ./sample-data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
