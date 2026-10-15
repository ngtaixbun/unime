import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface ClientRateLimitOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly resolveClientId: (request: Request) => string;
  readonly now?: () => number;
  readonly maxTrackedClients?: number;
}

interface ClientWindow {
  count: number;
  resetAt: number;
}

/**
 * Process-local, fixed-window protection. A shared gateway or store is required
 * to enforce one aggregate limit across multiple service instances.
 */
export function createClientRateLimitMiddleware(options: ClientRateLimitOptions): RequestHandler {
  if (!Number.isInteger(options.windowMs) || options.windowMs <= 0) {
    throw new TypeError("windowMs must be a positive integer.");
  }
  if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new TypeError("maxRequests must be a positive integer.");
  }
  const maxTrackedClients = options.maxTrackedClients ?? 10_000;
  if (!Number.isInteger(maxTrackedClients) || maxTrackedClients <= 0) {
    throw new TypeError("maxTrackedClients must be a positive integer.");
  }

  const now = options.now ?? Date.now;
  const windows = new Map<string, ClientWindow>();

  const prune = (time: number): void => {
    for (const [clientId, window] of windows) {
      if (window.resetAt <= time) windows.delete(clientId);
    }
  };

  return (request: Request, response: Response, next: NextFunction): void => {
    const time = now();
    let clientId: string;
    try {
      clientId = options.resolveClientId(request);
    } catch (error) {
      next(error);
      return;
    }
    if (!clientId) {
      next(new TypeError("Authenticated client ID is required for rate limiting."));
      return;
    }

    let window = windows.get(clientId);
    if (!window || window.resetAt <= time) {
      if (!window && windows.size >= maxTrackedClients) prune(time);
      if (!window && windows.size >= maxTrackedClients) {
        request.safeErrorCategory = "SEMANTIC_BUSY";
        response.setHeader("retry-after", "1");
        response.status(503).json({
          apiVersion: "1",
          requestId: request.requestId,
          error: { code: "SEMANTIC_BUSY", message: "The service is temporarily busy." },
        });
        return;
      }
      window = { count: 0, resetAt: time + options.windowMs };
      windows.set(clientId, window);
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - time) / 1_000));
    response.setHeader("ratelimit-limit", String(options.maxRequests));
    response.setHeader("ratelimit-remaining", String(Math.max(0, options.maxRequests - window.count - 1)));
    response.setHeader("ratelimit-reset", String(retryAfterSeconds));
    if (window.count >= options.maxRequests) {
      request.safeErrorCategory = "RATE_LIMITED";
      response.setHeader("retry-after", String(retryAfterSeconds));
      response.status(429).json({
        apiVersion: "1",
        requestId: request.requestId,
        error: { code: "RATE_LIMITED", message: "The application request rate limit was exceeded." },
      });
      return;
    }

    window.count += 1;
    next();
  };
}
