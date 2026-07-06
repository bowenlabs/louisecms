// Copyright (c) 2026 BowenLabs. Louise (louisecms) is MIT licensed.

import type { SecretBinding } from "./types";

export type { SecretBinding };

/**
 * Session-signing secret from a Cloudflare Secrets Store binding. On localhost
 * (where the store isn't provisioned) a fixed dev secret keeps the sign-in →
 * session loop workable; any deployed hostname fails closed (re-throws).
 *
 * @param secret     the Secrets Store binding (e.g. `env.SESSION_SECRET`)
 * @param url        the request URL (its hostname decides the dev fallback)
 * @param devSecret  the localhost-only fallback value; override per site
 */
export async function getSessionSecret(
  secret: SecretBinding,
  url: URL,
  devSecret = "louise-dev-secret",
): Promise<string> {
  try {
    return await secret.get();
  } catch (err) {
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return devSecret;
    }
    throw err;
  }
}
