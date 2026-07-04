# Threat Model

This document states plainly what ColdPhrase defends against, what it does **not**, and the
operational mitigations for the gaps that code cannot close.

## Assets

- **Primary:** the recovery phrase / private key inside the vault.
- **Secondary:** the fact that a *second* secret exists (duress deniability).

## Adversaries & outcomes

| Adversary | Capability | Outcome |
|---|---|---|
| **Thief of the file** | Has `wallet-secret.html`, unlimited offline compute. | Must brute-force your password through Argon2id (256 MiB/guess). Strong password → infeasible. **Weak password → broken.** This is the whole game. |
| **Tamperer / supply-chain** | Substitutes a backdoored library or file. | Runtime SHA-256 check catches library tampering; whole-file hash (published) catches a replaced file — **if you verify out of band.** A file you never verified offers no such guarantee. |
| **Network eavesdropper / exfiltration script** | Wants the secret sent somewhere. | Viewer CSP is `default-src 'none'` — no fetch/XHR/WebSocket/beacon/image/form/prefetch. Nothing leaves the page. |
| **Coercer (rubber-hose)** | Physically forces you to unlock. | Duress password reveals a decoy. **Structural only** — see [DENIABILITY.md](DENIABILITY.md). |
| **Compromised endpoint** | Keylogger, malicious extension, screen capture, memory scrape. | **Not defended.** Any of these bypass all cryptography. See mitigations below. |

## What the cryptography guarantees

- **Confidentiality:** AES-256-GCM under a key no one can derive without the password.
- **Integrity/authenticity:** GCM tag + parameters-as-AAD; any bit flip or parameter edit is
  rejected.
- **Brute-force resistance:** Argon2id memory-hardness multiplies the attacker's per-guess
  cost by ~256 MiB of RAM traffic. See [BENCHMARKS.md](BENCHMARKS.md).

The only realistic attack against the cryptography is **guessing your password**. Everything
else in this project exists to make that the *only* option — and the generator exists to make
that option hopeless.

## What code cannot fix — and how to mitigate

These are real residual risks. ColdPhrase does what it can (CSP, clipboard auto-wipe, masked
output, `textContent`-only rendering) but the following require **operational** discipline:

1. **Endpoint compromise (highest residual risk).** A browser extension is *not* subject to
   the page's CSP and can read the password field and revealed secret; malware can log keys or
   scrape memory. **Mitigation:** open the vault on a clean, offline machine — ideally a live
   OS booted from read-only media (e.g. Tails) with no extensions — and shut it down after.
2. **Cloud sync leakage.** `Documents/` on Windows is often OneDrive-synced; the file (an
   offline-attack target) is then copied to a third-party server. **Mitigation:** store vaults
   only on offline media (USB, optical) outside any synced folder.
3. **Weak or reused password.** The single point of failure. **Mitigation:** use the built-in
   generator (~78 bits). Never reuse a password from anywhere else.
4. **Unverified file.** The runtime check cannot stop a fully-replaced HTML. **Mitigation:**
   record the whole-file SHA-256 shown at build time, off the machine, and re-check before
   each use.
5. **Decoy that isn't believable.** An empty decoy wallet fails under real coercion.
   **Mitigation:** fund it and give it history.
6. **Shoulder-surfing / cameras.** Output is masked (blurred) until you click; reveal only
   when unobserved, and use *Hide* immediately after.

## Out of scope

Physical extraction of RAM during use, compromised CPU/firmware, malicious browser builds,
and coercion by an adversary who understands the tool's format are outside what any
single-file web app can address. For high-value holdings, combine ColdPhrase with hardware
wallets and geographically-split Shamir backups.
