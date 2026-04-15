import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Hash a plaintext password using scrypt.
 * Returns a `salt:hash` string suitable for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

/**
 * Compare a plaintext password against a stored `salt:hash` string.
 * Uses a timing-safe comparison to prevent timing attacks.
 * Returns false immediately if the stored value is not in the expected format
 * (e.g. a legacy plaintext password).
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false; // not a valid hash – reject
  const [salt, hash] = parts;
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, 'hex');
  if (buf.length !== storedBuf.length) return false;
  return timingSafeEqual(buf, storedBuf);
}
