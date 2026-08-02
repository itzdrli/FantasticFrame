import { BrowserWindow, Utils, defineElectrobunRPC } from "electrobun/bun";
import Electrobun from "electrobun/bun";
import { existsSync, mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import { join, resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { FantasticFrameRPCSchema } from "../../shared/rpc";

// The launcher runs the app bundle from <bundle>/bin with cwd = <bundle>/bin,
// so the shared app resources always live one level up.
const RESOURCES_DIR = resolve("../Resources");
const APP_DIR = join(RESOURCES_DIR, "app");

const DEV_PORT = Number(process.env.FANTASTICFRAME_DEV_PORT) || 3000;
const PROD_PORT = 3100;
const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}`;

const WINDOW_TITLE = "Fantastic Frame";
const WINDOW_FRAME = { x: 60, y: 60, width: 1440, height: 900 };

// TCP-level probe: far more reliable than HTTP for detecting an
// already-running dev server (HTTP may hang while Nuxt recompiles).
const portOpen = (port: number, host = "127.0.0.1") =>
	new Promise<boolean>((resolvePort) => {
		const sock = createConnection({ port, host });
		sock.setTimeout(1000);
		sock.once("connect", () => {
			sock.destroy();
			resolvePort(true);
		});
		sock.once("error", () => resolvePort(false));
		sock.once("timeout", () => {
			sock.destroy();
			resolvePort(false);
		});
	});

const isServerUp = async (url: string) => {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
		return res.ok;
	} catch {
		return false;
	}
};

const waitForServer = async (url: string, timeoutMs: number, exited?: Promise<unknown>) => {
	const deadline = Date.now() + timeoutMs;
	let lastLog = 0;
	while (Date.now() < deadline) {
		if (await isServerUp(url)) return;
		const now = Date.now();
		if (now - lastLog > 5000) {
			lastLog = now;
			console.log(`[FantasticFrame] waiting for server at ${url}...`);
		}
		if (exited) {
			const done = await Promise.race([
				exited.then(() => true),
				Bun.sleep(50).then(() => false),
			]);
			if (done) {
				throw new Error(`Server process exited before ${url} became ready`);
			}
		}
		await Bun.sleep(400);
	}
	throw new Error(`Timed out waiting for ${url}`);
};

const findProjectRoot = () => {
	// The dev bundle runs from <project>/build/dev-*/FantasticFrame-dev/bin,
	// so walk up the directory tree until we hit a package.json.
	let dir = process.env.INIT_CWD || process.cwd();
	for (;;) {
		if (existsSync(join(dir, "package.json"))) return dir;
		const parent = resolve(dir, "..");
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error("Could not locate the project root (package.json)");
};

const startNuxtDevServer = async () => {
	const bunBin = Bun.which("bun");
	if (!bunBin) {
		throw new Error("Bun not found on PATH - required to start the Nuxt dev server");
	}
	return Bun.spawn(
		[bunBin, "--bun", "nuxt", "dev", "--port", String(DEV_PORT), "--host", "127.0.0.1"],
		{
			cwd: findProjectRoot(),
			stdio: ["inherit", "inherit", "inherit"],
			env: { ...process.env, PORT: String(DEV_PORT), HOST: "127.0.0.1" },
		},
	);
};

// Show an error box without blocking quit - the modal would otherwise
// hold the app open forever if nobody dismisses it.
const fatal = (message: string, detail: string) => {
	console.error(`[FantasticFrame] ${message}`, detail);
	Utils.showMessageBox({
		type: "error",
		title: WINDOW_TITLE,
		message,
		detail,
		buttons: ["OK"],
	});
	Utils.quit();
};

// ── RPC Handlers ──────────────────────────────────────────────────────────────

/**
 * Strip the "data:<mime>;base64," prefix and decode to a Buffer.
 */
function dataUrlToBuffer(dataUrl: string): { buf: Buffer; ext: string } {
	const m = dataUrl.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/s);
	if (!m) throw new Error("Invalid data URL – expected data:image/<type>;base64,…");
	const ext = m[2] === "jpeg" ? "jpg" : m[2];
	const buf = Buffer.from(m[3], "base64");
	return { buf, ext };
}

const rpc = defineElectrobunRPC<FantasticFrameRPCSchema>("bun", {
	handlers: {
		requests: {
			/** Open a native folder-picker and return the chosen path. */
			async selectExportDir({ startingFolder } = {}) {
				const results = await Utils.openFileDialog({
					startingFolder: startingFolder ?? Utils.paths.pictures,
					canChooseFiles: false,
					canChooseDirectory: true,
					allowsMultipleSelection: false,
				});
				// openFileDialog returns [""] on cancel
				const picked = results[0] ?? "";
				return picked === "" ? "" : picked;
			},

			/** Write a base64 data URL to <dir>/<filename>. */
			async saveFile({ dir, filename, dataUrl }) {
				if (!dir) throw new Error("No export directory specified");
				// Ensure the directory exists (creates intermediate dirs too)
				if (!existsSync(dir)) {
					mkdirSync(dir, { recursive: true });
				}
				const { buf, ext } = dataUrlToBuffer(dataUrl);
				// Guarantee the file has the right extension
				let finalName = filename;
				const currentExt = extname(filename).replace(".", "").toLowerCase();
				if (currentExt !== ext) {
					finalName = filename.replace(/\.[^.]+$/, "") + "." + ext;
				}
				const filePath = join(dir, finalName);
				await Bun.write(filePath, buf);
				console.log(`[FantasticFrame] saved: ${filePath}`);
				return filePath;
			},
		},
	},
});

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
	console.log("[FantasticFrame] main start");
	// version.json is written by the electrobun build. `dev` channel means
	// we're in the development bundle (electrobun dev / run) - boot the Nuxt
	// dev server for HMR. canary/stable bundles run the embedded output.
	let channel = "dev";
	try {
		const info = await Bun.file(join(RESOURCES_DIR, "version.json")).json();
		channel = info.channel ?? "dev";
	} catch {}
	console.log("[FantasticFrame] channel:", channel);

	let url: string;
	let devServer: ReturnType<typeof Bun.spawn> | null = null;

	if (channel === "dev") {
		url = DEV_URL;
		// Connect to an already-running `bun run dev` server if present.
		// TCP probe first to avoid racing the spawn against a live server.
		console.log("[FantasticFrame] probing port", DEV_PORT);
		if (!(await portOpen(DEV_PORT))) {
			console.log("[FantasticFrame] port closed, starting Nuxt dev server");
			try {
				devServer = await startNuxtDevServer();
			} catch (error) {
				fatal("无法启动 Nuxt 开发服务器", `${error}`);
				return;
			}
		} else {
			console.log("[FantasticFrame] existing server detected, connecting");
		}
		console.log("[FantasticFrame] waiting for HTTP readiness");
		try {
			await waitForServer(url, 180_000, devServer?.exited);
		} catch (error) {
			fatal("Nuxt 开发服务器启动失败", `${error}`);
			return;
		}
		console.log("[FantasticFrame] server ready");
	} else {
		url = PROD_URL;
		const serverIndex = join(APP_DIR, "output", "server", "index.mjs");
		if (!existsSync(serverIndex)) {
			fatal(
				"未找到内置的 Nuxt 应用",
				"请先运行 `bun run build`，再执行 `bun run desktop:build:stable`。",
			);
			return;
		}
		process.env.NITRO_PORT = String(PROD_PORT);
		process.env.NITRO_HOST = "127.0.0.1";
		try {
			// Importing the Nitro entry starts the HTTP server in-process.
			await import(pathToFileURL(serverIndex).href);
			await waitForServer(url, 30_000);
		} catch (error) {
			fatal("内置服务启动失败", `${error}`);
			return;
		}
	}

	console.log("[FantasticFrame] creating window...");
	const win = new BrowserWindow({
		title: WINDOW_TITLE,
		url,
		frame: WINDOW_FRAME,
		rpc,
	});
	console.log("[FantasticFrame] window created, id:", win.id, "webview:", win.webviewId);

	// The page is served from a local HTTP server (not a views:// bundle),
	// so dev tools need to be opened programmatically.
	if (channel === "dev") {
		win.webview.openDevTools();
	}

	// Stop the dev server we spawned when the window closes / app quits.
	if (devServer) {
		const stop = () => {
			try {
				devServer?.kill();
			} catch {}
		};
		Electrobun.events.on("close", stop);
		process.on("beforeExit", stop);
	}
};

main().catch((error) => {
	fatal("应用启动失败", `${error}`);
});
