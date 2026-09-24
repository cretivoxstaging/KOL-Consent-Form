/**
 * Reversible, obfuscated, URL-safe hash for numeric IDs.
 * Protects sequential template IDs from being guessed or tampered with.
 */

const SALT = "cretivox_kol_consent_salt_v1_2026";
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE = ALPHABET.length; // 62

// Permutation keys coprime to 2^32
const MULTIPLIER = 0x45d9f3b; // 73244475
const INVERSE = 0x119de1f3;    // modular inverse mod 2^32
const OFFSET = 0x27d4eb2d;     // additive constant
const XOR_KEY = 0x5a3c9e7b;    // secret XOR mask

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function numToBase62(num: number): string {
  let res = "";
  let n = num >>> 0;
  do {
    res = ALPHABET[n % BASE] + res;
    n = Math.floor(n / BASE);
  } while (n > 0);
  return res;
}

function base62ToNum(str: string): number | null {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = ALPHABET.indexOf(str[i]);
    if (idx === -1) return null;
    n = n * BASE + idx;
    if (n > 0xffffffff) return null;
  }
  return n >>> 0;
}

/**
 * Encodes a numeric template ID into an obfuscated hash string with checksum.
 * Example: 16 -> "0kd1OfPK"
 */
export function encodeHashId(id: number | string): string {
  const numId = typeof id === "number" ? id : parseInt(String(id), 10);
  if (isNaN(numId) || numId <= 0) return String(id);

  // Reversible affine permutation
  const x = (numId ^ XOR_KEY) >>> 0;
  const obf = (Math.imul(x, MULTIPLIER) + OFFSET) >>> 0;

  // 2-character base62 checksum
  const checkVal = fnv1a(`${numId}:${SALT}`) % (BASE * BASE);
  const c1 = ALPHABET[Math.floor(checkVal / BASE)];
  const c2 = ALPHABET[checkVal % BASE];

  const obfStr = numToBase62(obf);
  return `${c1}${c2}${obfStr}`;
}

/**
 * Decodes an obfuscated hash string back to its original integer ID.
 * Returns null if the hash is invalid, tampered, or a raw numeric ID.
 * Enforces strict hash-only access (raw numeric IDs like '16' are rejected by default).
 */
export function decodeHashId(
  hash: string | number | null | undefined,
  allowNumericFallback = false
): number | null {
  if (hash === null || hash === undefined) return null;
  const str = String(hash).trim();
  if (!str) return null;

  // Strict check: reject pure numeric IDs so form cannot be accessed directly by numeric ID
  if (/^\d+$/.test(str)) {
    if (!allowNumericFallback) return null;
    const n = parseInt(str, 10);
    return n > 0 ? n : null;
  }

  // Must have at least 2 check chars + 1 obf char
  if (str.length < 3) return null;

  const checkChars = str.substring(0, 2);
  const obfStr = str.substring(2);

  const obf = base62ToNum(obfStr);
  if (obf === null) return null;

  // Reverse permutation
  const x = Math.imul((obf - OFFSET) >>> 0, INVERSE) >>> 0;
  const originalId = (x ^ XOR_KEY) >>> 0;

  if (originalId <= 0 || originalId > 10000000) return null;

  // Verify checksum
  const expectedCheckVal = fnv1a(`${originalId}:${SALT}`) % (BASE * BASE);
  const expectedC1 = ALPHABET[Math.floor(expectedCheckVal / BASE)];
  const expectedC2 = ALPHABET[expectedCheckVal % BASE];

  if (checkChars !== `${expectedC1}${expectedC2}`) {
    return null; // Tampered or invalid!
  }

  return originalId;
}
