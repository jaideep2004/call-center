import { betterAuth } from "better-auth";
import { PostgresDialect } from "kysely";
import { pool } from "./db";
import { sendEmail, smtpConfigured } from "./email";
import { EMAIL_SUBJECTS, verificationEmail, resetPasswordEmail } from "./email-templates";
export const authConfigurationPresent = Boolean(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL);

// Never sign sessions with a fallback secret. A known public value would let
// anyone forge session cookies — fail fast in production instead.
function resolveAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  return "build-placeholder-not-valid-for-runtime-7d0ee8d4";
}

export const auth = betterAuth({
  database: new PostgresDialect({ pool }),
  secret: resolveAuthSecret(),
  // Chain mirrors getAppBaseUrl (APP_BASE_URL is canonical). The old
  // localhost:3000 default was stale (dev serves :30001) and poisoned
  // production email links whenever BETTER_AUTH_URL was unset.
  baseURL: process.env.BETTER_AUTH_URL
    ?? process.env.APP_BASE_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? "http://localhost:30001",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: smtpConfigured(),
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: EMAIL_SUBJECTS.reset,
          html: resetPasswordEmail(url),
        });
      } catch (err) {
        console.error("Failed to send password reset email:", err);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: EMAIL_SUBJECTS.verify,
          html: verificationEmail(url),
        });
        console.log(`[auth] verification email sent to ${user.email}`);
      } catch (err) {
        console.error(`[auth] failed to send verification email to ${user.email}:`, err);
        throw err;
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "agent",
        input: false,
      },
      phone_number: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
