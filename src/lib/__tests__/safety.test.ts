import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the hard constraints by reading the source itself:
 *  - no code path can send a transaction or ask for a typed-data signature
 *  - the private holder variable is only read on the server
 *  - no third-party scripts
 */

const ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "__tests__" ? [] : sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry) ? [path] : [];
  });
}

const files = sourceFiles(ROOT).map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

const FORBIDDEN = [
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_signTypedData",
  "eth_sign\"",
  "sendTransaction",
  "writeContract",
  "signTypedData",
  "signTransaction",
  "useSendTransaction",
  "useWriteContract",
  "useSignTypedData",
  "walletClient",
  "createWalletClient",
  "wallet_sendCalls",
  "permit(",
  "approve(",
  "transferFrom",
  "walletConnect",
  "coinbaseWallet",
];

describe("source safety", () => {
  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("contains no transaction, approval or typed-data signing code", () => {
    for (const { path, text } of files) {
      for (const word of FORBIDDEN) {
        expect(text.includes(word), `${path} contains "${word}"`).toBe(false);
      }
    }
  });

  it("uses only a read-only token ABI", () => {
    const token = files.find((file) => file.path === "lib/token.ts");
    expect(token).toBeDefined();
    expect(token?.text).not.toMatch(/stateMutability: "(nonpayable|payable)"/);
  });

  it("asks for exactly one kind of signature, in one place", () => {
    const signers = files.filter((file) => /useSignMessage|signMessage|personal_sign/.test(file.text));
    expect(signers.map((file) => file.path).sort()).toEqual(["components/wallet/HolderArea.tsx", "lib/siwe.ts"]);
  });

  it("reads the private holder variable only in server-only code", () => {
    const readers = files.filter((file) => file.text.includes("process.env.LIFTOFF_HOLDER_CONTENT"));
    expect(readers.map((file) => file.path).sort()).toEqual(["app/api/holders/route.ts", "lib/gate.ts"]);
    for (const file of files) {
      expect(file.text.includes("NEXT_PUBLIC_LIFTOFF_HOLDER"), file.path).toBe(false);
      if (file.text.includes('"use client"')) {
        expect(/from "@\/lib\/gate"/.test(file.text), `${file.path} imports the gate`).toBe(false);
      }
    }
    const gate = files.find((file) => file.path === "lib/gate.ts");
    expect(gate?.text.startsWith('import "server-only";')).toBe(true);
  });

  it("loads no third-party scripts and never stores unlocked content", () => {
    for (const { path, text } of files) {
      expect(/<script[^>]+src=|next\/script/.test(text), `${path} loads a script`).toBe(false);
    }
    const holderArea = files.find((file) => file.path === "components/wallet/HolderArea.tsx");
    expect(holderArea?.text).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});
