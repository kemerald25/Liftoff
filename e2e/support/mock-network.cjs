/**
 * Preloaded into the Next.js build and server during tests (via
 * NODE_OPTIONS=--require). Replaces fetch for the explorer and the RPC so
 * tests never touch the real network for chain data. App code is unchanged.
 *
 *   MOCK_EXPLORER_DOWN=1   every explorer request fails (outage test)
 *   MOCK_BALANCES={...}    JSON map of lowercase address -> base-unit balance
 */
const { EXPLORER_API, RPC_URL, explorerResponse, rpcResponse } = require("./mock-data.cjs");

const realFetch = globalThis.fetch;
const balances = JSON.parse(process.env.MOCK_BALANCES || "{}");
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

globalThis.fetch = async function mockedFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.startsWith(EXPLORER_API)) {
    if (process.env.MOCK_EXPLORER_DOWN === "1") return json({ message: "Service Unavailable" }, 503);
    const body = explorerResponse(url);
    return body ? json(body) : json({ message: "Not found" }, 404);
  }

  if (url.startsWith(RPC_URL)) {
    const raw = init && init.body !== undefined ? init.body : await input.clone().text();
    return json(rpcResponse(JSON.parse(String(raw)), balances));
  }

  return realFetch(input, init);
};
