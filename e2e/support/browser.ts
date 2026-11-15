import type { Page } from "@playwright/test";
import type { PrivateKeyAccount } from "viem";
import * as mock from "./mock-data.cjs";

/** Mocks the explorer and RPC for requests made by the browser. */
export async function mockChain(
  page: Page,
  options: { balances?: Record<string, string>; explorerDown?: boolean; rpcDown?: boolean } = {},
) {
  await page.route(`${mock.EXPLORER_API}/**`, async (route) => {
    const body = options.explorerDown ? null : mock.explorerResponse(route.request().url());
    if (body) await route.fulfill({ json: body });
    else await route.fulfill({ status: options.explorerDown ? 503 : 404, json: { message: "unavailable" } });
  });
  await page.route(`${mock.RPC_URL}/**`, async (route) => {
    if (options.rpcDown) return route.abort("failed");
    await route.fulfill({ json: mock.rpcResponse(route.request().postDataJSON(), options.balances ?? {}) });
  });
  await page.route(mock.RPC_URL, async (route) => {
    if (options.rpcDown) return route.abort("failed");
    await route.fulfill({ json: mock.rpcResponse(route.request().postDataJSON(), options.balances ?? {}) });
  });
}

export type WalletOptions = {
  account: PrivateKeyAccount;
  /** Chain the fake wallet starts on. Defaults to Robinhood Chain Testnet. */
  chainId?: string;
};

/**
 * Installs a fake injected wallet (window.ethereum). It supports only what
 * Liftoff is allowed to use: accounts, chain switching and personal_sign.
 * Any other method, such as sending a transaction, fails the test loudly.
 * Signing happens in Node with a throwaway key generated for this run.
 */
export async function installWallet(page: Page, { account, chainId = mock.CHAIN_HEX }: WalletOptions) {
  await page.exposeFunction("__walletSign", (hexMessage: `0x${string}`) =>
    account.signMessage({ message: { raw: hexMessage } }),
  );
  await page.addInitScript(
    ({ address, startChain }) => {
      type Listener = (payload: unknown) => void;
      const listeners: Record<string, Listener[]> = {};
      const emit = (event: string, payload: unknown) => (listeners[event] ?? []).forEach((fn) => fn(payload));
      const state = window as unknown as {
        __walletCalls: string[];
        __walletRejectSign: boolean;
        __walletSign: (hex: string) => Promise<string>;
        ethereum: unknown;
      };
      let chain = startChain;
      let connected = false;
      state.__walletCalls = [];
      state.__walletRejectSign = false;
      state.ethereum = {
        isMetaMask: true,
        async request({ method, params }: { method: string; params?: unknown[] }) {
          state.__walletCalls.push(method);
          switch (method) {
            case "eth_requestAccounts":
              connected = true;
              return [address];
            case "eth_accounts":
              return connected ? [address] : [];
            case "eth_chainId":
              return chain;
            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
              chain = (params?.[0] as { chainId: string }).chainId;
              emit("chainChanged", chain);
              return null;
            case "personal_sign":
              if (state.__walletRejectSign) {
                throw Object.assign(new Error("User rejected the request."), { code: 4001 });
              }
              return state.__walletSign(params?.[0] as string);
            case "wallet_getPermissions":
            case "wallet_requestPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "wallet_revokePermissions":
              connected = false;
              return null;
            default:
              throw Object.assign(new Error(`The fake wallet does not allow ${method}.`), { code: 4200 });
          }
        },
        on(event: string, listener: Listener) {
          (listeners[event] ??= []).push(listener);
        },
        removeListener(event: string, listener: Listener) {
          listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== listener);
        },
      };
    },
    { address: account.address, startChain: chainId },
  );
}

/** Every wallet method the page called, in order. */
export function walletCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __walletCalls: string[] }).__walletCalls);
}

export function setRejectSign(page: Page, reject: boolean): Promise<void> {
  return page.evaluate((value) => {
    (window as unknown as { __walletRejectSign: boolean }).__walletRejectSign = value;
  }, reject);
}
