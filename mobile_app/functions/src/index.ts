import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import emailjs from "@emailjs/nodejs";

admin.initializeApp();
const db = admin.firestore();

const EMAILJS_PRIVATE_KEY = defineSecret("EMAILJS_PRIVATE_KEY");
const EMAILJS_PUBLIC_KEY = defineString("EMAILJS_PUBLIC_KEY");
const EMAILJS_SERVICE_ID = defineString("EMAILJS_SERVICE_ID");
const EMAILJS_TEMPLATE_ID = defineString("EMAILJS_TEMPLATE_ID");

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 60;
const VERIFIED_GRACE_MINUTES = 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  }
  return email;
}

function generateCode(): string {
  // 6-digit numeric code, zero-padded, using a CSPRNG.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(CODE_LENGTH, "0");
}

function hashCode(code: string, salt: string): string {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function verificationDoc(email: string) {
  return db.collection("emailVerifications").doc(email);
}

/**
 * Step 1: client asks for a code to be emailed to the given address.
 */
export const requestVerificationCode = onCall(
  { secrets: [EMAILJS_PRIVATE_KEY] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);

    // Refuse if an account already exists for this email.
    try {
      await admin.auth().getUserByEmail(email);
      throw new HttpsError(
        "already-exists",
        "An account with this email already exists. Try signing in instead."
      );
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      // auth/user-not-found is the expected path — fall through.
    }

    const ref = verificationDoc(email);
    const snap = await ref.get();
    const now = admin.firestore.Timestamp.now();

    let sendCount = 0;
    let windowStart = now;
    if (snap.exists) {
      const data = snap.data()!;
      const lastSentAt: FirebaseFirestore.Timestamp | undefined = data.lastSentAt;
      if (lastSentAt) {
        const secondsSinceLast = now.seconds - lastSentAt.seconds;
        if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
          throw new HttpsError(
            "resource-exhausted",
            `Please wait ${RESEND_COOLDOWN_SECONDS - secondsSinceLast}s before requesting another code.`
          );
        }
      }
      const existingWindowStart: FirebaseFirestore.Timestamp | undefined = data.windowStart;
      if (
        existingWindowStart &&
        now.seconds - existingWindowStart.seconds < SEND_WINDOW_MINUTES * 60
      ) {
        windowStart = existingWindowStart;
        sendCount = data.sendCount ?? 0;
        if (sendCount >= MAX_SENDS_PER_WINDOW) {
          throw new HttpsError(
            "resource-exhausted",
            "Too many code requests. Please try again later."
          );
        }
      }
    }

    const code = generateCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + CODE_TTL_MINUTES * 60 * 1000
    );

    await ref.set({
      email,
      codeHash: hashCode(code, salt),
      salt,
      expiresAt,
      attempts: 0,
      verified: false,
      verifiedAt: null,
      lastSentAt: now,
      windowStart,
      sendCount: sendCount + 1,
    });

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID.value(),
        EMAILJS_TEMPLATE_ID.value(),
        {
          to_email: email,
          passcode: code,
          expires_in: `${CODE_TTL_MINUTES} minutes`,
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY.value(),
          privateKey: EMAILJS_PRIVATE_KEY.value(),
        }
      );
    } catch (err) {
      logger.error("EmailJS send failed", err);
      throw new HttpsError("internal", "Failed to send verification email. Please try again.");
    }

    return { ok: true };
  }
);

/**
 * Step 2: client submits the code they received by email.
 */
export const confirmVerificationCode = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email);
  const code = String(request.data?.code ?? "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Enter the 6-digit code from your email.");
  }

  const ref = verificationDoc(email);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError(
      "not-found",
      "No verification in progress for this email. Request a new code."
    );
  }

  const data = snap.data()!;
  if (data.verified === true) {
    return { ok: true };
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt: FirebaseFirestore.Timestamp = data.expiresAt;
  if (!expiresAt || now.toMillis() > expiresAt.toMillis()) {
    throw new HttpsError("deadline-exceeded", "This code has expired. Request a new one.");
  }

  const attempts: number = data.attempts ?? 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many incorrect attempts. Request a new code."
    );
  }

  const expectedHash = hashCode(code, data.salt);
  const actualBuf = Buffer.from(expectedHash, "hex");
  const givenBuf = Buffer.from(data.codeHash, "hex");
  const matches =
    actualBuf.length === givenBuf.length && crypto.timingSafeEqual(actualBuf, givenBuf);

  if (!matches) {
    await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new HttpsError("invalid-argument", "Incorrect code. Please try again.");
  }

  await ref.update({ verified: true, verifiedAt: now, attempts: 0 });
  return { ok: true };
});

/**
 * Step 3: client sets a password once the email is verified. Account
 * creation only happens here, gated server-side on `verified === true`,
 * so the client can never skip straight to creating an account.
 */
export const completeRegistration = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email);
  const password = String(request.data?.password ?? "");

  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  const ref = verificationDoc(email);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Please verify your email first.");
  }

  const data = snap.data()!;
  const now = admin.firestore.Timestamp.now();
  const verifiedAt: FirebaseFirestore.Timestamp | null = data.verifiedAt ?? null;
  const stillFresh =
    verifiedAt && now.toMillis() - verifiedAt.toMillis() < VERIFIED_GRACE_MINUTES * 60 * 1000;

  if (data.verified !== true || !stillFresh) {
    throw new HttpsError(
      "failed-precondition",
      "Email verification expired. Please verify your email again."
    );
  }

  let uid: string;
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    logger.error("createUser failed", err);
    throw new HttpsError("internal", "Could not create account. Please try again.");
  }

  await db.collection("users").doc(uid).set({
    email,
    role: "resident",
  });

  await ref.delete();

  const customToken = await admin.auth().createCustomToken(uid);
  return { customToken };
});
