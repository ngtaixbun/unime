import { app } from "./app.js";
import { env } from "./config/env.js";

const server =
  app.listen(
    env.PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Unime backend is running at http://localhost:${env.PORT}`,
      );
    },
  );

function shutdown(
  signal: string,
): void {
  console.log(
    `Received ${signal}. Closing server.`,
  );

  server.close((error) => {
    if (error) {
      console.error(
        "Server shutdown failed.",
        error,
      );

      process.exit(1);
    }

    process.exit(0);
  });
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT"),
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM"),
);