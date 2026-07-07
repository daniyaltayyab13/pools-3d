import { createApp } from "./app";
import { env } from "./config/env";

/**
 * Server entry point.
 *
 * This file only starts the HTTP server.
 * App configuration lives in app.ts.
 */
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ Pools 3D server running on http://localhost:${env.PORT}`);
});