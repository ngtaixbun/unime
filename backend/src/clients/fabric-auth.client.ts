import { ConfidentialClientApplication } from "@azure/msal-node";
import type { GatewayEnv } from "../config/env.js";
import { GatewayError } from "../types/dax.js";

export const POWER_BI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

export interface CredentialClient {
  acquireTokenByClientCredential(request: { scopes: string[] }): Promise<{
    accessToken?: string;
    expiresOn?: Date | null;
  } | null>;
}

export interface FabricAuthClient {
  acquire(): Promise<string>;
}

export class ConfidentialClientFabricAuthClient implements FabricAuthClient {
  private cachedToken?: { readonly token: string; readonly expiresAt: number };
  private inflight: Promise<{ accessToken?: string; expiresOn?: Date | null } | null> | undefined;

  public constructor(private readonly client: CredentialClient) {}

  public async acquire(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt - Date.now() > 60_000) {
      return this.cachedToken.token;
    }

    try {
      const acquisition = this.inflight ??=
        this.client.acquireTokenByClientCredential({ scopes: [POWER_BI_SCOPE] })
          .finally(() => { this.inflight = undefined; });
      const result = await acquisition;
      if (!result?.accessToken) throw new Error("No access token returned.");
      this.cachedToken = {
        token: result.accessToken,
        expiresAt: result.expiresOn?.getTime() ?? Date.now() + 300_000,
      };
      return result.accessToken;
    } catch (error) {
      throw new GatewayError(
        "AZURE_AD_AUTH_FAILED",
        "The gateway could not authenticate with Microsoft Entra ID.",
        502,
        undefined,
        {
          cause: error,
          details: {
            source: "entra",
            failure: "client_credentials",
            causeName: error instanceof Error ? error.name : typeof error,
            causeMessage: error instanceof Error ? error.message.slice(0, 1_000) : String(error).slice(0, 1_000),
          },
        },
      );
    }
  }
}

export function createFabricAuthClient(env: GatewayEnv): FabricAuthClient {
  return new ConfidentialClientFabricAuthClient(new ConfidentialClientApplication({
    auth: {
      clientId: env.CLIENT_ID,
      clientSecret: env.CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${env.TENANT_ID}`,
    },
  }));
}
