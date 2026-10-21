// Minimal HS256 JWT + hashing helpers using WebCrypto (no dependencies)
const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64u(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const jsonB64u = (obj) => toB64u(enc.encode(JSON.stringify(obj)));

function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signJwt(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${jsonB64u({ alg: "HS256", typ: "JWT" })}.${jsonB64u({ ...payload, iat: now, exp: now + ttlSeconds })}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return `${data}.${toB64u(sig)}`;
}

export async function verifyJwt(token, secret) {
  try {
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64u(s), enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(fromB64u(p)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
