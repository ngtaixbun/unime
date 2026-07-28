import {
  ConfidentialClientApplication,
} from "@azure/msal-node";

import { env } from "../config/env.js";

const powerBiScope =
  "https://analysis.windows.net/powerbi/api/.default";

const confidentialClient =
  new ConfidentialClientApplication({
    auth: {
      clientId:
        env.POWERBI_CLIENT_ID,

      authority:
        `https://login.microsoftonline.com/${env.POWERBI_TENANT_ID}`,

      clientSecret:
        env.POWERBI_CLIENT_SECRET,
    },
  });

export class PowerBiAuthenticationError
  extends Error {
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name =
      "PowerBiAuthenticationError";
  }
}

export async function acquirePowerBiAccessToken():
Promise<string> {
  try {
    const result =
      await confidentialClient
        .acquireTokenByClientCredential({
          scopes: [powerBiScope],
        });

    if (!result?.accessToken) {
      throw new Error(
        "Microsoft Entra không trả access token.",
      );
    }

    return result.accessToken;
  } catch (error: unknown) {
    throw new PowerBiAuthenticationError(
      "Không thể xác thực Microsoft Entra cho Power BI.",
      error,
    );
  }
}