import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, purgeExpiredEntries } from '../rate-limiter';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.advanceTimersByTime(10 * 60 * 1000);
    purgeExpiredEntries();
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    const result = checkRateLimit('test-key-1', { maxRequests: 5, windowMs: 300_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('allows up to maxRequests within the window', () => {
    const key = 'test-key-2';
    const opts = { maxRequests: 5, windowMs: 300_000 };
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, opts).allowed).toBe(true);
    }
  });

  it('blocks the (maxRequests + 1)th request', () => {
    const key = 'test-key-3';
    const opts = { maxRequests: 5, windowMs: 300_000 };
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, opts);
    }
    const result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('includes a resetAt timestamp in the future', () => {
    const now = Date.now();
    const result = checkRateLimit('test-key-4', { maxRequests: 5, windowMs: 300_000 });
    expect(result.resetAt).toBeGreaterThan(now);
  });

  it('resets the counter after the window expires', () => {
    const key = 'test-key-5';
    const opts = { maxRequests: 5, windowMs: 300_000 };
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, opts);
    }
    expect(checkRateLimit(key, opts).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(300_001);

    const result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks different keys independently', () => {
    const opts = { maxRequests: 2, windowMs: 300_000 };
    // Exhaust key-a
    checkRateLimit('key-a', opts);
    checkRateLimit('key-a', opts);
    expect(checkRateLimit('key-a', opts).allowed).toBe(false);

    // key-b should still be free
    expect(checkRateLimit('key-b', opts).allowed).toBe(true);
  });
});

describe('purgeExpiredEntries', () => {
  it('removes entries whose window has elapsed', () => {
    vi.useFakeTimers();
    const opts = { maxRequests: 1, windowMs: 1_000 };
    checkRateLimit('purge-key', opts);

    vi.advanceTimersByTime(2_000);
    purgeExpiredEntries();

    // After purge the counter resets, so the next request is allowed again
    const result = checkRateLimit('purge-key', opts);
    expect(result.allowed).toBe(true);

    vi.useRealTimers();
  });
});
