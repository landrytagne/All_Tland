import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Adjust this value in production, or use tracesSampler for more granular control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture 10% of sessions in production for performance monitoring
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,

  // If you want to enable Replay, uncomment:
  // integrations: [Sentry.replayIntegration()],

  // Don't send personally identifiable information
  sendDefaultPii: false,

  // Ignore errors from browser extensions and common non-actionable errors
  ignoreErrors: [
    "Extension context invalidated",
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    "hydrat", // hydration mismatch noise
    "cz-shortcut-listen", // browser extension
  ],

  // Don't track requests to our own API
  allowUrls: process.env.NODE_ENV === "production"
    ? [/retrouvit\.com/, /vercel\.app/]
    : [/localhost/],
});
