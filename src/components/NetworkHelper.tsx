"use client";

import { useState } from "react";
import { ADD_CHAIN_PARAMS, CHAIN } from "@/config/chain";
import { PLATFORM } from "@/config/platform";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

/**
 * Helps first-time visitors add the network to their wallet. The only wallet
 * call made here is `wallet_addEthereumChain`, which asks the wallet to save
 * a network. It cannot move funds.
 */
export function NetworkHelper() {
  const [status, setStatus] = useState<"idle" | "added" | "no-wallet" | "declined">("idle");

  async function addNetwork() {
    const provider = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!provider) {
      setStatus("no-wallet");
      return;
    }
    try {
      await provider.request({ method: "wallet_addEthereumChain", params: [ADD_CHAIN_PARAMS] });
      setStatus("added");
    } catch {
      setStatus("declined");
    }
  }

  return (
    <section aria-labelledby="network-helper" className="panel">
      <p className="label">New here?</p>
      <h2 id="network-helper" className="mt-1 text-lg">
        Set up {CHAIN.name}
      </h2>
      <p className="mt-2 text-sm">
        This token lives on a test network. Add the network to your wallet and get free test ETH from the
        faucet. Test ETH and testnet tokens have no monetary value.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Chain ID</dt>
        <dd className="font-mono text-text">{CHAIN.id}</dd>
        <dt className="text-muted">RPC</dt>
        <dd className="font-mono break-all text-text">{CHAIN.rpcUrl}</dd>
        <dt className="text-muted">Currency</dt>
        <dd className="font-mono text-text">{CHAIN.nativeCurrency.symbol}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={addNetwork}>
          Add {CHAIN.name}
        </button>
        <a className="btn" href={CHAIN.faucetUrl} target="_blank" rel="noopener noreferrer">
          Open the faucet
        </a>
      </div>
      <p className="note mt-3" role="status">
        {status === "added" && "Done. Your wallet now knows this network."}
        {status === "declined" && "The wallet did not add the network. You can try again any time."}
        {status === "no-wallet" && (
          <>
            No browser wallet was found. The vibe/vibe docs name{" "}
            {PLATFORM.supportedWallets.map((wallet, index) => (
              <span key={wallet.name}>
                {index > 0 && " and "}
                <a href={wallet.url} target="_blank" rel="noopener noreferrer">
                  {wallet.name}
                </a>
              </span>
            ))}{" "}
            as supported wallets.
          </>
        )}
      </p>
    </section>
  );
}
