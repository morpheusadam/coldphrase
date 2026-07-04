# Deniability & Duress Mode

> **Read this before relying on the decoy.** ColdPhrase's deniability is **structural**, not
> cryptographic. It is designed to satisfy an *unsophisticated* coercer, not a forensic
> analyst who reads the file format.

## What it does

When you enable duress mode you provide a **second password** and a **decoy secret**. The
resulting file has two volumes:

- **Main password** → your real phrase.
- **Duress password** → the decoy you chose.
- **Any other password** → nothing.

Under coercion you hand over the duress password; the attacker sees a real, openable wallet
and (ideally) stops.

## Design choices (and the weaknesses they fix)

An earlier draft used a naive "two wrong attempts → show a random fake phrase" trick. It had
three real flaws, all now fixed:

| Old flaw | Fix in v6 |
|---|---|
| Attempt counter in `localStorage` — reset by incognito, another browser, or editing storage. | **Removed.** Deniability no longer depends on client state; it is a second encrypted volume. |
| Real secret always in volume 0; duress unlock ran 2 KDFs vs 1 — a **timing oracle**. | Volume order is **randomized**, and unlock **always derives keys for both volumes** (constant time). |
| "No-duress" files carried an *un-openable* garbage volume that could *incriminate* the user ("what's the second password?"). | With duress off, the second volume is an innocuous note that opens with the **same** main password — there is never a locked volume you cannot explain. |

## The honest limit

This is **not** a VeraCrypt-style hidden volume. The file format plainly contains
`vols: [ …, … ]` — two ciphertexts. A knowledgeable adversary who inspects the JSON can see
that two volumes exist and may demand a second password. ColdPhrase cannot cryptographically
*prove the absence* of a hidden secret, because the ciphertexts are explicit.

What v6 guarantees is narrower but real:

- The adversary **cannot tell from the file which volume is real** (random order, independent
  salts/keys, identical ciphertext shape).
- The adversary **cannot tell from unlock timing which password you gave** (all keys derived
  every time).
- There is **no self-incriminating locked volume** when you did not configure a decoy.

## Cover mode (Snake-game disguise)

A separate, complementary layer hides the file's *purpose* rather than its *contents*. With
disguise enabled, the file downloads as `snake-game.html` and opens as a fully playable Snake
game. The unlock screen appears only after someone types a **secret word you choose** (any
casing). Implementation:

- Only `SHA-256(lowercased word)` is stored — the word is never written into the file.
- The detector hashes recent keystroke suffixes of several lengths, so neither the word nor its
  length is revealed by the stored hash.
- Movement uses arrow keys only, so the letters you type for the trigger never disturb play.

**Honest scope.** This defeats a *casual* observer who opens the file and sees a game. It is
**not** steganography: the encrypted payload (a base64 Argon2 blob and a JSON of salts/ciphertext)
is still present in the HTML source, so anyone who *reads the source* can tell the file does more
than play Snake. Treat cover mode as "hide the purpose from a shoulder-surfer or a quick
glance," layered on top of — never instead of — a strong password and the duress decoy.

## Operational requirements

Deniability is mostly an *operational* discipline, not a code feature:

1. **Fund the decoy.** An empty decoy wallet betrays itself — a coercer who sees a zero
   balance keeps pushing. Put a small, plausible, *real* amount in it with some history.
2. **Rehearse.** Be able to produce the duress password under stress without hesitating.
3. **Do not explain the tool.** ColdPhrase is open source; its behavior is public. Deniability
   erodes the moment the adversary knows exactly how it works.

If your threat model includes a sophisticated, informed adversary with physical power over
you, treat the decoy as *one delaying layer*, not a guarantee — and prefer geographic/secret
splitting (e.g., Shamir backups held in different jurisdictions) over any single file.
