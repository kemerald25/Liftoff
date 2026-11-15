/**
 * Proof that private holder content does not leak.
 *
 *   pnpm check:leak
 *
 * Builds the app in project mode with a random sentinel inside
 * LIFTOFF_HOLDER_CONTENT, then fails if the sentinel (or the encoded
 * variable) appears anywhere in the build output: the client bundle, the
 * statically generated pages, or any other built file. It then starts the
 * server and checks that public pages and refused gate requests never
 * contain it, while a correctly signed request from a holder does (so we
 * know the sentinel really was wired in).
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { TOKEN } = require("../e2e/support/mock-data.cjs");

const DIST = ".next-leak";
const PORT = 3190;
const HOST = `localhost:${PORT}`;
const sentinel = `LIFTOFF-LEAK-SENTINEL-${randomBytes(12).toString("hex")}`;
const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const holderContent = encode({
  v: 1,
  body: `Private notes ${sentinel}`,
  links: [{ label: `Label ${sentinel}`, url: `https://example.com/${sentinel}` }],
});
const siteConfig = encode({
  v: 1,
  token: TOKEN,
  look: "product",
  name: "Leak check",
  tagline: "Build used by the leak check.",
  description: "Public description.",
  gate: { minTokens: "1000", title: "Holder notes", teaser: "Public teaser." },
});

const holder = privateKeyToAccount(generatePrivateKey());
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const mock = path.join(root, "e2e", "support", "mock-network.cjs").replace(/\\/g, "/");
const env = {
  ...process.env,
  NEXT_PUBLIC_LIFTOFF_CONFIG: siteConfig,
  LIFTOFF_HOLDER_CONTENT: holderContent,
  LIFTOFF_DIST_DIR: DIST,
  NODE_OPTIONS: `--require "${mock}"`,
  MOCK_BALANCES: JSON.stringify({ [holder.address.toLowerCase()]: (5000n * 10n ** 18n).toString() }),
  NEXT_TELEMETRY_DISABLED: "1",
};

const failures = [];
const needles = [sentinel, holderContent, Buffer.from(sentinel).toString("base64").replace(/=+$/, "")];
const leaks = (text) => needles.some((needle) => text.includes(needle));

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/* ---------- 1. build ---------- */
rmSync(path.join(root, DIST), { recursive: true, force: true });
console.log(`Building with sentinel ${sentinel} …`);
const build = spawnSync(process.execPath, [next, "build"], { cwd: root, env, stdio: "inherit" });
if (build.status !== 0) {
  console.error("Build failed.");
  process.exit(1);
}

/* ---------- 2. scan every built file ---------- */
const dist = path.join(root, DIST);
const files = walk(dist);
let clientFiles = 0;
let staticPages = 0;
for (const file of files) {
  const relative = path.relative(dist, file).replace(/\\/g, "/");
  if (relative.startsWith("static/")) clientFiles += 1;
  if (/^server\/app\/.*\.(html|rsc|body|meta)$/.test(relative)) staticPages += 1;
  if (leaks(readFileSync(file).toString("latin1"))) failures.push(`build output: ${relative}`);
}
console.log(
  `Scanned ${files.length} built files (${clientFiles} client bundle files, ${staticPages} static page files).`,
);
if (clientFiles === 0) failures.push("no client bundle files were found to scan");
if (!existsSync(path.join(dist, "server"))) failures.push("no server output was found to scan");

/* ---------- 3. run the server and probe it ---------- */
const server = spawn(process.execPath, [next, "start", "-p", String(PORT)], { cwd: root, env, stdio: "ignore" });
try {
  const base = `http://${HOST}`;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fetch(base);
      break;
    } catch {
      if (attempt > 60) throw new Error("server did not start");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  for (const route of ["/", "/holders", "/og", "/does-not-exist"]) {
    const response = await fetch(base + route);
    const body = Buffer.from(await response.arrayBuffer()).toString("latin1");
    if (leaks(body)) failures.push(`page ${route}`);
    if (route === "/holders" && !body.includes("Holder notes")) failures.push("/holders did not render the gate");
  }

  const post = (body) =>
    fetch(`${base}/api/holders`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify(body),
    });
  const message = (address) =>
    [
      `${HOST} wants you to sign in with your Ethereum account:`,
      address,
      "",
      `Sign in to view holder content on ${HOST}. This is a free sign-in. It is not a transaction, costs no gas, and cannot move your funds.`,
      "",
      `URI: ${base}`,
      "Version: 1",
      "Chain ID: 46630",
      `Nonce: ${randomBytes(8).toString("hex")}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

  // Refused requests must not contain the content.
  const stranger = privateKeyToAccount(generatePrivateKey());
  const strangerMessage = message(stranger.address);
  const refusals = [
    { message: "hello", signature: "0x1234" },
    { message: strangerMessage, signature: await stranger.signMessage({ message: strangerMessage }) },
    { message: message(holder.address), signature: await stranger.signMessage({ message: message(holder.address) }) },
  ];
  for (const [index, body] of refusals.entries()) {
    const response = await post(body);
    const text = await response.text();
    if (response.ok) failures.push(`refusal ${index} was accepted`);
    if (leaks(text)) failures.push(`refusal ${index} leaked content`);
  }

  // Positive control: a real holder does receive it, so the sentinel was wired in.
  const holderMessage = message(holder.address);
  const granted = await post({
    message: holderMessage,
    signature: await holder.signMessage({ message: holderMessage }),
  });
  const grantedText = await granted.text();
  if (!granted.ok || !grantedText.includes(sentinel)) {
    failures.push(`positive control failed (status ${granted.status}): a valid holder did not receive the content`);
  }
  if (granted.headers.get("cache-control") !== "no-store") failures.push("gate response is cacheable");
} catch (error) {
  failures.push(`probe error: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  server.kill();
}

rmSync(path.join(root, DIST), { recursive: true, force: true });

if (failures.length > 0) {
  console.error("\nLEAK CHECK FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Leak check passed: holder content is absent from the client bundle, static output and public responses.");
