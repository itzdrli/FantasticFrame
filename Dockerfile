# syntax=docker/dockerfile:1
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# fetch self-hosted fonts + nuxt typecheck + nuxt build + scripts/postbuild.mjs
# (completes nitro's trimmed takumi-js copy, see the script)
RUN bun run build

FROM oven/bun:1.3
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.output ./.output
EXPOSE 3000
USER bun
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["bun", ".output/server/index.mjs"]
