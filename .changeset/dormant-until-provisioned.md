---
"louise-toolkit": minor
"astroidjs": minor
"create-astroid": patch
---

Add the **dormant-until-provisioned** secret convention (#252): a feature whose secrets aren't set up yet should be *off*, not *broken*.

**`louise-toolkit/security` gains `readSecret(source, options?)`** — the mechanism. It returns `null` for every flavour of "not really configured": the binding is absent, the Secrets Store isn't provisioned (a declared-but-unset binding *throws* on `.get()`), the value is empty, or it still holds a placeholder sentinel the caller names. Values are trimmed before the sentinel compare, so whitespace can't smuggle one through. There is no built-in sentinel — the placeholder is the caller's convention, not the package's. `louise-toolkit/auth`'s Turnstile gate, which hand-rolled exactly this read, now sits on it.

**`astroidjs` gains the convention over it**: `ASTROID_SECRET_PLACEHOLDER` (`DUMMY_REPLACE_ME`), `readModuleSecret`, `resolveModuleSecrets`, and `describeModuleStatus`. `resolveModuleSecrets` collapses a module's whole secret set into one `configured` gate plus the list of what's still missing, so a module's `isConfigured()` and its "why not" message come from the same read. Partial provisioning counts as dormant — a half-configured integration fails mid-checkout rather than at boot, which is the failure this exists to prevent. The upshot is that a fresh `npm create astroid` clone builds and runs with zero external accounts, and the scaffold now ships one worked example: Turnstile captcha, seeded with the sentinel secret plus Cloudflare's always-passing test site key, enforcing only once *both* halves are real.

Two type widenings fall out, both `minor` because code that reads these off a `LouiseEnv`/`LouiseAuthEnv` as a binding must now narrow:

- `SESSION_SECRET` is `SecretBinding | string` — `getSessionSecret` reads either shape, so a site picks whichever it provisioned rather than the one Louise happened to name. It also takes an optional `placeholder`, and fails closed on a deployed host when the secret is still one. Without that, a scaffold that seeds placeholders everywhere could reach production signing sessions with a publicly-known constant.
- `TURNSTILE_SECRET` is optional. Captcha was always opt-in; requiring the binding to *declare* it was a type-level lie.

Also adds a vitest suite to `packages/astroid` (it had none), wired into CI and `pnpm test`.
