import type { ApplicationPermission } from "./permissions.js";

export interface AuthenticatedApplication {
  readonly authenticationMode: "local" | "entra";
  readonly applicationId: string;
  readonly permissions: ReadonlySet<ApplicationPermission>;
}

export interface ApplicationTokenVerifier {
  verify(token: string): Promise<AuthenticatedApplication>;
}

export class ApplicationTokenVerificationError extends Error {
  constructor(options?: ErrorOptions) {
    super("Application access token verification failed.", options);
    this.name = "ApplicationTokenVerificationError";
  }
}
