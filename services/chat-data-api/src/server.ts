import { createApp } from "./app.js";
import { EnvironmentValidationError, getEnv } from "./config/env.js";
import { createFabricAuthClient } from "./clients/fabric-auth.client.js";
import { PowerBiHttpClient } from "./clients/powerbi.client.js";
import { CoverageStoreService } from "./services/coverage-store.service.js";

try {
  const env = getEnv();
  const semanticQueryService = env.CHAT_SEMANTIC_ENABLED
    ? new CoverageStoreService(
        createFabricAuthClient({
          TENANT_ID: env.CHAT_POWERBI_TENANT_ID!,
          CLIENT_ID: env.CHAT_POWERBI_CLIENT_ID!,
          CLIENT_SECRET: env.CHAT_POWERBI_CLIENT_SECRET!,
        }),
        new PowerBiHttpClient({
          WORKSPACE_ID: env.CHAT_POWERBI_WORKSPACE_ID!,
          SEMANTIC_MODEL_ID: env.CHAT_POWERBI_SEMANTIC_MODEL_ID!,
          POWERBI_TIMEOUT_MS: env.CHAT_POWERBI_TIMEOUT_MS,
          POWERBI_MAX_RESPONSE_BYTES: env.CHAT_POWERBI_MAX_RESPONSE_BYTES,
        }),
        env.CHAT_POWERBI_TIMEOUT_MS,
      )
    : undefined;
  const app = createApp(env, semanticQueryService ? { semanticQueryService } : {});
  const server = app.listen(env.PORT, env.CHAT_HOST, () => {
    console.info(JSON.stringify({ level: "info", event: "server_started", host: env.CHAT_HOST, port: env.PORT }));
  });

  const shutdown = (signal: string): void => {
    console.info(JSON.stringify({ level: "info", event: "server_stopping", signal }));
    server.close((error) => process.exit(error ? 1 : 0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(`Chat Data API environment is invalid: ${error.fields.join(", ")}`);
  } else {
    console.error("Chat Data API startup failed.");
  }
  process.exit(1);
}
