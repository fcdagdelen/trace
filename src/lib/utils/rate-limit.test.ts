import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('rate-limit', () => {
  let checkRateLimit: typeof import('./rate-limit').checkRateLimit;
  let rateLimitHeaders: typeof import('./rate-limit').rateLimitHeaders;
  let rateLimitResponse: typeof import('./rate-limit').rateLimitResponse;
  let RATE_LIMITS: typeof import('./rate-limit').RATE_LIMITS;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const module = await import('./rate-limit');
    checkRateLimit = module.checkRateLimit;
    rateLimitHeaders = module.rateLimitHeaders;
    rateLimitResponse = module.rateLimitResponse;
    RATE_LIMITS = module.RATE_LIMITS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have trace limit of 10 tokens', () => {
      expect(RATE_LIMITS.trace.maxTokens).toBe(10);
    });

    it('should have analyze limit of 20 tokens', () => {
      expect(RATE_LIMITS.analyze.maxTokens).toBe(20);
    });

    it('should have api limit of 60 tokens', () => {
      expect(RATE_LIMITS.api.maxTokens).toBe(60);
    });

    it('should have correct refill rates', () => {
      expect(RATE_LIMITS.trace.refillRate).toBeCloseTo(10 / 60, 2);
      expect(RATE_LIMITS.analyze.refillRate).toBeCloseTo(20 / 60, 2);
      expect(RATE_LIMITS.api.refillRate).toBe(1);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request with full bucket', () => {
      const result = checkRateLimit('trace', 'user-123');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should deplete bucket on consecutive requests', () => {
      // Use all 10 tokens
      for (let i = 0; i < 10; i++) {
        checkRateLimit('trace', 'user-456');
      }
      // Next request should be denied
      const result = checkRateLimit('trace', 'user-456');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different users separately', () => {
      // Deplete user-A's bucket
      for (let i = 0; i < 10; i++) {
        checkRateLimit('trace', 'user-A');
      }

      // user-B should still have full bucket
      const result = checkRateLimit('trace', 'user-B');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track different rate limit types separately', () => {
      // Deplete trace limit for user
      for (let i = 0; i < 10; i++) {
        checkRateLimit('trace', 'user-X');
      }

      // analyze limit should still be full
      const result = checkRateLimit('analyze', 'user-X');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);
    });

    it('should refill tokens over time', () => {
      // Use up all tokens
      for (let i = 0; i < 10; i++) {
        checkRateLimit('trace', 'user-789');
      }

      // Verify depleted
      let result = checkRateLimit('trace', 'user-789');
      expect(result.allowed).toBe(false);

      // Advance time by 60 seconds (should refill ~1.67 tokens at 10/60 rate)
      vi.advanceTimersByTime(60000);

      result = checkRateLimit('trace', 'user-789');
      expect(result.allowed).toBe(true);
    });

    it('should not exceed maxTokens on refill', () => {
      // Make one request
      checkRateLimit('trace', 'user-refill');

      // Wait a very long time
      vi.advanceTimersByTime(600000); // 10 minutes

      // Make another request - should have refilled to max but not beyond
      const result = checkRateLimit('trace', 'user-refill');
      expect(result.remaining).toBeLessThanOrEqual(9); // maxTokens - 1
    });

    it('should return resetIn time when rate limited', () => {
      // Use all tokens
      for (let i = 0; i < 10; i++) {
        checkRateLimit('trace', 'user-reset');
      }

      const result = checkRateLimit('trace', 'user-reset');
      expect(result.allowed).toBe(false);
      expect(result.resetIn).toBeGreaterThan(0);
    });

    it('should handle api rate limit correctly', () => {
      // Use up all 60 api tokens
      for (let i = 0; i < 60; i++) {
        checkRateLimit('api', 'api-user');
      }

      const result = checkRateLimit('api', 'api-user');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('rateLimitHeaders', () => {
    it('should return correct headers for trace limit', () => {
      const result = { remaining: 5, resetIn: 30 };
      const headers = rateLimitHeaders('trace', result);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe('30');
    });

    it('should return correct headers for analyze limit', () => {
      const result = { remaining: 15, resetIn: 10 };
      const headers = rateLimitHeaders('analyze', result);

      expect(headers['X-RateLimit-Limit']).toBe('20');
      expect(headers['X-RateLimit-Remaining']).toBe('15');
      expect(headers['X-RateLimit-Reset']).toBe('10');
    });

    it('should return correct headers for api limit', () => {
      const result = { remaining: 45, resetIn: 5 };
      const headers = rateLimitHeaders('api', result);

      expect(headers['X-RateLimit-Limit']).toBe('60');
      expect(headers['X-RateLimit-Remaining']).toBe('45');
      expect(headers['X-RateLimit-Reset']).toBe('5');
    });
  });

  describe('rateLimitResponse', () => {
    it('should return 429 response', () => {
      const result = { remaining: 0, resetIn: 30 };
      const response = rateLimitResponse('trace', result);

      expect(response.status).toBe(429);
    });

    it('should include Retry-After header', () => {
      const result = { remaining: 0, resetIn: 30 };
      const response = rateLimitResponse('trace', result);

      expect(response.headers.get('Retry-After')).toBe('30');
    });

    it('should include Content-Type header', () => {
      const result = { remaining: 0, resetIn: 30 };
      const response = rateLimitResponse('trace', result);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include rate limit headers', () => {
      const result = { remaining: 0, resetIn: 30 };
      const response = rateLimitResponse('trace', result);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('30');
    });

    it('should include error message in body', async () => {
      const result = { remaining: 0, resetIn: 30 };
      const response = rateLimitResponse('trace', result);
      const body = await response.json();

      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBe(30);
    });
  });
});
