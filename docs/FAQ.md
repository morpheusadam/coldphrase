# FAQ

**Is my seed phrase ever sent anywhere?**
No. Encryption and decryption happen entirely in the browser, in memory. The builder blocks
all network egress via CSP, and the viewer uses `default-src 'none'`. You can (and should)
run it with the machine offline.

**What if I forget the password?**
It is gone. There is no recovery, no backdoor, no reset. This is by design — a recoverable
encryption of a seed phrase would be worthless. Use the generator and store the passphrase
safely (e.g. a second, separate medium).

**Why does unlocking take a few seconds?**
That delay is Argon2id doing 256 MiB of memory-hard work. It is trivial for you (once) and
ruinous for an attacker (billions of times). Do not "optimize" it away.

**Can I use a 24-word phrase / a private key / arbitrary text?**
Yes. Pick 12/15/18/21/24 words in the grid, or switch to *free text* for a raw private key or
any secret. The viewer auto-formats word-count phrases into the numbered grid; anything else
shows as text.

**Two people know it opened a decoy — is that safe?**
Deniability here is *structural*, not cryptographic. It fools an unsophisticated coercer, not
a forensic analyst who reads the file (which visibly contains two volumes). Fund the decoy and
read [DENIABILITY.md](DENIABILITY.md) before relying on it.

**Will the same password work on my phone / another OS?**
Yes — the password is Unicode-NFKC-normalized before hashing, so different keyboards/OSes
produce identical bytes. Avoid exotic combining characters just in case.

**Why is `Documents/` a bad place to keep the file?**
On Windows it is frequently OneDrive-synced, which copies your offline-attack target to a
third-party server. Keep vaults on offline media (USB/optical) outside any synced folder.

**How do I know the file wasn't tampered with?**
The builder prints a whole-file SHA-256 when it creates `wallet-secret.html`. Record it off
the machine and re-check before each use. The published app itself is verifiable against
[`dist/SHA256SUMS.txt`](../dist/SHA256SUMS.txt). The in-file runtime check catches library
tampering but cannot stop a fully-replaced file — hence the out-of-band hash.

**Is the strength meter trustworthy?**
Treat it as a conservative *hint*. It penalizes patterns but can still over-rate a clever weak
password. Only the generator's ~78 bits is a guarantee.

**Does it work in every browser?**
Any modern browser with WebCrypto and WebAssembly (Chrome, Edge, Firefox, Safari, Brave). No
network, no extensions needed — ideally none installed.

**Can I audit it?**
Yes — that's the point. All source is in `src/`, the crypto is in one DOM-free file
(`src/js/crypto.js`), and `npm test` proves the build embeds exactly the vendored bytes.
