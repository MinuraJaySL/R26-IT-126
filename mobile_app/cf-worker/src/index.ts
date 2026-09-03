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
 * Six endpoints: three mirroring the three-step Flutter sign-up flow, one
 * for admin-driven driver account creation, one for sending push
 * notifications (this app has no Cloud Functions, so there's no database
 * trigger — the client explicitly asks for a push at the moment a
 * notification-worthy event happens), and one for IoT bin devices:
 *   POST /request-code          — step 1: email in, verification code emailed out
 *   POST /confirm-code          — step 2: code in, verified flag set server-side
 *   POST /complete-registration — step 3: password in, Firebase Auth account created
 *                                 (gated on step 2 having actually succeeded)
 *   POST /admin/create-driver   — admin-only: creates a driver account server-side
 *                                 (gated on the caller's Firestore role being 'admin',
 *                                 checked after verifying their Firebase ID token)
 *   POST /notify                — sends a push for one of 5 known events; the client
 *                                 supplies only an event name + doc id, never the
 *                                 notification text (see handleNotify for why)
 *   POST /bin-status             — an ESP32 bin device reports critical/normal fill
 *                                 or gas status; authenticated with a shared device
 *                                 secret (not a Firebase ID token — devices have no
 *                                 Firebase Auth identity of their own)
 *   POST /admin/run-announcements — admin-only manual trigger for the same
 *                                 next-day-collection send the cron below runs;
 *                                 lets you test/demo it without waiting for the
 *                                 actual scheduled fire
 *
 * Also exports `scheduled` — a Cron Trigger (see wrangler.toml [triggers]) that
 * runs once daily and pushes a notification to every resident in a ward with
 * an un-sent, due CollectionAnnouncement (see the Flutter app's
 * AnnounceCollectionScreen). Residents see the announcement in-app the moment
 * a driver posts it (plain Firestore read, no Worker involved) — this cron is
 * only the *fixed-time push* on top of that, so a driver posting early in the
 * day doesn't spam residents immediately.
 */

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_WEB_API_KEY: string;
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;
  EMAILJS_PUBLIC_KEY: string;
  EMAILJS_DRIVER_TEMPLATE_ID: string;
  // Secrets — set with `wrangler secret put <NAME>`, never committed.
  FIREBASE_SERVICE_ACCOUNT_KEY: string;
  EMAILJS_PRIVATE_KEY: string;
  BIN_DEVICE_SECRET: string;
}

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 60;
const VERIFIED_GRACE_MINUTES = 15;

// The per-email limit above (MAX_SENDS_PER_WINDOW) does nothing against an
// attacker who simply never reuses the same email twice — this endpoint is
// unauthenticated by design (it's step 1 of signup), so nothing else stops
// a script from blasting many different emails to burn through the EmailJS
// send quota or harass strangers with unsolicited codes. This caps it by
// source IP instead, independent of which email each call uses. Generous
// enough that a household sharing one IP, or several people behind one
// mobile carrier's NAT, won't hit it during normal signup.
const IP_RATE_LIMIT_MAX = 20;
const IP_RATE_LIMIT_WINDOW_MINUTES = 60;

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

/** Picks a uniformly random character from `alphabet` via rejection sampling. */
function randomChar(alphabet: string): string {
  const max = Math.floor(256 / alphabet.length) * alphabet.length;
  let n: number;
  do {
    n = crypto.getRandomValues(new Uint8Array(1))[0];
  } while (n >= max);
  return alphabet[n % alphabet.length];
}

/** 16-char temporary password with at least one lower/upper/digit/symbol. */
function generateTempPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz"; // no l/o — avoid look-alikes
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O
  const digits = "23456789"; // no 0/1
  const symbols = "!@#$%^&*-_+=";
  const all = lower + upper + digits + symbols;

  const required = [randomChar(lower), randomChar(upper), randomChar(digits), randomChar(symbols)];
  const rest = Array.from({ length: 12 }, () => randomChar(all));
  const chars = [...required, ...rest];

  // Fisher-Yates shuffle so the required chars aren't always in the same spot.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
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
    // datastore — Firestore REST calls above. firebase.messaging — sending
    // pushes via FCM's HTTP v1 API (see sendPushNotification / /notify).
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
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
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

function toFields(obj: Record<string, string | number | boolean | Date | null>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) fields[key] = { nullValue: null };
    else if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") {
      // Firestore's integerValue must be a whole number — every prior use of
      // this helper only ever wrote counts (always whole), so this split
      // wasn't needed until bin coordinates (lat/lng, genuinely fractional)
      // started going through it.
      fields[key] = Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    } else if (typeof value === "boolean") fields[key] = { booleanValue: value };
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
    else if ("doubleValue" in v) obj[key] = v.doubleValue;
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

/**
 * Single-field equality query via Firestore's :runQuery REST endpoint.
 * Deliberately limited to one equality filter — the Flutter side avoids
 * composite indexes throughout this app (see firestore_service.dart's
 * fetchLatestDeniedRequest comment) by filtering/sorting the rest
 * client-side instead; this mirrors that same choice on the Worker side so
 * nothing here depends on an index existing in the Firebase console.
 */
async function firestoreQueryEquals(
  env: Env,
  token: string,
  collectionId: string,
  field: string,
  value: FirestoreValue
): Promise<{ id: string; fields: Record<string, string | number | boolean | null> }[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value,
          },
        },
      },
    }),
  });
  if (!res.ok) throw new ApiError("Backend storage error. Please try again.", 500);
  const rows = (await res.json()) as {
    document?: { name: string; fields?: Record<string, FirestoreValue> };
  }[];
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: r.document!.name.split("/").pop()!,
      fields: fromFields(r.document!.fields),
    }));
}

// ---------------------------------------------------------------------------
// Firebase ID token verification — lets this Worker trust "I am uid X"
// claims from the Flutter app without the Admin SDK. Firebase ID tokens are
// standard RS256 JWTs signed by Google; we fetch Google's public keys (JWK
// format) and verify the signature + standard claims ourselves, exactly as
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
// describes for non-Admin-SDK verification. Only used to authenticate the
// *caller* of /admin/create-driver — never trust a client-supplied uid
// without doing this first.
// ---------------------------------------------------------------------------

const GOOGLE_JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let cachedJwks: { keys: JsonWebKey[]; expiresAt: number } | null = null;

async function getGoogleIdentityJwks(): Promise<JsonWebKey[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.keys;

  const res = await fetch(GOOGLE_JWK_URL);
  if (!res.ok) throw new ApiError("Could not verify session. Please try again.", 500);
  const data = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };

  // Respect the endpoint's own Cache-Control max-age when present; fall back
  // to 1 hour, matching Google's typical rotation cadence.
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  cachedJwks = { keys: data.keys, expiresAt: Date.now() + maxAgeSeconds * 1000 };
  return cachedJwks.keys;
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(input: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(input));
}

/**
 * Verifies a Firebase ID token per Google's documented rules (signature,
 * `exp`, `iat`, `aud`, `iss`, non-empty `sub`) and returns the caller's uid.
 * Throws ApiError(401) on any failure — expired, malformed, wrong project,
 * bad signature, etc. This is the only thing standing between an untrusted
 * client claim and treating a request as coming from a specific Firebase user.
 */
async function verifyFirebaseIdToken(env: Env, idToken: string): Promise<string> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new ApiError("Invalid session. Please sign in again.", 401);
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    user_id?: string;
  };
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch {
    throw new ApiError("Invalid session. Please sign in again.", 401);
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new ApiError("Invalid session. Please sign in again.", 401);
  }

  const keys = await getGoogleIdentityJwks();
  const jwk = keys.find((k: any) => k.kid === header.kid) as JsonWebKey | undefined;
  if (!jwk) throw new ApiError("Invalid session. Please sign in again.", 401);

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecodeToBytes(signatureB64);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signedData
  );
  if (!valid) throw new ApiError("Invalid session. Please sign in again.", 401);

  const nowSec = Math.floor(Date.now() / 1000);
  const uid = payload.sub || payload.user_id;
  if (
    !uid ||
    payload.aud !== env.FIREBASE_PROJECT_ID ||
    payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` ||
    !payload.exp ||
    !payload.iat ||
    nowSec >= payload.exp ||
    nowSec < payload.iat - 60
  ) {
    throw new ApiError("Invalid session. Please sign in again.", 401);
  }

  return uid;
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

/**
 * Sends a newly-created driver their temporary password. Uses a separate
 * EmailJS template (EMAILJS_DRIVER_TEMPLATE_ID) from the OTP one — see the
 * template setup instructions given alongside this change.
 */
async function sendDriverCredentialsEmail(
  env: Env,
  email: string,
  driverName: string,
  tempPassword: string
): Promise<void> {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_DRIVER_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email,
        driver_name: driverName,
        temp_password: tempPassword,
      },
    }),
  });
  if (!res.ok) {
    throw new ApiError(
      "Driver account was created, but the welcome email failed to send. " +
        "Ask the driver to use 'Forgot password' on the login screen.",
      502
    );
  }
}

// ---------------------------------------------------------------------------
// IP-based rate limiting for /request-code — see IP_RATE_LIMIT_MAX above for
// why the per-email limit alone isn't real protection. Same windowed-counter
// shape as the per-email logic in handleRequestCode, just keyed by IP in its
// own collection. Firestore rules lock this collection to `false` for every
// client the same way emailVerifications is — only this Worker's
// service-account token (which bypasses rules entirely) ever touches it.
// ---------------------------------------------------------------------------

async function checkIpRateLimit(env: Env, token: string, ip: string): Promise<void> {
  const path = `rateLimits/${encodeURIComponent(ip)}`;
  const existing = await firestoreGet(env, token, path);
  const now = Date.now();

  let windowStart = now;
  let count = 0;

  if (existing) {
    const existingWindowStart = existing.windowStart as number | null;
    if (existingWindowStart && now - existingWindowStart < IP_RATE_LIMIT_WINDOW_MINUTES * 60_000) {
      windowStart = existingWindowStart;
      count = (existing.count as number) ?? 0;
      if (count >= IP_RATE_LIMIT_MAX) {
        throw new ApiError("Too many requests from this network. Please try again later.", 429);
      }
    }
  }

  await firestoreWrite(
    env,
    token,
    path,
    { windowStart: new Date(windowStart), count: count + 1 },
    false // full overwrite — same reasoning as the per-email window below
  );
}

// ---------------------------------------------------------------------------
// Push notifications (FCM HTTP v1) — this app has no Cloud Functions, so
// there is no "watch Firestore and react" trigger. The client explicitly
// asks for a push at the moment something notification-worthy happens (see
// /notify below); this just does the actual send once the caller supplies a
// device token.
// ---------------------------------------------------------------------------

async function sendPushNotification(
  env: Env,
  token: string,
  fcmToken: string,
  title: string,
  body: string
): Promise<void> {
  const url = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { token: fcmToken, notification: { title, body } },
    }),
  });
  if (!res.ok) {
    // A stale/invalid device token (uninstalled app, revoked permission) is
    // an expected, routine failure mode here — log it, but don't throw. The
    // caller already completed their real action (resolving a report,
    // marking arrived, etc); the push is a best-effort bonus on top, not the
    // point of the request.
    console.error("FCM send failed:", await res.text().catch(() => res.statusText));
  }
}

/**
 * Writes a persistent in-app notification record — always alongside an FCM
 * push, never instead of one. This is what powers the resident's
 * Notifications inbox / unread badge: a push can be missed (permission
 * denied, device offline, no token on file), but this record survives
 * regardless, so the resident still sees it next time they open the app.
 */
async function writeNotification(
  env: Env,
  token: string,
  userId: string,
  title: string,
  body: string,
  type: string,
  relatedId: string
): Promise<void> {
  const id = crypto.randomUUID();
  await firestoreWrite(
    env,
    token,
    `notifications/${id}`,
    { userId, title, body, type, relatedId, createdAt: new Date(), read: false },
    false
  );
}

// ---------------------------------------------------------------------------
// Endpoint handlers
// ---------------------------------------------------------------------------

/**
 * POST /request-code  { email }
 * IP-rate-limited first (see checkIpRateLimit — the per-email limit below
 * alone is not real abuse protection, since nothing stops a script from
 * simply never reusing an email). Then validates the email, refuses if an
 * account already exists, rate-limits resends, generates the 6-digit code,
 * stores only its salted hash in Firestore (never the plaintext code), and
 * emails the plaintext code to the user via EmailJS. The client only ever
 * learns "ok: true".
 */
async function handleRequestCode(req: Request, env: Env): Promise<Response> {
  const token = await getGoogleAccessToken(env);
  const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
  await checkIpRateLimit(env, token, ip);

  const body = (await req.json()) as { email?: string };
  const email = normalizeEmail(body.email);

  if (await emailIsRegistered(env, email)) {
    throw new ApiError(
      "An account with this email already exists. Try signing in instead.",
      409
    );
  }

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

/**
 * POST /admin/create-driver  { idToken, driverName, driverEmail, driverPhone, vehicleNumber }
 * Admin-only. Verifies the caller's Firebase ID token, confirms their own
 * users/{uid} Firestore doc has role == 'admin', then creates a Firebase
 * Auth account for the driver with a random temporary password, writes
 * their profile doc, and emails them the password. The password is never
 * returned to the caller — if the email fails to send, this returns an
 * error rather than silently leaving the admin without a way to relay it.
 */
async function handleCreateDriver(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as {
    idToken?: string;
    driverName?: string;
    driverEmail?: string;
    driverPhone?: string;
    vehicleNumber?: string;
  };

  if (typeof body.idToken !== "string" || !body.idToken) {
    throw new ApiError("Missing session token.", 401);
  }
  const driverName = String(body.driverName ?? "").trim();
  const driverPhone = String(body.driverPhone ?? "").trim();
  const vehicleNumber = String(body.vehicleNumber ?? "").trim();
  const driverEmail = normalizeEmail(body.driverEmail);
  if (!driverName) throw new ApiError("Driver name is required.", 400);
  if (!driverPhone) throw new ApiError("Driver phone is required.", 400);
  if (!vehicleNumber) throw new ApiError("Vehicle number is required.", 400);

  const callerUid = await verifyFirebaseIdToken(env, body.idToken);

  const token = await getGoogleAccessToken(env);
  const callerDoc = await firestoreGet(env, token, `users/${callerUid}`);
  if (!callerDoc || callerDoc.role !== "admin") {
    throw new ApiError("You do not have permission to perform this action.", 403);
  }

  if (await emailIsRegistered(env, driverEmail)) {
    throw new ApiError("An account with this email already exists.", 409);
  }

  const tempPassword = generateTempPassword();
  const newUid = await createFirebaseUser(env, driverEmail, tempPassword);

  await firestoreWrite(
    env,
    token,
    `users/${newUid}`,
    {
      email: driverEmail,
      name: driverName,
      phone: driverPhone,
      vehicleNumber,
      role: "driver",
      createdBy: callerUid,
      createdAt: new Date(),
    },
    false
  );

  // If this throws, the account+doc already exist but the admin has no way
  // to hand the driver their password — surfaced as an error, not swallowed.
  await sendDriverCredentialsEmail(env, driverEmail, driverName, tempPassword);

  return json({ ok: true });
}

/**
 * POST /notify  { idToken, event, id }
 * Records + pushes a notification for one of five real, in-app events. The
 * client supplies only an event name and a Firestore document id — never
 * the notification text — and this Worker re-derives the target user and
 * the message itself by reading the real document. That's deliberate: if
 * the client could supply arbitrary title/body text, any signed-in user
 * could use this endpoint to push arbitrary spam to any other user.
 * Requiring a valid idToken only confirms "a real signed-in app user
 * triggered this" — it does not otherwise restrict who can trigger which
 * event, matching the trust level already extended elsewhere in this app
 * (e.g. any driver can already resolve any bin report directly via
 * firestore.rules).
 *
 * The in-app notification record (writeNotification) is written
 * unconditionally once a target user is known; the FCM push after it is
 * best-effort on top — a resident with no device token, or whose push
 * fails, still sees the record in their in-app inbox either way.
 */
async function handleNotify(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { idToken?: string; event?: string; id?: string };
  if (typeof body.idToken !== "string" || !body.idToken) {
    throw new ApiError("Missing session token.", 401);
  }
  await verifyFirebaseIdToken(env, body.idToken); // must be a real signed-in user

  const id = String(body.id ?? "").trim();
  if (!id) throw new ApiError("Missing document id.", 400);

  const token = await getGoogleAccessToken(env);
  let targetUid: string | null = null;
  let title = "";
  let messageBody = "";

  switch (body.event) {
    case "arrived": {
      const doc = await firestoreGet(env, token, `pickupRequests/${id}`);
      if (!doc) throw new ApiError("Request not found.", 404);
      targetUid = doc.residentId as string;
      title = "Truck has arrived!";
      messageBody =
        "The garbage truck has arrived at your pickup point. Please bring your waste out now.";
      break;
    }
    case "collected": {
      const doc = await firestoreGet(env, token, `pickupRequests/${id}`);
      if (!doc) throw new ApiError("Request not found.", 404);
      // Null when the doc predates arrivedByDriverId, or arrival was never
      // GPS/manually recorded for this request — nothing to notify then.
      targetUid = (doc.arrivedByDriverId as string | null) ?? null;
      title = "Pickup confirmed";
      messageBody = "The resident confirmed handover — this pickup is complete.";
      break;
    }
    case "reportResolved": {
      const doc = await firestoreGet(env, token, `binReports/${id}`);
      if (!doc) throw new ApiError("Report not found.", 404);
      targetUid = doc.residentId as string;
      title = "Your report was resolved";
      messageBody =
        (doc.resolutionNote as string | null) || "A driver has resolved the issue you reported.";
      break;
    }
    case "recoveryResolved": {
      const doc = await firestoreGet(env, token, `accountRecoveryRequests/${id}`);
      if (!doc) throw new ApiError("Recovery request not found.", 404);
      targetUid = doc.uid as string;
      const reenabled = doc.reenabled === true;
      title = reenabled ? "Your account has been re-enabled" : "Update on your account request";
      messageBody =
        (doc.resolutionNote as string | null) ||
        (reenabled ? "You can now sign in again." : "Your request was reviewed.");
      break;
    }
    case "autoResolved": {
      const doc = await firestoreGet(env, token, `pickupRequests/${id}`);
      if (!doc) throw new ApiError("Request not found.", 404);
      targetUid = doc.residentId as string;
      const expired = doc.status === "expired";
      title = expired ? "Pickup request expired" : "Pickup request closed";
      messageBody = expired
        ? "No truck arrived within your selected time window."
        : "There was no response within 15 minutes, so this request was automatically closed.";
      break;
    }
    default:
      throw new ApiError("Unknown notification event.", 400);
  }

  if (!targetUid) return json({ ok: true, skipped: true });

  await writeNotification(env, token, targetUid, title, messageBody, body.event!, id);

  const userDoc = await firestoreGet(env, token, `users/${targetUid}`);
  const fcmToken = userDoc?.fcmToken as string | undefined;
  if (fcmToken) {
    await sendPushNotification(env, token, fcmToken, title, messageBody);
  }
  return json({ ok: true });
}

/**
 * POST /bin-status  { deviceId, status, lat, lng }
 * Header: X-Device-Secret
 * Called by IoT bin devices (ESP32), not the Flutter app — reports a
 * fill-level/gas-sensor critical state. Authenticated with a single shared
 * secret rather than a Firebase ID token, since devices have no Firebase
 * Auth identity of their own.
 *
 * Only ever-critical bins are stored: the bins/{deviceId} doc is created
 * the moment a device first reports critical, stamped with criticalSince
 * so the app can show how long it's been waiting — a repeat "critical"
 * report is a no-op, deliberately, so it never resets that timer. The doc
 * is deleted the instant the device reports normal again. This is a
 * safety net alongside the driver's own "Mark Collected" action in the
 * app — whichever happens first clears the bin from the map.
 */
async function handleBinStatus(req: Request, env: Env): Promise<Response> {
  const deviceSecret = req.headers.get("X-Device-Secret") ?? "";
  if (!env.BIN_DEVICE_SECRET || !safeEqual(deviceSecret, env.BIN_DEVICE_SECRET)) {
    throw new ApiError("Unauthorized.", 401);
  }

  const body = (await req.json()) as {
    deviceId?: string;
    status?: string;
    lat?: number;
    lng?: number;
  };

  const deviceId = String(body.deviceId ?? "").trim();
  if (!deviceId) throw new ApiError("Missing deviceId.", 400);
  if (body.status !== "critical" && body.status !== "normal") {
    throw new ApiError("status must be 'critical' or 'normal'.", 400);
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError("Missing or invalid lat/lng.", 400);
  }

  // Visible in `wrangler tail` regardless of what happens below — the
  // simplest possible confirmation that a device's report actually reached
  // this Worker.
  console.log(`[bin-status] device=${deviceId} status=${body.status} lat=${lat} lng=${lng}`);

  const token = await getGoogleAccessToken(env);
  const path = `bins/${encodeURIComponent(deviceId)}`;
  const existing = await firestoreGet(env, token, path);

  if (body.status === "critical") {
    if (!existing) {
      // priority: 'red' is stamped explicitly — the app's SmartBin model
      // defaults a missing priority field to 'green' (a leftover from the
      // old three-tier system), so leaving it out would silently mis-color
      // every bin this endpoint creates.
      await firestoreWrite(
        env,
        token,
        path,
        { lat, lng, priority: "red", criticalSince: new Date() },
        false
      );
    }
    // Already critical — no-op, so a repeat report doesn't reset the timer.
  } else if (existing) {
    await firestoreDelete(env, token, path);
  }

  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Next-day collection announcements — the fixed-time push on top of the
// in-app banner (see AnnounceCollectionScreen / ResidentDashboard in the
// Flutter app). Colombo has no DST, so a fixed +5:30 offset is safe year-round.
// ---------------------------------------------------------------------------

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight-to-midnight bounds, in real UTC instants, for "today + [daysAhead]
 * days" as a Colombo-local calendar date. */
function colomboDateBounds(daysAhead: number): { startMs: number; endMs: number } {
  const nowColombo = new Date(Date.now() + COLOMBO_OFFSET_MS);
  const y = nowColombo.getUTCFullYear();
  const m = nowColombo.getUTCMonth();
  const d = nowColombo.getUTCDate() + daysAhead;
  const startMs = Date.UTC(y, m, d) - COLOMBO_OFFSET_MS;
  const endMs = Date.UTC(y, m, d + 1) - COLOMBO_OFFSET_MS;
  return { startMs, endMs };
}

/**
 * Finds every un-sent CollectionAnnouncement whose collectionDate is
 * tomorrow (Colombo-local), pushes a notification to every resident whose
 * `ward` matches, and marks each as sent. Shared by the cron trigger below
 * and the manual /admin/run-announcements endpoint, so both run identical
 * logic — the admin endpoint exists purely so this can be tested/demoed
 * without waiting for the real scheduled fire.
 */
async function sendDueAnnouncements(env: Env): Promise<{ processed: number; notified: number }> {
  const token = await getGoogleAccessToken(env);
  const { startMs, endMs } = colomboDateBounds(1); // tomorrow

  const unsent = await firestoreQueryEquals(env, token, "collectionAnnouncements", "sent", {
    booleanValue: false,
  });

  let processed = 0;
  let notified = 0;

  for (const row of unsent) {
    const collectionDateMs = row.fields.collectionDate as number | null;
    if (!collectionDateMs || collectionDateMs < startMs || collectionDateMs >= endMs) {
      continue; // not due yet (or already past — left for the driver to notice)
    }
    processed++;

    const ward = row.fields.ward as string;
    const note = (row.fields.note as string) || "";
    const title = "Collection Tomorrow";
    const body = note
      ? `Truck coming to ${ward} tomorrow. ${note}`
      : `Truck coming to ${ward} tomorrow.`;

    const residents = await firestoreQueryEquals(env, token, "users", "ward", {
      stringValue: ward,
    });
    for (const resident of residents) {
      await writeNotification(env, token, resident.id, title, body, "announcement", row.id);
      const fcmToken = resident.fields.fcmToken as string | undefined;
      if (fcmToken) {
        await sendPushNotification(env, token, fcmToken, title, body);
      }
      notified++;
    }

    await firestoreWrite(env, token, `collectionAnnouncements/${row.id}`, { sent: true }, true);
  }

  return { processed, notified };
}

/**
 * POST /admin/run-announcements  { idToken }
 * Admin-only. Runs sendDueAnnouncements() immediately instead of waiting
 * for the cron trigger — for testing and live demos.
 */
async function handleRunAnnouncements(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { idToken?: string };
  if (typeof body.idToken !== "string" || !body.idToken) {
    throw new ApiError("Missing session token.", 401);
  }
  const callerUid = await verifyFirebaseIdToken(env, body.idToken);

  const token = await getGoogleAccessToken(env);
  const callerDoc = await firestoreGet(env, token, `users/${callerUid}`);
  if (!callerDoc || callerDoc.role !== "admin") {
    throw new ApiError("You do not have permission to perform this action.", 403);
  }

  const result = await sendDueAnnouncements(env);
  return json({ ok: true, ...result });
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
        case "/admin/create-driver":
          return await handleCreateDriver(req, env);
        case "/notify":
          return await handleNotify(req, env);
        case "/bin-status":
          return await handleBinStatus(req, env);
        case "/admin/run-announcements":
          return await handleRunAnnouncements(req, env);
        default:
          return errorJson("Not found.", 404);
      }
    } catch (err) {
      if (err instanceof ApiError) return errorJson(err.message, err.status);
      console.error(err);
      return errorJson("Unexpected server error.", 500);
    }
  },

  // Cron Trigger — see wrangler.toml [triggers]. Runs sendDueAnnouncements()
  // once daily at the fixed send time.
  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const result = await sendDueAnnouncements(env);
    console.log(`[scheduled] processed=${result.processed} notified=${result.notified}`);
  },
};
