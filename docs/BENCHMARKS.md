# Benchmarks & Brute-Force Economics

All numbers below are order-of-magnitude engineering estimates, stated with their
assumptions. The takeaway is blunt: **with the generated passphrase, the vault is
unbreakable; with a weak human password, it is not — regardless of the cryptography.**

## KDF cost (defender side)

Measured on the reference machine (Node 24, WebCrypto + hash-wasm), Argon2id at
**m = 256 MiB, t = 4, p = 1**:

| Operation | Time |
|---|---|
| One Argon2id derivation | ≈ 2.0 s |
| Encrypt a file (2 volumes) | ≈ 4 s |
| Unlock (derives keys for both volumes, constant-time) | ≈ 4 s |

The ~4 s unlock is deliberate. It is invisible to you (you open a vault rarely) and
catastrophic for an attacker (they must pay it billions of times).

## Attacker throughput (offline)

Argon2id is **memory-hard**: every guess must touch 256 MiB of RAM, so an attacker's
parallelism is bounded by memory *capacity and bandwidth*, not core count. A 24 GB GPU
physically fits ~90 concurrent 256 MiB instances, and bandwidth throttles them further.
Realistic sustained rates:

| Attacker | Assumed rate | Note |
|---|---|---|
| Well-funded (GPU cluster) | **10⁴ guesses/s** | Generous to the attacker for m=256 MiB. |
| Nation-state (large farm) | **10⁶ guesses/s** | Optimistic upper bound; memory bandwidth makes this hard to sustain. |

## Time to break, by password entropy

Expected time = `2^(H−1) / rate`. Age of the universe ≈ 1.38 × 10¹⁰ years, shown for scale.

| Entropy `H` | Example | @ 10⁴/s | @ 10⁶/s |
|---:|---|---|---|
| 28 bits | weak human password (`Ali@1370`) | ~4 hours | ~2 minutes |
| 40 bits | 8 random lowercase+digits | ~1.7 years | ~6 days |
| 50 bits | decent manual password | ~1 780 years | ~18 years |
| 60 bits | strong manual password | ~1.8 million years | ~18 300 years |
| **66 bits** | 6 random BIP39 words | ~117 million years | ~1.2 million years |
| **78 bits** | **ColdPhrase generator (6 × EFF)** | ~480 billion years | ~4.8 billion years |

At 78 bits, even the nation-state rate needs ~**0.3× the age of the universe** — and that
assumes an unrealistically high sustained rate against a 256 MiB memory-hard function. At the
realistic 10⁴/s it is ~**35× the age of the universe**.

## Why the cipher itself is never attacked

AES-256 has a 2²⁵⁶ keyspace. By the Landauer limit, merely *counting* through 2²⁵⁶ states
would consume more energy than the Sun outputs over billions of years. No attacker touches
the cipher; they attack the password. That is why password entropy is the only number that
matters — and why the generator exists.

## The weak-password cliff

Human-chosen passwords rarely exceed ~30 bits of *effective* entropy because attackers use
dictionaries and rule-based mangling (`P@ssw0rd123`, keyboard walks, dates). A 28-bit
effective password falls in hours even behind Argon2id. **This is the single reason to use the
generator.** The strength meter in the UI is a conservative heuristic and deliberately
over-penalizes patterns, but it can still *over*-estimate a clever-looking weak password —
treat every meter number as an optimistic ceiling, and trust only the generator's exact
~78 bits.

## Artifact size

| Item | Size |
|---|---|
| Built `dist/coldphrase.html` | ≈ 171 KB |
| Argon2 WASM library (raw / base64) | 29 KB / 39 KB |
| BIP39 wordlist | 2048 words |
| EFF wordlist | 7776 words |
| Generated `wallet-secret.html` | ≈ 60 KB (library + two small ciphertexts) |
