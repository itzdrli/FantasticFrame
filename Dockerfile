# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# nuxt typecheck + nuxt build + scripts/postbuild.mjs (completes nitro's
# trimmed takumi-js copy, see the script)
RUN bun run build

FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
