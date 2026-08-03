import type { NextFunction, Request, Response } from "express";
import type { DaxQueryExecutor } from "../types/dax.js";

export interface HealthController {
  status: (request: Request, response: Response) => void;
  semanticModel: (request: Request, response: Response, next: NextFunction) => void;
}

export function createHealthController(executor: DaxQueryExecutor): HealthController {
  const status = (_request: Request, response: Response): void => {
    response.json({
      success: true,
      service: "unime-generic-dax-gateway",
      status: "ok",
    });
  };

  const semanticModel = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await executor.executeQuery({
        dax: 'EVALUATE ROW("gatewayOk", 1)',
        expectedColumns: ["gatewayOk"],
      });
      if (result.rows[0]?.gatewayOk !== 1) {
        throw new Error("Semantic health result is invalid.");
      }
      response.json({ success: true, service: "unime-generic-dax-gateway", status: "ok" });
    } catch (error) {
      next(error);
    }
  };

  return { status, semanticModel };
}
