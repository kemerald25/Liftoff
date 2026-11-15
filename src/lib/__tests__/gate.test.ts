import {
  createPublicClient,
  custom,
  encodeAbiParameters,
  getAddress,
  type Address,
  type PrivateKeyAccount,
  type PublicClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, it } from "vitest";
import { CHAIN, viemChain } from "@/config/chain";
import { encodeHolderContent, validateConfig, type SiteConfig } from "@/lib/config";
import {
  GATE_FAILURES,
  createRateLimiter,
  evaluateGateRequest,
  isHolderAreaEnabled,
  loadHolderContent,
  originMatchesHost,
  type GateOutcome,
} from "@/lib/gate";
import { buildSignInMessage, parseSignInMessage, signInStatement, type SignInFields } from "@/lib/siwe";

/**
 * Gate tests use freshly generated throwaway keys and a fake RPC. The fake
 * answers balanceOf/decimals for the configured token and fails every other
 * call, which is how a chain with no signature-validator contract behaves
 * for an ordinary wallet.
 */

const TOKEN = "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559" as Address;
const HOST = "myproject.example";
const ORIGIN = `https://${HOST}`;
const NOW = Date.parse("2026-11-15T12:00:00.000Z");
const ONE = 10n ** 18n;
const SECRET_BODY = "Top holder notes: the launch party is on Friday.";

const BALANCE_OF = "0x70a08231";
const DECIMALS = "0x313ce567";

let holder: PrivateKeyAccount;
let other: PrivateKeyAccount;
let config: SiteConfig;
let holderContentRaw: string;
const balances = new Map<Address, bigint>();

function fakeClient(options: { rpcDown?: boolean } = {}): PublicClient {
  return createPublicClient({
    chain: viemChain,
    transport: custom(
      {
        async request({ method, params }: { method: string; params?: unknown }) {
          if (options.rpcDown) throw new Error("fetch failed");
          if (method === "eth_chainId") return CHAIN.hexId;
          if (method === "eth_call") {
            const call = (params as [{ to?: string; data?: string }])[0];
            if (call.to && getAddress(call.to) === TOKEN && call.data) {
              if (call.data.startsWith(DECIMALS)) return encodeAbiParameters([{ type: "uint8" }], [18]);
              if (call.data.startsWith(BALANCE_OF)) {
                const account = getAddress(`0x${call.data.slice(-40)}`);
                return encodeAbiParameters([{ type: "uint256" }], [balances.get(account) ?? 0n]);
              }
            }
            throw new Error("execution reverted");
          }
          throw new Error(`unexpected RPC method ${method}`);
        },
      },
      { retryCount: 0 },
    ),
  });
}

type SignOptions = Partial<SignInFields> & { account?: PrivateKeyAccount };

async function signIn(options: SignOptions = {}) {
  const { account = holder, ...overrides } = options;
  const message = buildSignInMessage({
    domain: HOST,
    origin: ORIGIN,
    address: account.address,
    chainId: CHAIN.id,
    nonce: "a1b2c3d4e5f60718",
    issuedAt: new Date(NOW - 10_000).toISOString(),
    ...overrides,
  });
  return { message, signature: await account.signMessage({ message }) };
}

function evaluate(body: unknown, overrides: Partial<Parameters<typeof evaluateGateRequest>[0]> = {}) {
  return evaluateGateRequest({
    body,
    host: HOST,
    originHeader: ORIGIN,
    now: NOW,
    config,
    holderContentRaw,
    client: fakeClient(),
    ...overrides,
  });
}

function expectRefused(outcome: GateOutcome) {
  expect(outcome).toEqual(GATE_FAILURES.refused);
  expect(JSON.stringify(outcome)).not.toContain(SECRET_BODY);
}

beforeAll(() => {
  holder = privateKeyToAccount(generatePrivateKey());
  other = privateKeyToAccount(generatePrivateKey());
  balances.set(holder.address, 1000n * ONE);
  balances.set(other.address, 5000n * ONE);

  const validated = validateConfig({
    v: 1,
    token: TOKEN,
    look: "product",
    name: "Gate test",
    tagline: "Testing the gate",
    description: "Test",
    gate: { minTokens: "1000", title: "Holders", teaser: "For holders" },
  });
  if (!validated.ok) throw new Error(validated.error);
  config = validated.value;

  const encoded = encodeHolderContent({
    v: 1,
    body: SECRET_BODY,
    links: [{ label: "Private chat", url: "https://chat.example/room" }],
  });
  if (!encoded.ok) throw new Error(encoded.error);
  holderContentRaw = encoded.value;
});

describe("holder gate", () => {
  it("returns content for a valid signature at or above the threshold", async () => {
    const outcome = await evaluate(await signIn());
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({
      ok: true,
      content: { v: 1, body: SECRET_BODY, links: [{ label: "Private chat", url: "https://chat.example/room" }] },
    });
  });

  it("refuses a valid signature from a wallet below the threshold", async () => {
    balances.set(holder.address, 1000n * ONE - 1n);
    try {
      expectRefused(await evaluate(await signIn()));
    } finally {
      balances.set(holder.address, 1000n * ONE);
    }
    const empty = privateKeyToAccount(generatePrivateKey());
    expectRefused(await evaluate(await signIn({ account: empty })));
  });

  it("refuses a signature made for another domain", async () => {
    expectRefused(await evaluate(await signIn({ domain: "evil.example", origin: "https://evil.example" })));
    // Right domain line but an origin on another host, and the reverse.
    expectRefused(await evaluate(await signIn({ origin: "https://evil.example" })));
    expectRefused(await evaluate(await signIn({ domain: "evil.example" })));
    // A signature made for this site, replayed to a server on a different host.
    expectRefused(await evaluate(await signIn(), { host: "other-site.example" }));
    // The browser's Origin header disagrees with the signed origin.
    expectRefused(await evaluate(await signIn(), { originHeader: "https://evil.example" }));
    // Plain http is only accepted on localhost.
    expectRefused(await evaluate(await signIn({ origin: `http://${HOST}` }), { originHeader: null }));
  });

  it("refuses the wrong chain ID", async () => {
    expectRefused(await evaluate(await signIn({ chainId: 1 })));
    expectRefused(await evaluate(await signIn({ chainId: 46631 })));
  });

  it("refuses an expired timestamp", async () => {
    expectRefused(await evaluate(await signIn({ issuedAt: new Date(NOW - 5 * 60_000 - 1000).toISOString() })));
    expectRefused(await evaluate(await signIn({ issuedAt: "2020-01-01T00:00:00.000Z" })));
    // Just inside the window still works.
    const fresh = await evaluate(await signIn({ issuedAt: new Date(NOW - 5 * 60_000 + 1000).toISOString() }));
    expect(fresh.status).toBe(200);
  });

  it("refuses a timestamp in the future, allowing 30 seconds of clock skew", async () => {
    expectRefused(await evaluate(await signIn({ issuedAt: new Date(NOW + 31_000).toISOString() })));
    expectRefused(await evaluate(await signIn({ issuedAt: new Date(NOW + 3_600_000).toISOString() })));
    const skewed = await evaluate(await signIn({ issuedAt: new Date(NOW + 29_000).toISOString() }));
    expect(skewed.status).toBe(200);
  });

  it("refuses a tampered message", async () => {
    const { message, signature } = await signIn({ account: other });
    // Swap in the holder's address after signing.
    expectRefused(await evaluate({ message: message.replace(other.address, holder.address), signature }));
    // Change the nonce after signing.
    expectRefused(await evaluate({ message: message.replace("a1b2c3d4e5f60718", "ffffffffffffffff"), signature }));
    // Extra lines or an altered statement are rejected by the strict parser.
    expectRefused(await evaluate({ message: `${message}\nResources:\n- https://evil.example`, signature }));
    expectRefused(await evaluate({ message: message.replace("cannot move your funds", "can move funds"), signature }));
  });

  it("refuses a signature from a different address", async () => {
    const { message } = await signIn();
    const signature = await other.signMessage({ message });
    expectRefused(await evaluate({ message, signature }));
  });

  it("rejects malformed requests", async () => {
    const { message, signature } = await signIn();
    for (const body of [null, "text", 42, {}, { message }, { signature }, { message, signature: "nope" }, { message: 5, signature }]) {
      const outcome = await evaluate(body);
      expect(outcome).toEqual(GATE_FAILURES.bad_request);
    }
    expectRefused(await evaluate({ message: "hello", signature }));
    expectRefused(await evaluate({ message, signature }, { host: null }));
  });

  it("is disabled when the holder-content variable is missing or invalid", async () => {
    const body = await signIn();
    expect(await evaluate(body, { holderContentRaw: undefined })).toEqual(GATE_FAILURES.disabled);
    expect(await evaluate(body, { holderContentRaw: "" })).toEqual(GATE_FAILURES.disabled);
    expect(await evaluate(body, { holderContentRaw: "not-valid-content" })).toEqual(GATE_FAILURES.disabled);
    expect(await evaluate(body, { config: null })).toEqual(GATE_FAILURES.disabled);
    expect(await evaluate(body, { config: { ...config, gate: undefined } })).toEqual(GATE_FAILURES.disabled);
    expect(loadHolderContent(config, undefined)).toBeNull();
    expect(loadHolderContent(config, holderContentRaw)?.body).toBe(SECRET_BODY);
    expect(isHolderAreaEnabled(config)).toBe(false);
  });

  it("fails closed when the RPC is unreachable", async () => {
    const outcome = await evaluate(await signIn(), { client: fakeClient({ rpcDown: true }) });
    expect(outcome).toEqual(GATE_FAILURES.unavailable);
    expect(outcome.body).toMatchObject({ ok: false, message: expect.stringContaining("try again shortly") });
  });

  it("gives the same answer for every kind of refusal", async () => {
    const outcomes = await Promise.all([
      signIn({ chainId: 1 }).then((body) => evaluate(body)),
      signIn({ domain: "evil.example" }).then((body) => evaluate(body)),
      signIn({ account: privateKeyToAccount(generatePrivateKey()) }).then((body) => evaluate(body)),
    ]);
    for (const outcome of outcomes) expect(outcome).toBe(GATE_FAILURES.refused);
  });
});

describe("sign-in message", () => {
  const fields: SignInFields = {
    domain: HOST,
    origin: ORIGIN,
    address: "0xeC6Eb722A645Eb91116d824F9D68801Bb5ede559",
    chainId: CHAIN.id,
    nonce: "a1b2c3d4e5f60718",
    issuedAt: "2026-11-15T12:00:00.000Z",
  };

  it("contains everything the visitor needs to see", () => {
    const message = buildSignInMessage(fields);
    expect(message).toContain(`${HOST} wants you to sign in with your Ethereum account:`);
    expect(message).toContain(fields.address);
    expect(message).toContain(`URI: ${ORIGIN}`);
    expect(message).toContain("Chain ID: 46630");
    expect(message).toContain("Nonce: a1b2c3d4e5f60718");
    expect(message).toContain("Issued At: 2026-11-15T12:00:00.000Z");
    expect(message).toContain(
      `Sign in to view holder content on ${HOST}. This is a free sign-in. It is not a transaction, costs no gas, and cannot move your funds.`,
    );
    expect(signInStatement(HOST)).toContain("cannot move your funds");
  });

  it("round-trips through the strict parser", () => {
    expect(parseSignInMessage(buildSignInMessage(fields))).toEqual(fields);
  });

  it("rejects anything that is not exactly the expected layout", () => {
    const message = buildSignInMessage(fields);
    expect(parseSignInMessage(message + "\n")).toBeNull();
    expect(parseSignInMessage(message.replace("Version: 1", "Version: 2"))).toBeNull();
    expect(parseSignInMessage(message.replace(fields.address, fields.address.toLowerCase()))).toBeNull();
    expect(parseSignInMessage(message.replace("Nonce: a1b2c3d4e5f60718", "Nonce: short"))).toBeNull();
    expect(parseSignInMessage(message.replace("12:00:00.000Z", "12:00:00+01:00"))).toBeNull();
    expect(parseSignInMessage(message.replace(/\n/g, "\r\n"))).toBeNull();
    expect(parseSignInMessage(undefined)).toBeNull();
    expect(parseSignInMessage("x".repeat(5000))).toBeNull();
  });
});

describe("gate helpers", () => {
  it("matches origins to hosts", () => {
    expect(originMatchesHost("https://a.example", "a.example")).toBe(true);
    expect(originMatchesHost("https://A.example", "a.example")).toBe(true);
    expect(originMatchesHost("http://a.example", "a.example")).toBe(false);
    expect(originMatchesHost("http://localhost:3000", "localhost:3000")).toBe(true);
    expect(originMatchesHost("http://localhost:3000", "localhost:4000")).toBe(false);
    expect(originMatchesHost("https://a.example.evil.example", "a.example")).toBe(false);
    expect(originMatchesHost("not a url", "a.example")).toBe(false);
  });

  it("throttles per key within a window", () => {
    const limiter = createRateLimiter(3, 1000);
    expect([1, 2, 3, 4].map(() => limiter.allow("ip", 0))).toEqual([true, true, true, false]);
    expect(limiter.allow("other", 0)).toBe(true);
    expect(limiter.allow("ip", 1000)).toBe(true);
  });
});
