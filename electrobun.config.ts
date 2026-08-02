import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "FantasticFrame",
		identifier: "dev.fantasticframe.app",
		version: "1.0.0",
		description: "FantasticFrame - elegant photo borders and layouts.",
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		// Ship the Nuxt production output so the desktop app can run it
		// from the main process (see src/bun/index.ts).
		copy: {
			".output": "output",
		},
		win: {
			bundleCEF: false,
		},
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
	},
	scripts: {
		// Keep the bundled Nuxt output in sync for canary/stable bundles.
		// Dev builds boot the Nuxt dev server instead, so they skip this.
		preBuild: "scripts/electrobun-prebuild.ts",
	},
} satisfies ElectrobunConfig;
