import { headers } from "next/headers";

// Public base URL for links that leave the browser (QR labels).
// NEXT_PUBLIC_APP_URL wins (set it on Vercel); otherwise use the host of the current request.
export async function appBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function isLocalUrl(url: string) {
  return /\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.)/.test(url);
}
