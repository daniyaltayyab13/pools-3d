"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
/**
 * Server entry point.
 *
 * This file only starts the HTTP server.
 * App configuration lives in app.ts.
 */
const app = (0, app_1.createApp)();
app.listen(env_1.env.PORT, () => {
    console.log(`✅ Pools 3D server running on http://localhost:${env_1.env.PORT}`);
});
