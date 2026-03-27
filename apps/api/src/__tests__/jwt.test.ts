/**
 * Unit tests for jwt.ts — verifies that signAccessToken embeds
 * the correct claims, including the required email claim.
 */

// Set required env before importing jwt module
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';

import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt';
import { decodeJwt } from 'jose';

describe('signAccessToken', () => {
  it('includes sub claim', async () => {
    const token = await signAccessToken('user-abc', 'user@example.com');
    const payload = decodeJwt(token);
    expect(payload.sub).toBe('user-abc');
  });

  it('includes email claim', async () => {
    const token = await signAccessToken('user-abc', 'user@example.com');
    const payload = decodeJwt(token);
    expect(payload.email).toBe('user@example.com');
  });

  it('expires in approximately 15 minutes', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signAccessToken('user-xyz', 'xyz@example.com');
    const payload = decodeJwt(token);

    expect(payload.exp).toBeDefined();
    const exp = payload.exp as number;
    // Allow 5 second window for test execution
    expect(exp).toBeGreaterThanOrEqual(before + 14 * 60 + 55);
    expect(exp).toBeLessThanOrEqual(before + 15 * 60 + 5);
  });

  it('can be verified with verifyToken', async () => {
    const token = await signAccessToken('user-verify', 'verify@example.com');
    const result = await verifyToken(token);
    expect(result.sub).toBe('user-verify');
  });
});

describe('signRefreshToken', () => {
  it('includes sub claim', async () => {
    const token = await signRefreshToken('user-refresh');
    const payload = decodeJwt(token);
    expect(payload.sub).toBe('user-refresh');
  });

  it('does not include email claim', async () => {
    const token = await signRefreshToken('user-refresh');
    const payload = decodeJwt(token);
    // Refresh token intentionally omits email — client must use access token for email
    expect(payload.email).toBeUndefined();
  });

  it('expires in approximately 7 days', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signRefreshToken('user-refresh');
    const payload = decodeJwt(token);

    expect(payload.exp).toBeDefined();
    const exp = payload.exp as number;
    const sevenDaysSeconds = 7 * 24 * 60 * 60;
    // Allow 5 second window
    expect(exp).toBeGreaterThanOrEqual(before + sevenDaysSeconds - 5);
    expect(exp).toBeLessThanOrEqual(before + sevenDaysSeconds + 5);
  });
});

describe('verifyToken', () => {
  it('throws for invalid token', async () => {
    await expect(verifyToken('not.a.valid.token')).rejects.toThrow();
  });

  it('throws for empty string', async () => {
    await expect(verifyToken('')).rejects.toThrow();
  });
});
