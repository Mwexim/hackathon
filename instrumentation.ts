// Runs once when the Next.js server starts: refuse to start in production
// without a proper session secret.
export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (min. 32 characters) in production");
  }
}
