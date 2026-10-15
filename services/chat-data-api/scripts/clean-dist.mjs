import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
await rm(resolve(serviceRoot, "dist"), { recursive: true, force: true });
