// Room code alphabet — excludes visually confusable characters (0/O, 1/I/L, B/8)
const ALPHABET = '23456789ACDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;
const PREFIX = 'ttr-';

/** Generate a 6-char human-typable code. Prefix avoids collisions on the public PeerJS broker. */
export function generateRoomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Full PeerJS ID (with prefix) from user-friendly code. */
export function codeToPeerId(code: string): string {
  const clean = code.trim().toUpperCase();
  return clean.startsWith(PREFIX) ? clean : PREFIX + clean;
}

/** User-visible code without prefix. */
export function peerIdToCode(peerId: string): string {
  return peerId.startsWith(PREFIX) ? peerId.slice(PREFIX.length) : peerId;
}

/** Basic format validation for the user-entered 6-char code. */
export function isValidCode(code: string): boolean {
  const clean = code.trim().toUpperCase();
  if (clean.length !== CODE_LENGTH) return false;
  for (const ch of clean) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
