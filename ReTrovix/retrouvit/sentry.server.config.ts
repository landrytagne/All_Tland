import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || "development",

  // Server-side traces sample rate
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  sendDefaultPii: false,

  // Ignore common server noise
  ignoreErrors: [
    "ECONNRESET",
    "ECONNREFUSED",
    "Socket hang up",
    "ENOTFOUND",
  ],
});
