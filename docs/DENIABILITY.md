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
