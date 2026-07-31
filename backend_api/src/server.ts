import "./config/env"; // validates env at startup

import msalClient from "./clients/fabric.client";
import app from "./app";
import { env } from "./config/env";
import { FabricService } from "./services/fabric.service";

async function main() {
    // Pre-warm MSAL token — first request doesn't pay ~700ms cost.
    const fabricService = new FabricService(msalClient);
    await fabricService.initialize();

    app.listen(env.PORT, () => {
        console.log(`🚀 Backend running on http://localhost:${env.PORT}`);
        console.log(`   Environment: ${env.NODE_ENV}`);
    });
}

main().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
});
