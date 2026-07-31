/**
 * Singleton MSAL ConfidentialClientApplication for Entra ID client_credentials flow.
 *
 * Used by FabricService to acquire tokens for the Power BI REST API.
 * Imported once by the application entrypoint and passed to services via constructor.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";

import { env } from "../config/env";

const msalClient = new ConfidentialClientApplication({
    auth: {
        clientId: env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${env.TENANT_ID}`,
        clientSecret: env.CLIENT_SECRET,
    },
});

export default msalClient;
