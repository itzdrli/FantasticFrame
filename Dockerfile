# syntax=docker/dockerfile:1
# Runtime-only image. Build on the host first: `bun run build` (which runs the
# postbuild overlay that completes nitro's trimmed takumi-js copy - see
# scripts/postbuild.ts).
#
# Building inside Docker is intentionally avoided on this host:
# - the docker network is flaky (DNS stalls hang `bun install` for minutes)
# - buildkit layer commits for the ~600 MB node_modules tree stall for 10+ min
#   on this machine's disk IO
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NUXT_TELEMETRY_DISABLED=1
COPY .output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
