"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useReadContract,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { Markdown } from "@/components/Markdown";
import { CHAIN } from "@/config/chain";
import { PLATFORM } from "@/config/platform";
import type { GateConfig, HolderContent } from "@/lib/config";
import { formatCount, formatTokenAmount, shortAddress } from "@/lib/format";
import { createSignInMessage, signInStatement } from "@/lib/siwe";
import { erc20ReadAbi, meetsThreshold } from "@/lib/token";

/**
 * The holder area. Wallet use is limited to: connect, switch or add the
 * network, read a balance, and sign one plain-text sign-in message. The
 * unlocked content is kept in memory only, so a reload locks it again.
 */

type Problem = "declined" | "refused" | "unavailable" | "rate_limited";

const PROBLEM_TEXT: Record<Problem, { title: string; text: string }> = {
  declined: {
    title: "Sign-in cancelled",
    text: "No problem. Nothing was signed and nothing changed. You can try again whenever you like.",
  },
  refused: {
    title: "The server could not confirm this sign-in",
    text: "Check that this wallet still holds enough tokens and that your device's clock is right, then try again.",
  },
  unavailable: {
    title: "The network could not be reached",
    text: "The server could not check your balance just now. Please try again shortly.",
  },
  rate_limited: {
    title: "Too many attempts",
    text: "Please wait a minute and try again.",
  },
};

function subscribeToWallet(notify: () => void) {
  // Some wallets announce themselves a moment after the page loads.
  window.addEventListener("ethereum#initialized", notify);
  const timer = setTimeout(notify, 1500);
  return () => {
    window.removeEventListener("ethereum#initialized", notify);
    clearTimeout(timer);
  };
}

const hasInjectedWallet = () => typeof (window as { ethereum?: unknown }).ethereum !== "undefined";

function Card({ state, title, children }: { state: string; title: string; children: ReactNode }) {
  return (
    <section className="panel space-y-3" data-testid="holder-state" data-state={state} aria-live="polite">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function HolderArea({ token, gate }: { token: `0x${string}`; gate: GateConfig }) {
  const walletFound = useSyncExternalStore(subscribeToWallet, hasInjectedWallet, () => null);
  const { address, isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending: connecting, error: connectError } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const { mutateAsync: signMessageAsync } = useSignMessage();

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [unlocked, setUnlocked] = useState<{ address: string; content: HolderContent } | null>(null);

  const onRightChain = chainId === CHAIN.id;
  const reads = { address: token, abi: erc20ReadAbi, chainId: CHAIN.id } as const;
  const decimals = useReadContract({
    ...reads,
    functionName: "decimals",
    query: { enabled: isConnected && onRightChain },
  });
  const balance = useReadContract({
    ...reads,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && onRightChain && Boolean(address) },
  });

  const threshold = `${formatCount(gate.minTokens)} tokens`;
  const viewOnPlatform = (
    <a href={PLATFORM.tokenPageUrl(token)} className="btn" target="_blank" rel="noopener noreferrer">
      View on {PLATFORM.name}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
  const connectedAs = address && (
    <p className="note">
      Connected as <span className="font-mono text-text" title={address}>{shortAddress(address)}</span>.{" "}
      <button type="button" className="cursor-pointer text-accent underline" onClick={() => disconnect()}>
        Disconnect
      </button>
    </p>
  );

  async function signIn() {
    if (!address) return;
    setBusy(true);
    setProblem(null);
    let signature: string;
    const message = createSignInMessage({
      host: window.location.host,
      origin: window.location.origin,
      address,
    });
    try {
      signature = await signMessageAsync({ message });
    } catch {
      setProblem("declined");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/holders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message, signature }),
      });
      const result = (await response.json()) as { ok: boolean; content?: HolderContent; error?: string };
      if (response.ok && result.ok && result.content) {
        setUnlocked({ address, content: result.content });
      } else if (response.status === 429) {
        setProblem("rate_limited");
      } else if (response.status === 403 || response.status === 400) {
        setProblem("refused");
      } else {
        setProblem("unavailable");
      }
    } catch {
      setProblem("unavailable");
    }
    setBusy(false);
  }

  /* ---------- states ---------- */

  if (walletFound === null) {
    return (
      <Card state="checking" title="Looking for a wallet…">
        <p className="note">One moment.</p>
      </Card>
    );
  }

  if (!walletFound) {
    return (
      <Card state="no-wallet" title="No wallet found">
        <p>
          This area is for token holders, so it needs a browser wallet to check your balance. None was found
          in this browser.
        </p>
        <p>The {PLATFORM.name} docs name these wallets as supported:</p>
        <ul className="flex flex-wrap gap-2">
          {PLATFORM.supportedWallets.map((wallet) => (
            <li key={wallet.name}>
              <a href={wallet.url} className="btn" target="_blank" rel="noopener noreferrer">
                Get {wallet.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="note">After installing a wallet, reload this page.</p>
      </Card>
    );
  }

  if (!isConnected || !address) {
    return (
      <Card state="not-connected" title="Connect your wallet">
        <p>
          Connecting only shares your public address so this site can read your token balance. It cannot move
          your funds.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={connecting}
          onClick={() => {
            const connector = connectors[0];
            if (connector) connect({ connector });
          }}
        >
          {connecting ? "Waiting for your wallet…" : "Connect wallet"}
        </button>
        {connectError && (
          <p className="note" role="status">
            The wallet did not connect. You can try again whenever you like.
          </p>
        )}
      </Card>
    );
  }

  if (unlocked && unlocked.address === address) {
    return (
      <Card state="unlocked" title={gate.title}>
        <div data-testid="holder-content" className="space-y-4">
          <Markdown source={unlocked.content.body} />
          {unlocked.content.links && unlocked.content.links.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {unlocked.content.links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a href={link.url} className="btn btn-small" target="_blank" rel="noopener noreferrer nofollow">
                    {link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="note">
          This content is not saved in your browser. Reloading the page locks it again, and you can sign in
          again for free.
        </p>
        <button type="button" className="btn btn-small" onClick={() => setUnlocked(null)}>
          Lock again
        </button>
        {connectedAs}
      </Card>
    );
  }

  if (!onRightChain) {
    return (
      <Card state="wrong-network" title="Switch network">
        <p>
          Your wallet is on a different network. This token lives on {CHAIN.name} (chain ID {CHAIN.id}).
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={switching}
          onClick={() => switchChain({ chainId: CHAIN.id })}
        >
          {switching ? "Waiting for your wallet…" : `Switch to ${CHAIN.name}`}
        </button>
        <p className="note">
          If your wallet does not know this network yet, it will offer to add it. Switching networks is free.
        </p>
        {switchError && (
          <p className="note" role="status">
            The wallet did not switch. You can try again whenever you like.
          </p>
        )}
        {connectedAs}
      </Card>
    );
  }

  if (balance.isError || decimals.isError) {
    return (
      <Card state="balance-error" title="Your balance could not be read">
        <p>The network did not answer. This is usually temporary.</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void decimals.refetch();
            void balance.refetch();
          }}
        >
          Try again
        </button>
        {connectedAs}
      </Card>
    );
  }

  if (balance.data === undefined || decimals.data === undefined) {
    return (
      <Card state="reading-balance" title="Reading your balance…">
        <p className="note">Checking how many tokens this wallet holds.</p>
        {connectedAs}
      </Card>
    );
  }

  const held = `${formatTokenAmount(balance.data, decimals.data)} tokens`;

  if (!meetsThreshold(balance.data, gate.minTokens, decimals.data)) {
    return (
      <Card state="below-threshold" title="Not enough tokens yet">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">This wallet holds</dt>
          <dd className="font-mono text-text" data-testid="held-balance">
            {held}
          </dd>
          <dt className="text-muted">Needed to unlock</dt>
          <dd className="font-mono text-text">{threshold}</dd>
        </dl>
        <p className="note">You have not been asked to sign anything.</p>
        {viewOnPlatform}
        {connectedAs}
      </Card>
    );
  }

  return (
    <Card state={problem ?? "eligible"} title={problem ? PROBLEM_TEXT[problem].title : "You can unlock this area"}>
      {problem ? (
        <p role="status">{PROBLEM_TEXT[problem].text}</p>
      ) : (
        <p>
          This wallet holds {held}, which is enough (at least {threshold} needed).
        </p>
      )}
      <p className="rounded-md border border-line bg-soft p-3 text-sm text-text">
        Next, your wallet will ask you to sign a short text message to prove this wallet is yours. This is a
        free sign-in. It is not a transaction, costs no gas, and cannot move your funds.
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">What the message will say</summary>
        <p className="mt-2 font-mono text-xs break-words">{signInStatement("this site's address")}</p>
      </details>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={signIn}>
        {busy ? "Waiting…" : problem ? "Try again" : "Sign in to unlock"}
      </button>
      {connectedAs}
    </Card>
  );
}
