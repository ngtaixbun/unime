import { createApp } from "./app.js";
import { createDaxController } from "./controllers/dax.controller.js";
import { createHealthController } from "./controllers/health.controller.js";
import { EnvironmentValidationError, getEnv } from "./config/env.js";
import { createFabricAuthClient } from "./clients/fabric-auth.client.js";
import { PowerBiHttpClient } from "./clients/powerbi.client.js";
import { DaxResponseTransformer } from "./services/response-transformer.service.js";
import { PowerBiQueryService } from "./services/powerbi-query.service.js";

try {
  const env = getEnv();
  const authClient = createFabricAuthClient(env);
  const powerBiClient = new PowerBiHttpClient(env);
  const executor = new PowerBiQueryService(env, authClient, powerBiClient);
  const transformer = new DaxResponseTransformer();
  const app = createApp(env, {
    dax: createDaxController(env, executor, transformer),
    health: createHealthController(executor),
  });
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.info(JSON.stringify({
      level: "info",
      event: "server_started",
      host: "0.0.0.0",
      port: env.PORT,
    }));
  });

  const shutdown = (signal: string): void => {
    console.info(JSON.stringify({ level: "info", event: "server_stopping", signal }));
    server.close((error) => process.exit(error ? 1 : 0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(`Backend environment is invalid: ${error.fields.join(", ")}`);
  } else {
    console.error("Backend startup failed.");
  }
  process.exit(1);
}
