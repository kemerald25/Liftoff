import { defineChain } from "viem";

/**
 * Network values for Robinhood Chain Testnet.
 *
 * Every value here was checked by hand against the live network on the date
 * in `verifiedOn`. To add a mainnet profile later, add a second object with
 * the same shape and switch `CHAIN` to it. Nothing else in the app hard-codes
 * network values.
 */
export const CHAIN = {
  id: 46630,
  hexId: "0xb626",
  name: "Robinhood Chain Testnet",
  shortName: "Robinhood Testnet",
  isTestnet: true,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  explorerApiUrl: "https://explorer.testnet.chain.robinhood.com/api/v2",
  explorerSoftware: "Blockscout v10.2.6",
  faucetUrl: "https://faucet.testnet.chain.robinhood.com",
  /** Seconds explorer responses are cached on the server (rate-limit window is unverified). */
  explorerCacheSeconds: 60,
  source:
    "eth_chainId on the public RPC, the Blockscout explorer API, and the vibe/vibe docs (https://testnet.vibevibe.fun/docs/)",
  verifiedOn: "2026-11-15",
} as const;

/** viem chain definition built from the verified values above. */
export const viemChain = defineChain({
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: CHAIN.nativeCurrency,
  rpcUrls: { default: { http: [CHAIN.rpcUrl] } },
  blockExplorers: { default: { name: "Blockscout", url: CHAIN.explorerUrl } },
  testnet: CHAIN.isTestnet,
});

/** Parameters for `wallet_addEthereumChain`, built from the verified values. */
export const ADD_CHAIN_PARAMS = {
  chainId: CHAIN.hexId,
  chainName: CHAIN.name,
  nativeCurrency: CHAIN.nativeCurrency,
  rpcUrls: [CHAIN.rpcUrl],
  blockExplorerUrls: [CHAIN.explorerUrl],
} as const;

export function explorerAddressUrl(address: string): string {
  return `${CHAIN.explorerUrl}/address/${address}`;
}

export function explorerTokenUrl(address: string): string {
  return `${CHAIN.explorerUrl}/token/${address}`;
}
