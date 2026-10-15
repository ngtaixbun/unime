import { ConfidentialClientApplication } from "@azure/msal-node";
import { SemanticError } from "../errors/semantic.error.js";

export const POWER_BI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

export interface FabricAuthConfig {
  readonly TENANT_ID: string;
  readonly CLIENT_ID: string;
  readonly CLIENT_SECRET: string;
}

export interface CredentialClient {
  acquireTokenByClientCredential(request: { readonly scopes: string[] }): Promise<{
    readonly accessToken?: string;
    readonly expiresOn?: Date | null;
  } | null>;
}

export interface FabricAuthClient {
  acquire(): Promise<string>;
}

export class ConfidentialClientFabricAuthClient implements FabricAuthClient {
  private cachedToken?: { readonly token: string; readonly expiresAt: number };
  private inflight: Promise<{
    readonly accessToken?: string;
    readonly expiresOn?: Date | null;
  } | null> | undefined;

  public constructor(private readonly client: CredentialClient) {}

  public async acquire(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt - Date.now() > 60_000) {
      return this.cachedToken.token;
    }

    try {
      const acquisition = this.inflight ??=
        this.client.acquireTokenByClientCredential({ scopes: [POWER_BI_SCOPE] })
          .finally(() => {
            this.inflight = undefined;
          });
      const result = await acquisition;
      if (!result?.accessToken) throw new Error("Microsoft Entra ID returned no access token.");

      this.cachedToken = {
        token: result.accessToken,
        expiresAt: result.expiresOn?.getTime() ?? Date.now() + 300_000,
      };
      return result.accessToken;
    } catch (error) {
      if (error instanceof SemanticError) throw error;
      throw new SemanticError(
        "SEMANTIC_AUTH_FAILED",
        "The semantic service could not authenticate with Microsoft Entra ID.",
        502,
        { cause: error },
      );
    }
  }
}

export function createFabricAuthClient(config: FabricAuthConfig): FabricAuthClient {
  return new ConfidentialClientFabricAuthClient(new ConfidentialClientApplication({
    auth: {
      clientId: config.CLIENT_ID,
      clientSecret: config.CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${config.TENANT_ID}`,
    },
  }));
}
