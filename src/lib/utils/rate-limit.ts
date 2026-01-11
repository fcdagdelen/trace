// Simple in-memory rate limiter using token bucket algorithm
// Used to prevent API abuse

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per second
  windowMs: number;       // Time window for cleanup
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Trace generation: 10 traces per minute per user
  trace: {
    maxTokens: 10,
    refillRate: 10 / 60, // ~0.17 tokens/sec
    windowMs: 60 * 1000,
  },
  // Analysis: 20 requests per minute per user
  analyze: {
    maxTokens: 20,
    refillRate: 20 / 60,
    windowMs: 60 * 1000,
  },
  // General API: 60 requests per minute per user
  api: {
    maxTokens: 60,
    refillRate: 1,
    windowMs: 60 * 1000,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// Store: Map<limitType:identifier, entry>
const store = new Map<string, RateLimitEntry>();

// Cleanup interval
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries that haven't been used in 10 minutes
      if (now - entry.lastRefill > 10 * 60 * 1000) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Check if a request should be rate limited
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  type: RateLimitType,
  identifier: string
): { allowed: boolean; remaining: number; resetIn: number } {
  ensureCleanup();

  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry) {
    // New entry: start with full bucket
    entry = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
    store.set(key, entry);
  } else {
    // Refill tokens based on time passed
    const timePassed = (now - entry.lastRefill) / 1000; // in seconds
    const tokensToAdd = timePassed * config.refillRate;
    entry.tokens = Math.min(config.maxTokens, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }

  // Check if we have tokens
  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(entry.tokens),
      resetIn: Math.ceil((config.maxTokens - entry.tokens) / config.refillRate),
    };
  }

  // Rate limited
  const timeToNextToken = (1 - entry.tokens) / config.refillRate;
  return {
    allowed: false,
    remaining: 0,
    resetIn: Math.ceil(timeToNextToken),
  };
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(
  type: RateLimitType,
  result: { remaining: number; resetIn: number }
): Record<string, string> {
  const config = RATE_LIMITS[type];
  return {
    'X-RateLimit-Limit': config.maxTokens.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitResponse(
  type: RateLimitType,
  result: { remaining: number; resetIn: number }
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': result.resetIn.toString(),
        ...rateLimitHeaders(type, result),
      },
    }
  );
}
