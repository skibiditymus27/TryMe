import crypto from 'node:crypto';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateDisplayToken(length = 8) {
    const bytes = crypto.randomBytes(length);
    let token = '';
    for (let i = 0; i < length; i += 1) {
        const index = bytes[i] % ALPHABET.length;
        token += ALPHABET[index];
    }
    return token;
}
export function generateSessionSecret() {
    return crypto.randomBytes(32).toString('hex');
}
