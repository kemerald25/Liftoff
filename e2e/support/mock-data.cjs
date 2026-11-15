/**
 * Fake explorer and RPC answers shared by:
 *  - the server-side fetch mock (mock-network.cjs, preloaded into Next.js)
 *  - the browser-side mocks in the Playwright tests
 *
 * Plain CommonJS with no dependencies so it can be preloaded with --require.
 */

const CHAIN_HEX = "0xb626";
const RPC_URL = "https://rpc.testnet.chain.robinhood.com";
const EXPLORER_API = "https://explorer.testnet.chain.robinhood.com/api/v2";
const TOKEN = "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559";
const TOKEN_NAME = "VIBE MORNING";
const TOKEN_SYMBOL = "VIBEMORNING";
const TOTAL_SUPPLY = 10n ** 27n;

const pad = (hex) => hex.padStart(64, "0");
const encodeUint = (value) => "0x" + pad(BigInt(value).toString(16));
function encodeString(text) {
  const hex = Buffer.from(text, "utf8").toString("hex");
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64 || 64, "0");
  return "0x" + pad("20") + pad((hex.length / 2).toString(16)) + padded;
}

const holderRow = (hash, value, isContract, name = null) => ({
  address: { hash, is_contract: isContract, is_verified: false, name },
  token_id: null,
  value,
});

const EXPLORER = {
  [`/tokens/${TOKEN}`]: {
    address_hash: TOKEN,
    decimals: "18",
    holders_count: "31",
    icon_url: null,
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    total_supply: TOTAL_SUPPLY.toString(),
    type: "ERC-20",
  },
  [`/tokens/${TOKEN}/counters`]: { token_holders_count: "31", transfers_count: "85" },
  [`/tokens/${TOKEN}/holders`]: {
    items: [
      holderRow("0xE5AC80a69E9fA7f6428480b2300338eE5136044d", "567556913985091303130009127", false),
      holderRow("0x5f88Be4e52FF454eA40d69d212497B7C5D9b622b", "215280639802496754734929924", true),
      holderRow(TOKEN, "50494326532125825070632650", true, TOKEN_NAME),
      holderRow("0x55BffA63c2493de0022E88cfED40d98550DD411F", "1000000000000000000000000", false),
    ],
    next_page_params: null,
  },
};

/** Returns the JSON body for an explorer API path, or null for unknown paths. */
function explorerResponse(url) {
  const path = url.slice(EXPLORER_API.length).split("?")[0];
  const key = Object.keys(EXPLORER).find((candidate) => candidate.toLowerCase() === path.toLowerCase());
  return key ? EXPLORER[key] : null;
}

/**
 * Answers one JSON-RPC request. `balances` maps lowercase addresses to
 * base-unit balances (as strings). Calls to anything except the sample
 * token fail, like a chain with no signature-validator contract.
 */
function rpcResult(request, balances) {
  const ok = (result) => ({ jsonrpc: "2.0", id: request.id, result });
  const error = (message) => ({ jsonrpc: "2.0", id: request.id, error: { code: 3, message } });
  switch (request.method) {
    case "eth_chainId":
      return ok(CHAIN_HEX);
    case "eth_blockNumber":
      return ok("0x1");
    case "eth_getCode":
      return ok("0x");
    case "eth_call": {
      const call = (request.params && request.params[0]) || {};
      const data = String(call.data || call.input || "");
      if (String(call.to || "").toLowerCase() !== TOKEN.toLowerCase()) return error("execution reverted");
      if (data.startsWith("0x06fdde03")) return ok(encodeString(TOKEN_NAME));
      if (data.startsWith("0x95d89b41")) return ok(encodeString(TOKEN_SYMBOL));
      if (data.startsWith("0x313ce567")) return ok(encodeUint(18));
      if (data.startsWith("0x18160ddd")) return ok(encodeUint(TOTAL_SUPPLY));
      if (data.startsWith("0x70a08231")) {
        const account = "0x" + data.slice(-40).toLowerCase();
        return ok(encodeUint((balances && balances[account]) || "0"));
      }
      return error("execution reverted");
    }
    default:
      return error(`method ${request.method} is not mocked`);
  }
}

function rpcResponse(body, balances) {
  return Array.isArray(body) ? body.map((item) => rpcResult(item, balances)) : rpcResult(body, balances);
}

module.exports = {
  CHAIN_HEX,
  RPC_URL,
  EXPLORER_API,
  TOKEN,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  explorerResponse,
  rpcResponse,
};
