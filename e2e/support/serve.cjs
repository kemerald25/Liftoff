/**
 * Builds and starts one copy of the app for the end-to-end tests.
 *
 *   node e2e/support/serve.cjs <name> <port>
 *
 * Each copy builds into its own folder (.next-e2e/<name>) with the network
 * mock preloaded, so kit mode, project mode and the outage case can run
 * side by side. Mode is chosen by the environment Playwright passes in.
 */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const [name, port] = process.argv.slice(2);
const root = path.resolve(__dirname, "..", "..");
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const mock = path.join(__dirname, "mock-network.cjs").replace(/\\/g, "/");

const env = {
  ...process.env,
  LIFTOFF_DIST_DIR: `.next-e2e/${name}`,
  NODE_OPTIONS: `--require "${mock}"`,
  NEXT_TELEMETRY_DISABLED: "1",
};

const build = spawnSync(process.execPath, [next, "build"], { cwd: root, env, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [next, "start", "-p", port], { cwd: root, env, stdio: "inherit" });
const stop = () => server.kill();
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
server.on("exit", (code) => process.exit(code ?? 0));
