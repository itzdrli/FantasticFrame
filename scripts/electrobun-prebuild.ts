// Runs before every `electrobun build` (see electrobun.config.ts).
// Canary/stable bundles embed the Nuxt production output (`.output`),
// so (re)build it here. Dev bundles boot the Nuxt dev server at runtime
// and don't need `.output`, so they skip the expensive build.

const env = process.env.ELECTROBUN_BUILD_ENV;

if (env === "canary" || env === "stable") {
	const result = Bun.spawnSync(["bun", "run", "build"], { stdio: "inherit" });
	if (result.exitCode !== 0) {
		process.exit(result.exitCode ?? 1);
	}
}
