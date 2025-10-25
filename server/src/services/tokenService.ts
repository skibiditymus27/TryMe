import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateDisplayToken(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let token = '';
  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % ALPHABET.length;
    token += ALPHABET[index];
  }
  return token;
}

export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
