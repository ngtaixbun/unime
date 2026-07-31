import { Request, Response } from "express";

export const healthCheck = (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Rayfin Backend API is running 🚀",
        timestamp: new Date().toISOString(),
    });
};
