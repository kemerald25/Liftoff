"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN, viemChain } from "@/config/chain";

/**
 * Wallet setup for the holder area: the browser's injected wallet only
 * (MetaMask, Rabby and similar). No wallet SDKs, no project IDs, and no
 * stored connection state. Token reads go to the public RPC, not the wallet.
 */
const wagmiConfig = createConfig({
  chains: [viemChain],
  connectors: [injected()],
  transports: { [viemChain.id]: http(CHAIN.rpcUrl) },
  multiInjectedProviderDiscovery: false,
  storage: null,
  ssr: true,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
