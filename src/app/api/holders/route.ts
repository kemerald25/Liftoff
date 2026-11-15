import { NextResponse } from "next/server";
import { getSiteMode } from "@/config/site";
import {
  createRateLimiter,
  evaluateGateRequest,
  GATE_FAILURES,
  GATE_LIMITS,
  type GateOutcome,
} from "@/lib/gate";
import { createReadClient } from "@/lib/token";

/**
 * The holder gate: the only server code in Liftoff besides page rendering.
 * POST only, never cached, never statically rendered. Nothing here logs the
 * message, the signature or the content.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = createRateLimiter(GATE_LIMITS.rateLimit, GATE_LIMITS.rateWindowMs);

function respond(outcome: GateOutcome): NextResponse {
  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Reads the body with a hard size cap, without trusting Content-Length. */
async function readLimitedBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > GATE_LIMITS.maxBodyBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > GATE_LIMITS.maxBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request): Promise<NextResponse> {
  const site = getSiteMode();
  const config = site.mode === "project" ? site.config : null;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!limiter.allow(ip, Date.now())) return respond(GATE_FAILURES.rate_limited);

  let body: unknown;
  try {
    const text = await readLimitedBody(request);
    if (text === null) return respond(GATE_FAILURES.bad_request);
    body = JSON.parse(text);
  } catch {
    return respond(GATE_FAILURES.bad_request);
  }

  try {
    const outcome = await evaluateGateRequest({
      body,
      host: request.headers.get("host"),
      originHeader: request.headers.get("origin"),
      now: Date.now(),
      config,
      holderContentRaw: process.env.LIFTOFF_HOLDER_CONTENT,
      client: createReadClient(),
    });
    return respond(outcome);
  } catch {
    return respond(GATE_FAILURES.unavailable);
  }
}

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "bad_request", message: "Use POST." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
