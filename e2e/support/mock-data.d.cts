export const CHAIN_HEX: string;
export const RPC_URL: string;
export const EXPLORER_API: string;
export const TOKEN: string;
export const TOKEN_NAME: string;
export const TOKEN_SYMBOL: string;
export function explorerResponse(url: string): unknown;
export function rpcResponse(body: unknown, balances?: Record<string, string>): unknown;
