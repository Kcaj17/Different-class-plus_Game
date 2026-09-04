// =========================================================
// security.js — Security Utilities, Sanitization & Rate Limiting
// =========================================================

const crypto = require('crypto');

/**
 * Sanitizes user input string against XSS and control characters.
 * Trims whitespace and clamps maximum allowed length.
 */
function sanitizeText(input, maxLength = 32) {
  if (typeof input !== 'string') return '';

  // Remove control characters (0x00 - 0x1F, except normal space)
  let clean = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape HTML entities to neutralize any script or HTML injection
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}

/**
 * Cryptographically secure pseudo-random number generator for D20 (1 to 20).
 * Prevents client-side forging of Natural 20s.
 */
function secureRandomD20() {
  return crypto.randomInt(1, 21); // Returns an integer between 1 and 20 inclusive
}

/**
 * Verifies Master Screen Admin PIN using timing-safe comparison.
 */
function verifyAdminPin(providedPin) {
  const masterPin = (process.env.ADMIN_PIN || '2026').trim();
  if (typeof providedPin !== 'string') return false;

  const a = Buffer.from(providedPin.trim());
  const b = Buffer.from(masterPin);

  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Creates an in-memory sliding-window rate limiter for IP or Socket ID.
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Max allowed requests within the time window
 */
function createRateLimiter(windowMs = 60000, maxRequests = 60) {
  const hits = new Map();

  // Periodic cleanup every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs * 2, 60000));

  return function checkRateLimit(key) {
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      hits.set(key, { startTime: now, count: 1 });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: windowMs - (now - record.startTime)
      };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
  };
}

module.exports = {
  sanitizeText,
  secureRandomD20,
  verifyAdminPin,
  createRateLimiter
};
