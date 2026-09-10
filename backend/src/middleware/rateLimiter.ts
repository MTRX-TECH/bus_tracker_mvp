import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: {
    success: false,
    error: "Too many network requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 25, // Limit auth endpoints against brute-force
  message: {
    success: false,
    error: "Too many login attempts or authentication failures. Temporary defense lock activated.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
