import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { CHAIN, viemChain } from "@/config/chain";

/**
 * Read-only ERC-20 access. This ABI deliberately contains view functions
 * only: Liftoff never sends a transaction, so there is nothing here that
 * could move tokens.
 */
export const erc20ReadAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type ReadClient = Pick<PublicClient, "readContract" | "verifyMessage">;

export function createReadClient(): PublicClient {
  return createPublicClient({
    chain: viemChain,
    transport: http(CHAIN.rpcUrl, { timeout: 8_000, retryCount: 1 }),
  });
}

export type TokenBasics = {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
};

/** Reads a token's identity straight from the chain, by contract address only. */
export async function readTokenBasics(
  client: Pick<PublicClient, "readContract">,
  token: Address,
): Promise<TokenBasics> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address: token, abi: erc20ReadAbi, functionName: "name" }),
    client.readContract({ address: token, abi: erc20ReadAbi, functionName: "symbol" }),
    client.readContract({ address: token, abi: erc20ReadAbi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20ReadAbi, functionName: "totalSupply" }),
  ]);
  return { name, symbol, decimals, totalSupply };
}

export async function readBalance(
  client: Pick<PublicClient, "readContract">,
  token: Address,
  holder: Address,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: erc20ReadAbi,
    functionName: "balanceOf",
    args: [holder],
  });
}

export async function readDecimals(
  client: Pick<PublicClient, "readContract">,
  token: Address,
): Promise<number> {
  return client.readContract({ address: token, abi: erc20ReadAbi, functionName: "decimals" });
}

/** Converts a whole-token threshold ("1000") to base units using bigint only. */
export function thresholdInBaseUnits(minTokens: string, decimals: number): bigint {
  if (!/^[0-9]+$/.test(minTokens)) throw new Error("minTokens must be a whole number");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) {
    throw new Error("decimals out of range");
  }
  return BigInt(minTokens) * 10n ** BigInt(decimals);
}

/** True when `balance` (base units) is at or above the whole-token threshold. */
export function meetsThreshold(balance: bigint, minTokens: string, decimals: number): boolean {
  return balance >= thresholdInBaseUnits(minTokens, decimals);
}
