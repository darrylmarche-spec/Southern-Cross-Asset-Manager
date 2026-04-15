import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth';

describe('hashPassword', () => {
  it('returns a salt:hash string', async () => {
    const result = await hashPassword('mypassword');
    expect(result).toContain(':');
    const parts = result.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0); // salt
    expect(parts[1].length).toBeGreaterThan(0); // hash
  });

  it('produces a different hash each time (salted)', async () => {
    const h1 = await hashPassword('same-password');
    const h2 = await hashPassword('same-password');
    expect(h1).not.toBe(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true when the password matches the stored hash', async () => {
    const stored = await hashPassword('correct-horse');
    const result = await verifyPassword('correct-horse', stored);
    expect(result).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const stored = await hashPassword('correct-horse');
    const result = await verifyPassword('wrong-horse', stored);
    expect(result).toBe(false);
  });

  it('returns false for an empty password against a real hash', async () => {
    const stored = await hashPassword('non-empty');
    const result = await verifyPassword('', stored);
    expect(result).toBe(false);
  });

  it('returns false for a stored value that is not a valid hash (e.g. legacy plaintext)', async () => {
    const result = await verifyPassword('password', 'plaintext-password');
    expect(result).toBe(false);
  });

  it('returns false for an empty stored value', async () => {
    const result = await verifyPassword('anything', '');
    expect(result).toBe(false);
  });
});
