/**
 * GreenSweep email-verification worker.
 *
 * Replaces the old Firebase Cloud Functions (which required the paid Blaze
 * plan). Runs on Cloudflare Workers' free tier instead.
 *
 * SECURITY MODEL — read this before changing anything:
 * The entire point of doing this in a Worker rather than in the Flutter app
 * is that the 6-digit code is generated and compared HERE, never on the
 * device that's requesting verification. If code generation lived in
 * Flutter, the requesting app would know the code in local memory before
 * the email was ever sent — "verification" would prove nothing. Keep all
 * three steps below server-side; do not add an endpoint that returns the
 * plaintext code or the Firestore document contents to the client.
 *
 * Three endpoints, mirroring the three-step Flutter sign-up flow:
 *   POST /request-code          — step 1: email in, verification code emailed out
 *   POST /confirm-code          — step 2: code in, verified flag set server-side
 *   POST /complete-registration — step 3: password in, Firebase Auth account created
 *                                 (gated on step 2 having actually succeeded)
 */

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_WEB_API_KEY: string;
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;
  EMAILJS_PUBLIC_KEY: string;
  // Secrets — set with `wrangler secret put <NAME>`, never committed.
  FIREBASE_SERVICE_ACCOUNT_KEY: string;
  EMAILJS_PRIVATE_KEY: string;
}

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 60;
const VERIFIED_GRACE_MINUTES = 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorJson(message: string, status: number): Response {
  return json({ error: message }, status);
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new ApiError("Email is required.", 400);
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new ApiError("Please enter a valid email address.", 400);
  }
  return email;
}

// ---------------------------------------------------------------------------
// Crypto helpers (Web Crypto — no Node APIs available in Workers)
// ---------------------------------------------------------------------------

function randomCode(): string {
  // 6-digit numeric code from a CSPRNG, rejection-sampled to avoid modulo bias.
  const range = 1_000_000;
  const maxUsable = Math.floor(0xffffffff / range) * range;
  let n: number;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= maxUsable);
  return (n % range).toString().padStart(CODE_LENGTH, "0");
}

function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Simple constant-time-ish string compare (equal-length hex hashes). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Google OAuth2 (service-account JWT-bearer flow) — lets this Worker act as
// Admin SDK would, bypassing Firestore security rules for the
// emailVerifications collection. This is the ONLY thing that lets the client
// never see the stored code/hash: the client has zero Firestore permissions
// on that collection (see firestore.rules), only this Worker does.
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(env: Env): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 30_000 > Date.now()) {
    return cachedToken.token;
  }

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as {
    client_email: string;
    private_key: string;
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  };

  const unsigned =
    base64UrlEncode(new TextEncoder().encode(JSON.stringify(header))) +
    "." +
    base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new ApiError("Backend auth failure. Please try again later.", 500);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Minimal Firestore REST client — only what we need for emailVerifications
// and writing the users/{uid} profile doc.
// ---------------------------------------------------------------------------

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

function toFields(obj: Record<string, string | number | boolean | Date | null>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) fields[key] = { nullValue: null };
    else if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
    else if (value instanceof Date) fields[key] = { timestampValue: value.toISOString() };
  }
  return fields;
}

function fromFields(fields: Record<string, FirestoreValue> | undefined) {
  const obj: Record<string, string | number | boolean | null> = {};
  if (!fields) return obj;
  for (const [key, v] of Object.entries(fields)) {
    if ("stringValue" in v) obj[key] = v.stringValue;
    else if ("integerValue" in v) obj[key] = Number(v.integerValue);
    else if ("booleanValue" in v) obj[key] = v.booleanValue;
    else if ("timestampValue" in v) obj[key] = Date.parse(v.timestampValue);
    else obj[key] = null;
  }
  return obj;
}

function firestoreUrl(env: Env, path: string) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

async function firestoreGet(
  env: Env,
  token: string,
  path: string
): Promise<Record<string, string | number | boolean | null> | null> {
  const res = await fetch(firestoreUrl(env, path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError("Backend storage error. Please try again.", 500);
  const doc = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return fromFields(doc.fields);
}

/** Full overwrite (no updateMask) or partial merge (with updateMask). */
async function firestoreWrite(
  env: Env,
  token: string,
  path: string,
  data: Record<string, string | number | boolean | Date | null>,
  merge: boolean
): Promise<void> {
  let url = firestoreUrl(env, path);
  if (merge) {
    const mask = Object.keys(data)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    url += `?${mask}`;
  }
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new ApiError("Backend storage error. Please try again.", 500);
}

async function firestoreDelete(env: Env, token: string, path: string): Promise<void> {
  await fetch(firestoreUrl(env, path), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Atomic increment via the :commit transform API — used for the attempts
 * counter so concurrent guesses can't race past MAX_VERIFY_ATTEMPTS. */
async function firestoreIncrement(
  env: Env,
  token: string,
  path: string,
  field: string,
  amount: number
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: firestoreUrl(env, path),
            fieldTransforms: [
              { fieldPath: field, increment: { integerValue: String(amount) } },
            ],
          },
        },
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Firebase Auth (Identity Toolkit) — public REST endpoints, same ones the
// client SDK calls under the hood. Only need the Web API key (already public
// in firebase_options.dart), no service-account privileges required.
// ---------------------------------------------------------------------------

async function emailIsRegistered(env: Env, email: string): Promise<boolean> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, continueUri: "https://example.com" }),
    }
  );
  if (!res.ok) throw new ApiError("Backend auth error. Please try again.", 500);
  const data = (await res.json()) as { registered?: boolean };
  return data.registered === true;
}

async function createFirebaseUser(env: Env, email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = (await res.json()) as { localId?: string; error?: { message?: string } };
  if (!res.ok || !data.localId) {
    const code = data.error?.message ?? "";
    if (code.includes("EMAIL_EXISTS")) {
      throw new ApiError("An account with this email already exists.", 409);
    }
    throw new ApiError("Could not create account. Please try again.", 500);
  }
  return data.localId;
}

// ---------------------------------------------------------------------------
// EmailJS — sends from the Worker so the Private Key never ships in the APK.
// ---------------------------------------------------------------------------

async function sendVerificationEmail(env: Env, email: string, code: string): Promise<void> {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY, // proves this is a trusted (non-browser) sender
      template_params: {
        to_email: email,
        passcode: code,
        expires_in: `${CODE_TTL_MINUTES} minutes`,
      },
    }),
  });
  if (!res.ok) {
    throw new ApiError("Failed to send verification email. Please try again.", 500);
  }
}

// ---------------------------------------------------------------------------
// Endpoint handlers
// ---------------------------------------------------------------------------

/**
 * POST /request-code  { email }
 * Validates the email, refuses if an account already exists, rate-limits
 * resends, generates the 6-digit code, stores only its salted hash in
 * Firestore (never the plaintext code), and emails the plaintext code to
 * the user via EmailJS. The client only ever learns "ok: true".
 */
async function handleRequestCode(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string };
  const email = normalizeEmail(body.email);

  if (await emailIsRegistered(env, email)) {
    throw new ApiError(
      "An account with this email already exists. Try signing in instead.",
      409
    );
  }

  const token = await getGoogleAccessToken(env);
  const path = `emailVerifications/${encodeURIComponent(email)}`;
  const existing = await firestoreGet(env, token, path);

  const now = Date.now();
  let sendCount = 0;
  let windowStart = now;

  if (existing) {
    const lastSentAt = existing.lastSentAt as number | null;
    if (lastSentAt) {
      const secondsSinceLast = (now - lastSentAt) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        throw new ApiError(
          `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code.`,
          429
        );
      }
    }
    const existingWindowStart = existing.windowStart as number | null;
    if (existingWindowStart && now - existingWindowStart < SEND_WINDOW_MINUTES * 60_000) {
      windowStart = existingWindowStart;
      sendCount = (existing.sendCount as number) ?? 0;
      if (sendCount >= MAX_SENDS_PER_WINDOW) {
        throw new ApiError("Too many code requests. Please try again later.", 429);
      }
    }
  }

  const code = randomCode();
  const salt = randomHex(16);
  const codeHash = await sha256Hex(`${salt}:${code}`);

  await firestoreWrite(
    env,
    token,
    path,
    {
      email,
      codeHash,
      salt,
      expiresAt: new Date(now + CODE_TTL_MINUTES * 60_000),
      attempts: 0,
      verified: false,
      verifiedAt: null,
      lastSentAt: new Date(now),
      windowStart: new Date(windowStart),
      sendCount: sendCount + 1,
    },
    false // full overwrite — this is a fresh verification attempt
  );

  await sendVerificationEmail(env, email, code);

  return json({ ok: true });
}

/**
 * POST /confirm-code  { email, code }
 * The security-critical comparison happens here, server-side, against the
 * salted hash stored in Firestore — the client's guess is the only thing
 * that ever leaves the device, never the stored hash or salt.
 */
async function handleConfirmCode(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string; code?: string };
  const email = normalizeEmail(body.email);
  const code = String(body.code ?? "").trim();
  if (!CODE_RE.test(code)) {
    throw new ApiError("Enter the 6-digit code from your email.", 400);
  }

  const token = await getGoogleAccessToken(env);
  const path = `emailVerifications/${encodeURIComponent(email)}`;
  const doc = await firestoreGet(env, token, path);
  if (!doc) {
    throw new ApiError(
      "No verification in progress for this email. Request a new code.",
      404
    );
  }
  if (doc.verified === true) return json({ ok: true }); // idempotent

  const expiresAt = doc.expiresAt as number | null;
  if (!expiresAt || Date.now() > expiresAt) {
    throw new ApiError("This code has expired. Request a new one.", 410);
  }

  const attempts = (doc.attempts as number) ?? 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new ApiError("Too many incorrect attempts. Request a new code.", 429);
  }

  const expectedHash = await sha256Hex(`${doc.salt}:${code}`);
  const matches = safeEqual(expectedHash, doc.codeHash as string);

  if (!matches) {
    // Atomic increment so this can't be raced past the attempt limit.
    await firestoreIncrement(env, token, path, "attempts", 1);
    throw new ApiError("Incorrect code. Please try again.", 400);
  }

  await firestoreWrite(
    env,
    token,
    path,
    { verified: true, verifiedAt: new Date(), attempts: 0 },
    true
  );
  return json({ ok: true });
}

/**
 * POST /complete-registration  { email, password }
 * Only creates the Firebase Auth account if this Worker's own Firestore
 * record shows `verified === true` (set exclusively by handleConfirmCode
 * above) and that verification happened within the last
 * VERIFIED_GRACE_MINUTES. A client that never called /confirm-code — or
 * whose confirm-code call failed — cannot reach this branch, because the
 * check below reads server-side state the client cannot forge (it has no
 * Firestore write access to this collection at all; see firestore.rules).
 */
async function handleCompleteRegistration(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");
  if (password.length < 6) {
    throw new ApiError("Password must be at least 6 characters.", 400);
  }

  const token = await getGoogleAccessToken(env);
  const path = `emailVerifications/${encodeURIComponent(email)}`;
  const doc = await firestoreGet(env, token, path);
  if (!doc) throw new ApiError("Please verify your email first.", 412);

  const verifiedAt = doc.verifiedAt as number | null;
  const stillFresh = verifiedAt && Date.now() - verifiedAt < VERIFIED_GRACE_MINUTES * 60_000;
  if (doc.verified !== true || !stillFresh) {
    throw new ApiError("Email verification expired. Please verify your email again.", 412);
  }

  const uid = await createFirebaseUser(env, email, password);

  await firestoreWrite(env, token, `users/${uid}`, { email, role: "resident" }, false);
  await firestoreDelete(env, token, path);

  // No token/session is returned — the Flutter client signs in itself with
  // the same email/password right after this call succeeds.
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return errorJson("Method not allowed.", 405);
    }

    const { pathname } = new URL(req.url);
    try {
      switch (pathname) {
        case "/request-code":
          return await handleRequestCode(req, env);
        case "/confirm-code":
          return await handleConfirmCode(req, env);
        case "/complete-registration":
          return await handleCompleteRegistration(req, env);
        default:
          return errorJson("Not found.", 404);
      }
    } catch (err) {
      if (err instanceof ApiError) return errorJson(err.message, err.status);
      console.error(err);
      return errorJson("Unexpected server error.", 500);
    }
  },
};
