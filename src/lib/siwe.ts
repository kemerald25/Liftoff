import { getAddress, isAddress, type Address } from "viem";
import { CHAIN } from "@/config/chain";

/**
 * The one and only message Liftoff ever asks a wallet to sign: a plain-text
 * sign-in in the EIP-4361 (Sign-In with Ethereum) layout, signed with
 * `personal_sign`. It is not a transaction and cannot move funds.
 *
 * This file is shared by the browser (which builds the message) and the
 * server (which parses it strictly), so both always agree on the exact text.
 */

export type SignInFields = {
  /** Host of the site, e.g. "example.com" or "localhost:3000". */
  domain: string;
  /** Origin of the site, e.g. "https://example.com". */
  origin: string;
  address: Address;
  chainId: number;
  nonce: string;
  /** ISO 8601 timestamp. */
  issuedAt: string;
};

export function signInStatement(domain: string): string {
  return `Sign in to view holder content on ${domain}. This is a free sign-in. It is not a transaction, costs no gas, and cannot move your funds.`;
}

export function buildSignInMessage(fields: SignInFields): string {
  return [
    `${fields.domain} wants you to sign in with your Ethereum account:`,
    fields.address,
    "",
    signInStatement(fields.domain),
    "",
    `URI: ${fields.origin}`,
    "Version: 1",
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
  ].join("\n");
}

/** Random alphanumeric nonce (EIP-4361 requires at least 8 characters). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createSignInMessage(input: { host: string; origin: string; address: Address }): string {
  return buildSignInMessage({
    domain: input.host,
    origin: input.origin,
    address: getAddress(input.address),
    chainId: CHAIN.id,
    nonce: createNonce(),
    issuedAt: new Date().toISOString(),
  });
}

const HOST = /^[a-z0-9.-]+(:[0-9]{1,5})?$/i;
const LINE = {
  header: /^([^\s]+) wants you to sign in with your Ethereum account:$/,
  uri: /^URI: (https?:\/\/[^\s/]+)$/,
  chainId: /^Chain ID: ([1-9][0-9]{0,15})$/,
  nonce: /^Nonce: ([A-Za-z0-9]{8,64})$/,
  issuedAt: /^Issued At: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)$/,
};

/**
 * Strict parser. A message is accepted only if rebuilding it from the parsed
 * fields gives back exactly the same text, so nothing extra can be smuggled
 * in (no additional lines, resources, or altered statement).
 */
export function parseSignInMessage(message: unknown): SignInFields | null {
  if (typeof message !== "string" || message.length > 1200) return null;
  const lines = message.split("\n");
  if (lines.length !== 10) return null;

  const domain = LINE.header.exec(lines[0] ?? "")?.[1];
  const address = lines[1] ?? "";
  const origin = LINE.uri.exec(lines[5] ?? "")?.[1];
  const chainId = LINE.chainId.exec(lines[7] ?? "")?.[1];
  const nonce = LINE.nonce.exec(lines[8] ?? "")?.[1];
  const issuedAt = LINE.issuedAt.exec(lines[9] ?? "")?.[1];

  if (!domain || !HOST.test(domain) || !origin || !chainId || !nonce || !issuedAt) return null;
  // EIP-4361 requires the checksummed form; viem rejects a wrong checksum.
  if (!isAddress(address) || getAddress(address) !== address) return null;
  if (Number.isNaN(Date.parse(issuedAt))) return null;

  const fields: SignInFields = {
    domain,
    origin,
    address,
    chainId: Number(chainId),
    nonce,
    issuedAt,
  };
  return buildSignInMessage(fields) === message ? fields : null;
}
