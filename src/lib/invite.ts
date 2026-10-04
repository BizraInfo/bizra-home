import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const INVITE_COOKIE = "bizra_invite";
export const INVITE_MAX_AGE = 60 * 60 * 24 * 30;
const INVITE_ORIGIN = "https://invite.invalid";

export function safeInviteNext(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return "/onboarding";

  const next = candidate.trim();
  if (!next.startsWith("/") || next.startsWith("//")) return "/onboarding";

  try {
    return new URL(next, INVITE_ORIGIN).origin === INVITE_ORIGIN ? next : "/onboarding";
  } catch {
    return "/onboarding";
  }
}

function configuredCodes() {
  return (process.env.BIZRA_BETA_INVITE_CODES ?? "")
    .split(/[\n,;]/)
    .map((code) => code.trim())
    .filter(Boolean);
}

function inviteSecret() {
  const secret = process.env.BIZRA_INVITE_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function same(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function inviteConfigurationReady() {
  return configuredCodes().length > 0 && inviteSecret() !== null;
}

export function verifyInviteCode(value: string) {
  const code = value.trim();
  if (!code || code.length > 256 || !inviteConfigurationReady()) return false;
  const candidate = digest(code);
  return configuredCodes().some((configured) => same(candidate, digest(configured)));
}

export function createInviteCookieValue(code: string) {
  const secret = inviteSecret();
  if (!secret || !verifyInviteCode(code)) return null;
  const expires = Math.floor(Date.now() / 1000) + INVITE_MAX_AGE;
  const payload = "v1." + expires + "." + digest(code.trim());
  return payload + "." + sign(payload, secret);
}

export function verifyInviteCookieValue(value: string | undefined) {
  const secret = inviteSecret();
  if (!secret || !value) return false;

  const [version, expiresText, codeDigest, signature] = value.split(".");
  const expires = Number(expiresText);
  if (version !== "v1" || !Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/.test(codeDigest) || !signature) return false;

  const payload = version + "." + expires + "." + codeDigest;
  const currentCodes = configuredCodes().map(digest);
  return currentCodes.some((configured) => same(codeDigest, configured)) && same(signature, sign(payload, secret));
}

export async function hasInviteAccess() {
  const store = await cookies();
  return verifyInviteCookieValue(store.get(INVITE_COOKIE)?.value);
}
