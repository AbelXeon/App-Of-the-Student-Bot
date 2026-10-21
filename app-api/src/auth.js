import { tg } from "./lib/tg.js";
import { signJwt, verifyJwt, sha256Hex } from "./lib/jwt.js";
import { COURSES, HttpError, readJson } from "./lib/util.js";

const OTP_TTL = 5 * 60; // code valid for 5 minutes
const RESEND_GAP = 60; // seconds between code requests
const MAX_ATTEMPTS = 5;
const SESSION_TTL = 30 * 24 * 60 * 60; // stay logged in for 30 days

const now = () => Math.floor(Date.now() / 1000);

// New tables only. Nothing the bot uses is touched.
let tablesReady = false;
export async function ensureTables(env) {
  if (tablesReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_otps (
        chat_id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_quiz_sessions (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`
    ),
  ]);
  tablesReady = true;
}

function normalizeUsername(raw) {
  const u = String(raw || "").trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{3,32}$/.test(u) ? u : null;
}

const USER_COLS = "chat_id, username, first_name, course, approved, suspended";

function findByUsername(env, username) {
  return env.DB.prepare(`SELECT ${USER_COLS} FROM user_state WHERE LOWER(username) = ? LIMIT 1`).bind(username).first();
}

export const publicUser = (u) => ({
  username: u.username || null,
  first_name: u.first_name || null,
  course: u.course || COURSES[0],
  courses: COURSES,
});

// Same approval rules as the bot: approved = 1 and not suspended.
function assertAllowed(user) {
  if (!user) {
    throw new HttpError(404, "No account found. Open the bot in Telegram, press /start, then wait until Abel approves you.", "not_registered");
  }
  if (user.suspended) throw new HttpError(403, "Your access has been suspended.", "suspended");
  if (!user.approved) throw new HttpError(403, "Your access request is still pending. Wait until Abel approves you in the bot.", "pending");
}

const codeHash = (env, chatId, code) => sha256Hex(`${env.JWT_SECRET}:${chatId}:${code}`);

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 100000;
  return String(n).padStart(5, "0");
}

// POST /auth/request-code  { username }
export async function requestCode(request, env) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  if (!username) throw new HttpError(400, "Enter a valid Telegram username.", "bad_username");

  const user = await findByUsername(env, username);
  assertAllowed(user);

  const t = now();
  const last = await env.DB.prepare("SELECT created_at FROM app_otps WHERE chat_id = ?").bind(user.chat_id).first();
  if (last && t - last.created_at < RESEND_GAP) {
    const left = RESEND_GAP - (t - last.created_at);
    throw new HttpError(429, `A code was just sent. Wait ${left}s to request another.`, "too_soon");
  }

  const code = randomCode();
  await env.DB.prepare(
    `INSERT INTO app_otps (chat_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(chat_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`
  ).bind(user.chat_id, await codeHash(env, user.chat_id, code), t + OTP_TTL, t).run();

  let sent;
  try {
    sent = await tg(env, "sendMessage", {
      chat_id: user.chat_id,
      text: `🔐 Your Study App login code:\n\n\`${code}\`\n\nIt expires in 5 minutes. Never share it with anyone.`,
      parse_mode: "Markdown",
    });
  } catch {
    sent = null;
  }
  if (!sent?.ok) {
    await env.DB.prepare("DELETE FROM app_otps WHERE chat_id = ?").bind(user.chat_id).run();
    throw new HttpError(502, "Couldn't send the code to Telegram. Open the bot, press /start, then try again.", "tg_failed");
  }

  return { ok: true, expiresIn: OTP_TTL, resendIn: RESEND_GAP };
}

// POST /auth/verify  { username, code }
export async function verifyCode(request, env) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const code = String(body.code || "").trim();
  if (!username || !/^\d{5}$/.test(code)) throw new HttpError(400, "Enter the 5-digit code.", "bad_code");

  const user = await findByUsername(env, username);
  assertAllowed(user);

  const row = await env.DB.prepare("SELECT code_hash, expires_at, attempts FROM app_otps WHERE chat_id = ?").bind(user.chat_id).first();
  if (!row || row.expires_at < now()) throw new HttpError(400, "That code expired. Request a new one.", "expired");
  if (row.attempts >= MAX_ATTEMPTS) {
    await env.DB.prepare("DELETE FROM app_otps WHERE chat_id = ?").bind(user.chat_id).run();
    throw new HttpError(429, "Too many wrong tries. Request a new code.", "locked");
  }

  if ((await codeHash(env, user.chat_id, code)) !== row.code_hash) {
    await env.DB.prepare("UPDATE app_otps SET attempts = attempts + 1 WHERE chat_id = ?").bind(user.chat_id).run();
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new HttpError(400, left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Wrong code. Request a new one.", "wrong_code");
  }

  await env.DB.prepare("DELETE FROM app_otps WHERE chat_id = ?").bind(user.chat_id).run();
  const token = await signJwt({ sub: user.chat_id }, env.JWT_SECRET, SESSION_TTL);
  return { token, user: publicUser(user) };
}

// Runs on every protected request. Re-checks approved/suspended so
// suspending someone in the bot also locks them out of the app.
export async function authenticate(request, env) {
  const m = (request.headers.get("Authorization") || "").match(/^Bearer (.+)$/);
  const payload = m ? await verifyJwt(m[1], env.JWT_SECRET) : null;
  if (!payload) throw new HttpError(401, "Please log in again.", "unauthorized");

  const user = await env.DB.prepare(`SELECT ${USER_COLS} FROM user_state WHERE chat_id = ?`).bind(payload.sub).first();
  if (!user || !user.approved || user.suspended) throw new HttpError(403, "Your access is no longer active.", "revoked");
  return user;
}

export const me = async (_request, _env, user) => publicUser(user);

// POST /course  { course }
export async function setCourse(request, env, user) {
  const { course } = await readJson(request);
  if (!COURSES.includes(course)) throw new HttpError(400, "Unknown course.", "bad_course");
  await env.DB.prepare("UPDATE user_state SET course = ? WHERE chat_id = ?").bind(course, user.chat_id).run();
  return publicUser({ ...user, course });
}
