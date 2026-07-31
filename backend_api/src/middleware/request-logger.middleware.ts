import { Request, Response, NextFunction } from "express";

/**
 * Simple request logger — method, path, status, duration.
 * Skips health check to reduce noise.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // Skip logging for health check
    if (req.path === "/") {
        next();
        return;
    }

    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? "WARN" : "INFO";
        console.log(
            `[${level}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`,
        );
    });

    next();
}
