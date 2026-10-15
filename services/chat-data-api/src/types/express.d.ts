declare global {
  namespace Express {
    interface Request {
      requestId: string;
      requestStartedAt: number;
      auth?: import("../auth/types.js").AuthenticatedApplication;
      auditQuestionId?: string;
      authorizedScope?: "NATIONWIDE";
      safeErrorCategory?: string;
    }
  }
}

export {};
